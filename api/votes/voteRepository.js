import db from "../db.js";
import logger from "../utils/logger.js";

/**
 * Create or update a vote for an answer
 * @param {number} answerId - The answer ID
 * @param {number} userId - The user ID
 * @param {string} voteType - 'upvote' or 'downvote'
 * @returns {Promise<Object>} The vote object
 */
export const createOrUpdateVoteDB = async (answerId, userId, voteType) => {
	try {
		// Check if vote already exists
		const existingVote = await db.query(
			`SELECT id, vote_type FROM votes 
			 WHERE answer_id = $1 AND user_id = $2`,
			[answerId, userId],
		);

		if (existingVote.rows.length > 0) {
			const existingVoteType = existingVote.rows[0].vote_type;

			// If same vote type, remove the vote (toggle off)
			if (existingVoteType === voteType) {
				await db.query(`DELETE FROM votes WHERE id = $1`, [
					existingVote.rows[0].id,
				]);
				return { vote_type: null, removed: true };
			}

			// If different vote type, update it
			const result = await db.query(
				`UPDATE votes 
				 SET vote_type = $1, created_at = NOW()
				 WHERE id = $2
				 RETURNING *`,
				[voteType, existingVote.rows[0].id],
			);
			return result.rows[0];
		}

		// Create new vote
		const result = await db.query(
			`INSERT INTO votes (answer_id, user_id, vote_type)
			 VALUES ($1, $2, $3)
			 RETURNING *`,
			[answerId, userId, voteType],
		);
		return result.rows[0];
	} catch (error) {
		logger.error("Error creating/updating vote:", error);
		throw error;
	}
};

/**
 * Get vote counts for an answer
 * @param {number} answerId - The answer ID
 * @returns {Promise<Object>} Object with upvote_count and downvote_count
 */
export const getVoteCountsDB = async (answerId) => {
	try {
		const result = await db.query(
			`SELECT 
				COUNT(*) FILTER (WHERE vote_type = 'upvote') AS upvote_count,
				COUNT(*) FILTER (WHERE vote_type = 'downvote') AS downvote_count
			 FROM votes
			 WHERE answer_id = $1`,
			[answerId],
		);
		return {
			upvote_count: parseInt(result.rows[0].upvote_count) || 0,
			downvote_count: parseInt(result.rows[0].downvote_count) || 0,
		};
	} catch (error) {
		logger.error("Error getting vote counts:", error);
		throw error;
	}
};

/**
 * Get vote counts for multiple answers
 * @param {number[]} answerIds - Array of answer IDs
 * @returns {Promise<Object>} Object mapping answer_id to vote counts
 */
export const getVoteCountsForAnswersDB = async (answerIds) => {
	if (!answerIds || answerIds.length === 0) {
		return {};
	}

	try {
		const result = await db.query(
			`SELECT 
				answer_id,
				COUNT(*) FILTER (WHERE vote_type = 'upvote') AS upvote_count,
				COUNT(*) FILTER (WHERE vote_type = 'downvote') AS downvote_count
			 FROM votes
			 WHERE answer_id = ANY($1)
			 GROUP BY answer_id`,
			[answerIds],
		);

		const voteCounts = {};
		result.rows.forEach((row) => {
			voteCounts[row.answer_id] = {
				upvote_count: parseInt(row.upvote_count) || 0,
				downvote_count: parseInt(row.downvote_count) || 0,
			};
		});

		// Ensure all answer IDs have an entry (even if 0 votes)
		answerIds.forEach((id) => {
			if (!voteCounts[id]) {
				voteCounts[id] = { upvote_count: 0, downvote_count: 0 };
			}
		});

		return voteCounts;
	} catch (error) {
		logger.error("Error getting vote counts for answers:", error);
		throw error;
	}
};

/**
 * Get user's vote for an answer
 * @param {number} answerId - The answer ID
 * @param {number} userId - The user ID
 * @returns {Promise<string|null>} 'upvote', 'downvote', or null
 */
export const getUserVoteDB = async (answerId, userId) => {
	try {
		const result = await db.query(
			`SELECT vote_type FROM votes 
			 WHERE answer_id = $1 AND user_id = $2`,
			[answerId, userId],
		);

		if (result.rows.length === 0) {
			return null;
		}

		return result.rows[0].vote_type;
	} catch (error) {
		logger.error("Error getting user vote:", error);
		throw error;
	}
};

/**
 * Get user's votes for multiple answers
 * @param {number[]} answerIds - Array of answer IDs
 * @param {number} userId - The user ID
 * @returns {Promise<Object>} Object mapping answer_id to vote_type
 */
export const getUserVotesForAnswersDB = async (answerIds, userId) => {
	if (!answerIds || answerIds.length === 0) {
		return {};
	}

	try {
		const result = await db.query(
			`SELECT answer_id, vote_type FROM votes 
			 WHERE answer_id = ANY($1) AND user_id = $2`,
			[answerIds, userId],
		);

		const userVotes = {};
		result.rows.forEach((row) => {
			userVotes[row.answer_id] = row.vote_type;
		});

		return userVotes;
	} catch (error) {
		logger.error("Error getting user votes for answers:", error);
		throw error;
	}
};
