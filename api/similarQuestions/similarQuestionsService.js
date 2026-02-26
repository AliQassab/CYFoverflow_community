import logger from "../utils/logger.js";

import * as repository from "./similarQuestionsRepository.js";

/**
 * Get similar questions for a question
 * First checks for manual relationships, then falls back to text-based similarity
 * @param {number} questionId - Question ID
 * @param {Object} options - Query options
 * @param {string} [options.questionTitle] - Question title (for text-based search fallback)
 * @param {string} [options.questionContent] - Question content (for text-based search fallback)
 * @returns {Promise<Array>} Array of similar questions
 */
export const getSimilarQuestions = async (questionId, options = {}) => {
	try {
		logger.debug("Getting similar questions", {
			questionId,
			options: { limit: options.limit, relationType: options.relationType },
		});

		// First, try to get manually linked similar questions
		const manualSimilarQuestions = await repository.getSimilarQuestionsDB(
			questionId,
			options,
		);

		logger.debug("Manual similar questions found", {
			questionId,
			count: manualSimilarQuestions.length,
		});

		// If we have manual relationships, return them
		if (manualSimilarQuestions.length > 0) {
			return manualSimilarQuestions.map((sq) => ({
				id: sq.id,
				title: sq.title,
				slug: sq.slug,
				content: sq.content,
				author_name: sq.author_name,
				answer_count: sq.answer_count,
				view_count: sq.view_count,
				is_solved: sq.is_solved,
				created_at: sq.created_at,
				relation_type: sq.relation_type,
				similarity_score: sq.similarity_score,
			}));
		}

		// If no manual relationships, try text-based similarity search
		// This requires the question title and content
		if (options.questionTitle && options.questionContent) {
			try {
				// Strip HTML tags from content for better text matching
				// PostgreSQL's to_tsvector handles HTML, but stripping helps with very long content
				const plainTextContent = options.questionContent
					.replace(/<[^>]*>/g, " ") // Remove HTML tags
					.replace(/\s+/g, " ") // Normalize whitespace
					.trim()
					.substring(0, 5000); // Limit length for performance

				logger.debug("Searching for similar questions using text similarity", {
					questionId,
					titleLength: options.questionTitle.length,
					contentLength: plainTextContent.length,
				});

				const textSimilarQuestions =
					await repository.findSimilarQuestionsByTextDB(
						questionId,
						options.questionTitle,
						plainTextContent,
						options.limit || 5,
						0.03, // Balanced threshold (3% similarity) - filtering logic handles false positives - scores typically 0.02-0.1 for similar content
					);

				logger.debug("Found text-based similar questions", {
					questionId,
					count: textSimilarQuestions.length,
				});

				return textSimilarQuestions.map((sq) => ({
					id: sq.id,
					title: sq.title,
					slug: sq.slug,
					content: sq.content,
					author_name: sq.author_name,
					answer_count: sq.answer_count,
					view_count: sq.view_count,
					is_solved: sq.is_solved,
					created_at: sq.created_at,
					relation_type: "similar", // Default for text-based matches
					similarity_score: sq.similarity_score,
				}));
			} catch (textError) {
				logger.error("Error in text-based similarity search:", textError);
				// Fall through to return empty array
			}
		} else {
			logger.debug(
				"Skipping text-based similarity search - missing title or content",
				{
					questionId,
					hasTitle: !!options.questionTitle,
					hasContent: !!options.questionContent,
				},
			);
		}

		// No similar questions found
		return [];
	} catch (error) {
		logger.error("Error getting similar questions:", error);
		throw error;
	}
};

/**
 * Create a similar question relationship
 * @param {number} questionId - Original question ID
 * @param {number} relatedQuestionId - Related question ID
 * @param {string} relationType - Type of relation
 * @param {number} userId - User ID creating the relationship
 * @returns {Promise<Object>} Created relationship
 */
export const createSimilarQuestion = async (
	questionId,
	relatedQuestionId,
	relationType,
	userId,
) => {
	try {
		// Validate relation type
		const validTypes = ["similar", "duplicate", "related"];
		if (!validTypes.includes(relationType)) {
			throw new Error(
				`Invalid relation type. Must be one of: ${validTypes.join(", ")}`,
			);
		}

		const relationship = await repository.createSimilarQuestionDB(
			questionId,
			relatedQuestionId,
			relationType,
			userId,
		);

		return relationship;
	} catch (error) {
		logger.error("Error creating similar question:", error);
		throw error;
	}
};

/**
 * Delete a similar question relationship
 * @param {number} questionId - Original question ID
 * @param {number} relatedQuestionId - Related question ID
 * @param {number} userId - User ID (for authorization check)
 * @returns {Promise<boolean>} Success status
 */
export const deleteSimilarQuestion = async (questionId, relatedQuestionId) => {
	try {
		const deleted = await repository.deleteSimilarQuestionDB(
			questionId,
			relatedQuestionId,
		);

		return deleted;
	} catch (error) {
		logger.error("Error deleting similar question:", error);
		throw error;
	}
};

/**
 * Auto-detect and suggest similar questions when a question is created
 * This can be called after question creation to automatically link similar questions
 * @param {number} questionId - New question ID
 * @param {string} questionTitle - Question title
 * @param {string} questionContent - Question content
 * @param {number} [limit=3] - Maximum number of suggestions
 * @returns {Promise<Array>} Array of suggested similar questions
 */
export const suggestSimilarQuestions = async (
	questionId,
	questionTitle,
	questionContent,
	limit = 3,
) => {
	try {
		// Strip HTML tags from content for better text matching
		const plainTextContent =
			typeof questionContent === "string"
				? questionContent
						.replace(/<[^>]*>/g, " ") // Remove HTML tags
						.replace(/\s+/g, " ") // Normalize whitespace
						.trim()
						.substring(0, 5000) // Limit length for performance
				: "";

		logger.debug("Suggesting similar questions", {
			questionId,
			titleLength: questionTitle?.length || 0,
			contentLength: plainTextContent.length,
		});

		const suggestions = await repository.findSimilarQuestionsByTextDB(
			questionId,
			questionTitle || "",
			plainTextContent,
			limit,
			0.03, // Balanced threshold (3% similarity) - filtering logic handles false positives - scores are typically 0.02-0.1 for similar content
		);

		logger.debug("Similar questions suggestions found", {
			questionId,
			count: suggestions.length,
		});

		// Optionally auto-create relationships for high-scoring matches
		// For now, just return suggestions - manual creation is preferred

		return suggestions.map((suggestion) => ({
			id: suggestion.id,
			title: suggestion.title,
			slug: suggestion.slug,
			answer_count: suggestion.answer_count,
			view_count: suggestion.view_count,
			similarity_score: suggestion.similarity_score,
		}));
	} catch (error) {
		logger.error("Error suggesting similar questions:", error);
		throw error;
	}
};
