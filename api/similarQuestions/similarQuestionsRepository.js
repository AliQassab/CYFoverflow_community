import db from "../db.js";
import logger from "../utils/logger.js";

/**
 * Get similar questions for a given question
 * @param {number} questionId - Question ID
 * @param {Object} options - Query options
 * @param {number} [options.limit=5] - Maximum number of similar questions
 * @param {string} [options.relationType] - Filter by relation type ('similar', 'duplicate', 'related')
 * @returns {Promise<Array>} Array of similar questions with full question data
 */
export const getSimilarQuestionsDB = async (questionId, options = {}) => {
	const { limit = 5, relationType } = options;

	try {
		let query = `
			SELECT
				sq.id as relation_id,
				sq.relation_type,
				sq.similarity_score,
				sq.created_at as relation_created_at,
				q.id,
				q.title,
				q.slug,
				q.content,
				q.user_id,
				q.status,
				q.is_solved,
				q.answer_count,
				q.view_count,
				q.created_at,
				q.updated_at,
				u.name as author_name
			FROM similar_questions sq
			JOIN questions q ON sq.related_question_id = q.id
			JOIN users u ON q.user_id = u.id
			WHERE sq.question_id = $1
				AND sq.is_active = true
				AND q.deleted_at IS NULL
		`;

		const params = [questionId];

		if (relationType) {
			query += ` AND sq.relation_type = $${params.length + 1}`;
			params.push(relationType);
		}

		query += ` ORDER BY sq.similarity_score DESC NULLS LAST, sq.created_at DESC LIMIT $${params.length + 1}`;
		params.push(limit);

		const result = await db.query(query, params);
		return result.rows;
	} catch (error) {
		logger.error("Error fetching similar questions:", error);
		throw error;
	}
};

/**
 * Create a similar question relationship
 * @param {number} questionId - Original question ID
 * @param {number} relatedQuestionId - Related question ID
 * @param {string} relationType - Type of relation ('similar', 'duplicate', 'related')
 * @param {number} [userId] - User ID who created the relationship (null for algorithmic)
 * @param {number} [similarityScore] - Similarity score (0.0 to 1.0)
 * @returns {Promise<Object>} Created relationship
 */
export const createSimilarQuestionDB = async (
	questionId,
	relatedQuestionId,
	relationType = "similar",
	userId = null,
	similarityScore = null,
) => {
	try {
		// Prevent self-reference
		if (questionId === relatedQuestionId) {
			throw new Error("Question cannot be related to itself");
		}

		const result = await db.query(
			`INSERT INTO similar_questions
				(question_id, related_question_id, relation_type, created_by_user_id, similarity_score)
			 VALUES ($1, $2, $3, $4, $5)
			 ON CONFLICT (question_id, related_question_id, relation_type)
			 DO UPDATE SET
				is_active = true,
				similarity_score = COALESCE(EXCLUDED.similarity_score, similar_questions.similarity_score),
				updated_at = NOW()
			 RETURNING *`,
			[questionId, relatedQuestionId, relationType, userId, similarityScore],
		);

		return result.rows[0];
	} catch (error) {
		logger.error("Error creating similar question relationship:", error);
		throw error;
	}
};

/**
 * Delete/deactivate a similar question relationship
 * @param {number} questionId - Original question ID
 * @param {number} relatedQuestionId - Related question ID
 * @param {string} [relationType] - Optional relation type filter
 * @returns {Promise<boolean>} Success status
 */
export const deleteSimilarQuestionDB = async (
	questionId,
	relatedQuestionId,
	relationType = null,
) => {
	try {
		let query = `
			UPDATE similar_questions
			SET is_active = false, updated_at = NOW()
			WHERE question_id = $1 AND related_question_id = $2
		`;
		const params = [questionId, relatedQuestionId];

		if (relationType) {
			query += ` AND relation_type = $3`;
			params.push(relationType);
		}

		query += ` RETURNING id`;

		const result = await db.query(query, params);
		return result.rows.length > 0;
	} catch (error) {
		logger.error("Error deleting similar question relationship:", error);
		throw error;
	}
};

