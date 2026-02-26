import db from "../db.js";
import logger from "../utils/logger.js";

/**
 * Create a new comment
 * @param {Object} commentData - Comment data
 * @param {string} commentData.content - Comment content
 * @param {number} [commentData.answer_id] - Answer ID (optional)
 * @param {number} [commentData.question_id] - Question ID (optional)
 * @param {number} commentData.user_id - User ID
 * @returns {Promise<Object>} The created comment
 */
export const createCommentDB = async ({
	content,
	answer_id,
	question_id,
	user_id,
}) => {
	try {
		const result = await db.query(
			`INSERT INTO comments (content, answer_id, question_id, user_id)
			 VALUES ($1, $2, $3, $4)
			 RETURNING *`,
			[content, answer_id || null, question_id || null, user_id],
		);
		return result.rows[0];
	} catch (error) {
		logger.error("Error creating comment:", error);
		throw error;
	}
};

/**
 * Get all comments for an answer
 * @param {number} answerId - Answer ID
 * @returns {Promise<Array>} Array of comments with author info
 */
export const getCommentsByAnswerIdDB = async (answerId) => {
	try {
		const result = await db.query(
			`SELECT c.id, c.content, c.answer_id, c.user_id, c.created_at, c.updated_at,
			        u.name AS author_name
			 FROM comments c
			 JOIN users u ON c.user_id = u.id
			 WHERE c.answer_id = $1
			 ORDER BY c.created_at ASC`,
			[answerId],
		);
		return result.rows;
	} catch (error) {
		logger.error("Error getting comments by answer ID:", error);
		throw error;
	}
};

/**
 * Get all comments for a question
 * @param {number} questionId - Question ID
 * @returns {Promise<Array>} Array of comments with author info
 */
export const getCommentsByQuestionIdDB = async (questionId) => {
	try {
		const result = await db.query(
			`SELECT c.id, c.content, c.question_id, c.user_id, c.created_at, c.updated_at,
			        u.name AS author_name
			 FROM comments c
			 JOIN users u ON c.user_id = u.id
			 WHERE c.question_id = $1
			 ORDER BY c.created_at ASC`,
			[questionId],
		);
		return result.rows;
	} catch (error) {
		logger.error("Error getting comments by question ID:", error);
		throw error;
	}
};

/**
 * Get comments for multiple answers (batch)
 * @param {number[]} answerIds - Array of answer IDs
 * @returns {Promise<Object>} Object mapping answer_id to comments array
 */
export const getCommentsForAnswersDB = async (answerIds) => {
	if (!answerIds || answerIds.length === 0) {
		return {};
	}

	try {
		const result = await db.query(
			`SELECT c.id, c.content, c.answer_id, c.user_id, c.created_at, c.updated_at,
			        u.name AS author_name
			 FROM comments c
			 JOIN users u ON c.user_id = u.id
			 WHERE c.answer_id = ANY($1)
			 ORDER BY c.answer_id, c.created_at ASC`,
			[answerIds],
		);

		const commentsByAnswer = {};
		result.rows.forEach((comment) => {
			if (!commentsByAnswer[comment.answer_id]) {
				commentsByAnswer[comment.answer_id] = [];
			}
			commentsByAnswer[comment.answer_id].push(comment);
		});

		return commentsByAnswer;
	} catch (error) {
		logger.error("Error getting comments for answers:", error);
		throw error;
	}
};

/**
 * Get a comment by ID
 * @param {number} commentId - Comment ID
 * @returns {Promise<Object|null>} Comment or null if not found
 */
export const getCommentByIdDB = async (commentId) => {
	try {
		const result = await db.query(`SELECT * FROM comments WHERE id = $1`, [
			commentId,
		]);
		return result.rows[0] || null;
	} catch (error) {
		logger.error("Error getting comment by ID:", error);
		throw error;
	}
};

/**
 * Update a comment
 * @param {number} commentId - Comment ID
 * @param {string} content - New content
 * @returns {Promise<Object>} Updated comment
 */
export const updateCommentDB = async (commentId, content) => {
	try {
		const result = await db.query(
			`UPDATE comments
			 SET content = $1, updated_at = NOW()
			 WHERE id = $2
			 RETURNING *`,
			[content, commentId],
		);
		return result.rows[0];
	} catch (error) {
		logger.error("Error updating comment:", error);
		throw error;
	}
};

/**
 * Delete a comment
 * @param {number} commentId - Comment ID
 * @returns {Promise<boolean>} True if deleted
 */
export const deleteCommentDB = async (commentId) => {
	try {
		await db.query(`DELETE FROM comments WHERE id = $1`, [commentId]);
		return true;
	} catch (error) {
		logger.error("Error deleting comment:", error);
		throw error;
	}
};