/**
 * Find potentially similar questions using text similarity
 * Uses PostgreSQL's full-text search capabilities
 * @param {number} questionId - Question ID to find similar questions for
 * @param {string} questionTitle - Question title
 * @param {string} questionContent - Question content
 * @param {number} [limit=5] - Maximum number of results
 * @param {number} [minScore=0.3] - Minimum similarity score threshold
 * @returns {Promise<Array>} Array of potentially similar questions
 */
export const findSimilarQuestionsByTextDB = async (
	questionId,
	questionTitle,
	questionContent,
	limit = 5,
	minScore = 0.03, // Balanced threshold (3%) - filtering logic will catch false positives - ts_rank_cd scores are typically 0.02-0.1 for similar content
) => {
	try {
		// Strip HTML and prepare search text
		const cleanTitle = (questionTitle || "").trim();
		let cleanContent = (questionContent || "")
			.replace(/<[^>]*>/g, " ") // Remove HTML tags
			.replace(/\s+/g, " ") // Normalize whitespace
			.trim();

		// Remove title from content if it appears (at beginning or anywhere) to avoid duplication
		// This handles cases where the content field might include the title multiple times
		if (cleanTitle && cleanContent) {
			const titleLower = cleanTitle.toLowerCase();
			const contentLower = cleanContent.toLowerCase();

			// Remove title if it appears at the beginning
			if (contentLower.startsWith(titleLower)) {
				cleanContent = cleanContent.substring(cleanTitle.length).trim();
			}

			// Remove all other occurrences of the title from content
			// Use a regex to replace the title (case-insensitive) but preserve surrounding text
			const titleEscaped = cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const titleRegex = new RegExp(`\\b${titleEscaped}\\b`, "gi");
			cleanContent = cleanContent.replace(titleRegex, "").trim();

			// Normalize whitespace again after removal
			cleanContent = cleanContent.replace(/\s+/g, " ").trim();
		}

		// Limit content length for performance
		cleanContent = cleanContent.substring(0, 5000);

		if (!cleanTitle && !cleanContent) {
			logger.warn(
				"Cannot search for similar questions - empty title and content",
				{
					questionId,
				},
			);
			return [];
		}

		// Build search text - prioritize title words, then content
		// Weight title higher by including it twice, then add cleaned content
		const searchText =
			cleanContent && cleanContent.length > 0
				? `${cleanTitle} ${cleanTitle} ${cleanContent}`.trim()
				: `${cleanTitle} ${cleanTitle}`.trim();

		logger.debug("Executing text similarity search", {
			questionId,
			titleLength: cleanTitle.length,
			contentLength: cleanContent.length,
			searchTextLength: searchText.length,
			searchTextPreview: searchText.substring(0, 100),
		});

		// Use ts_rank_cd (cover density ranking) which gives better results for longer documents
		// Normalization flag 32 divides by number of unique lexemes for better normalization
		const query = `
			SELECT
				q.id,
				q.title,
				q.slug,
				q.content,
				q.answer_count,
				q.view_count,
				q.created_at,
				u.name as author_name,
				-- Use ts_rank_cd with normalization (1 = divide by document length)
				-- For identical titles, this should give much higher scores (closer to 1.0)
				-- Flag 1 normalizes by document length, giving better scores for similar content
				COALESCE(
					ts_rank_cd(
						q.search_vector,
						plainto_tsquery('english', $1),
						1  -- normalization flag: divide by document length (better for title matching)
					),
					0.0
				) as similarity_score
			FROM questions q
			JOIN users u ON q.user_id = u.id
			WHERE ($2 = -999999 OR q.id != $2)
				AND q.deleted_at IS NULL
				AND q.search_vector IS NOT NULL
				AND q.search_vector @@ plainto_tsquery('english', $1)
			ORDER BY similarity_score DESC
			LIMIT $3
		`;

		// Use -1 as dummy ID if questionId is -1 (for pre-posting search)
		const actualQuestionId = questionId === -1 ? -999999 : questionId;

		let result = await db.query(query, [searchText, actualQuestionId, limit]);

		// If no results, try without the @@ match requirement but with a minimum score threshold
		if (result.rows.length === 0) {
			logger.debug("No results with strict match, trying lenient query");
			const lenientQuery = `
				SELECT
					q.id,
					q.title,
					q.slug,
					q.content,
					q.answer_count,
					q.view_count,
					q.created_at,
					u.name as author_name,
					COALESCE(
						ts_rank_cd(
							q.search_vector,
							plainto_tsquery('english', $1),
							1  -- normalization flag: divide by document length
						),
						0.0
					) as similarity_score
				FROM questions q
				JOIN users u ON q.user_id = u.id
				WHERE ($2 = -999999 OR q.id != $2)
					AND q.deleted_at IS NULL
					AND q.search_vector IS NOT NULL
					-- Only include questions that have at least some match
					AND q.search_vector @@ plainto_tsquery('english', $1)
				ORDER BY similarity_score DESC
				LIMIT $3
			`;

			result = await db.query(lenientQuery, [
				searchText,
				actualQuestionId,
				limit,
			]);
		}

		// Final fallback: if still no results, try without search_vector
		if (result.rows.length === 0) {
			logger.debug(
				"No results with search_vector, trying fallback without search_vector",
			);
			const fallbackQuery = `
				SELECT
					q.id,
					q.title,
					q.slug,
					q.content,
					q.answer_count,
					q.view_count,
					q.created_at,
					u.name as author_name,
					COALESCE(
						ts_rank_cd(
							setweight(to_tsvector('english', COALESCE(q.title, '')), 'A') ||
							setweight(to_tsvector('english', COALESCE(q.content, '')), 'B'),
							plainto_tsquery('english', $1),
							1  -- normalization flag: divide by document length
						),
						0.0
					) as similarity_score
				FROM questions q
				JOIN users u ON q.user_id = u.id
				WHERE ($2 = -999999 OR q.id != $2)
					AND q.deleted_at IS NULL
					-- Only include if there's at least a partial match
					AND (
						setweight(to_tsvector('english', COALESCE(q.title, '')), 'A') ||
						setweight(to_tsvector('english', COALESCE(q.content, '')), 'B')
					) @@ plainto_tsquery('english', $1)
				ORDER BY similarity_score DESC
				LIMIT $3
			`;

			result = await db.query(fallbackQuery, [
				searchText,
				actualQuestionId,
				limit,
			]);
		}

		// Boost scores for identical or very similar titles, then filter
		const searchTitleLower = cleanTitle.toLowerCase().trim();
		const commonWords = new Set([
			"the",
			"a",
			"an",
			"and",
			"or",
			"but",
			"in",
			"on",
			"at",
			"to",
			"for",
			"of",
			"with",
			"by",
			"is",
			"are",
			"was",
			"were",
			"be",
			"been",
			"have",
			"has",
			"had",
			"do",
			"does",
			"did",
			"will",
			"would",
			"could",
			"should",
			"may",
			"might",
			"must",
			"can",
		]);

		const searchWords = searchTitleLower
			.split(/\s+/)
			.filter((w) => w.length > 2 && !commonWords.has(w));

		// First, boost scores for identical or very similar titles
		const boosted = result.rows.map((row) => {
			const rowTitleLower = (row.title || "").toLowerCase().trim();

			// Check for exact title match (case-insensitive)
			if (rowTitleLower === searchTitleLower) {
				// Identical titles should get a very high score (0.95+)
				return {
					...row,
					similarity_score: Math.max(row.similarity_score, 0.95),
					titleMatch: "exact",
				};
			}

			// Calculate title word overlap for near-identical titles
			const rowWords = rowTitleLower
				.split(/\s+/)
				.filter((w) => w.length > 2 && !commonWords.has(w));

			const matchingWords = searchWords.filter((w) => rowWords.includes(w));

			// Calculate similarity in both directions:
			// 1. How much of the search title matches the row title
			// 2. How much of the row title matches the search title
			// Use the higher of the two for better matching
			const searchMatchRatio =
				searchWords.length > 0 ? matchingWords.length / searchWords.length : 0;
			const rowMatchRatio =
				rowWords.length > 0 ? matchingWords.length / rowWords.length : 0;
			const titleSimilarity = Math.max(searchMatchRatio, rowMatchRatio);

			// Boost score for high title similarity
			// Lower threshold to 0.7 (70%) to catch cases like "Hello CYFoverflow team" vs "Hello CYFoverflow team media"
			if (titleSimilarity >= 0.7) {
				// Very similar titles (>70% word overlap) get boosted
				// Use a more aggressive boost for high similarity
				const boost = Math.min(0.4, titleSimilarity * 0.5); // Max boost of 0.4
				return {
					...row,
					similarity_score: Math.min(1.0, row.similarity_score + boost),
					titleMatch: "high",
					titleSimilarity,
				};
			}

			// Also boost for moderate similarity (50-70%) but with smaller boost
			if (titleSimilarity >= 0.5) {
				const boost = Math.min(0.2, titleSimilarity * 0.3);
				return {
					...row,
					similarity_score: Math.min(1.0, row.similarity_score + boost),
					titleMatch: "moderate",
					titleSimilarity,
				};
			}

			return {
				...row,
				titleMatch: "low",
				titleSimilarity,
			};
		});

		// Filter by minimum score and remove duplicates
		// Also filter out questions with very low title similarity (likely false positives)
		const filtered = boosted
			.filter((row) => {
				// Must meet minimum score threshold
				if (row.similarity_score < minScore) {
					return false;
				}

				// Additional filtering: Check title similarity for better accuracy
				// If titles are completely different, require higher content similarity
				// Calculate title word overlap (reuse from boosted calculation)
				const titleSimilarity = row.titleSimilarity || 0;

				// Filtering: If titles share < 20% meaningful words, require higher content similarity
				// This catches cases like "Hello CYFoverflow team" vs "Javascript Google Review"
				if (titleSimilarity < 0.2 && row.similarity_score < 0.08) {
					logger.debug("Filtered out false positive", {
						questionId: row.id,
						title: row.title?.substring(0, 50),
						similarityScore: row.similarity_score,
						titleSimilarity,
						reason:
							"Low title similarity (<20%) with low content similarity (<8%)",
					});
					return false; // Likely false positive
				}

				// Additional check: Very low scores (< 4%) with no title overlap should be filtered
				if (row.similarity_score < 0.04 && titleSimilarity < 0.1) {
					logger.debug("Filtered out false positive", {
						questionId: row.id,
						title: row.title?.substring(0, 50),
						similarityScore: row.similarity_score,
						titleSimilarity,
						reason: "Very low similarity (<4%) with no title overlap (<10%)",
					});
					return false; // Very low similarity on both counts
				}

				return true;
			})
			.filter(
				(row, index, self) => index === self.findIndex((r) => r.id === row.id),
			);

		// Check if all results have identical titles (might indicate duplicates in database)
		const uniqueTitles = new Set(
			boosted.map((r) => r.title?.toLowerCase().trim()).filter(Boolean),
		);
		const allSameTitle = uniqueTitles.size === 1 && boosted.length > 1;

		logger.info("Text similarity search completed", {
			questionId,
			totalFound: result.rows.length,
			afterBoost: boosted.length,
			afterFilter: filtered.length,
			minScore,
			searchTitle: cleanTitle.substring(0, 50),
			uniqueTitlesFound: uniqueTitles.size,
			allSameTitle: allSameTitle,
			warning: allSameTitle
				? "All results have identical titles - may indicate duplicate questions in database"
				: null,
			filteredScores: filtered.slice(0, 10).map((r) => ({
				id: r.id,
				title: r.title?.substring(0, 50) || "No title",
				score: r.similarity_score,
				titleMatch: r.titleMatch,
			})),
			allScores: boosted.slice(0, 10).map((r) => ({
				id: r.id,
				title: r.title?.substring(0, 50) || "No title",
				score: r.similarity_score,
				titleMatch: r.titleMatch,
			})),
		});

		return filtered;
	} catch (error) {
		logger.error("Error finding similar questions by text:", error);
		throw error;
	}
};
