import * as answerRepository from "../answers/answerRepository.js";
import * as authRepository from "../auth/authRepository.js";
import * as notificationService from "../notifications/notificationService.js";
import * as questionRepository from "../questions/questionRepository.js";
import logger from "../utils/logger.js";
import { sanitizeText } from "../utils/security.js";

import * as repository from "./commentRepository.js";

/**
 * Create a comment on an answer
 * @param {string} content - Comment content
 * @param {number} answerId - Answer ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Created comment with author info
 */
export const createCommentOnAnswer = async (content, answerId, userId) => {
	if (!content || content.trim().length === 0) {
		throw new Error("Comment content cannot be empty");
	}

	// Sanitize comment content (plain text)
	const sanitizedContent = sanitizeText(content.trim());

	if (sanitizedContent.length < 10) {
		throw new Error("Comment must be at least 10 characters long");
	}

	// Verify answer exists
	const answer = await answerRepository.getAnswerByIdDB(answerId);
	if (!answer) {
		throw new Error("Answer not found");
	}

	try {
		const comment = await repository.createCommentDB({
			content: sanitizedContent,
			answer_id: answerId,
			user_id: userId,
		});

		// Get question to find question author (we notify question author, not answer author)
		const question = await questionRepository.getQuestionByIdDB(
			answer.question_id,
		);
		if (question) {
			// Get commenter name
			const commenter = await authRepository.findUserById(userId);
			const commenterName = commenter?.name || "Someone";

			// Create notification for question author (not answer author)
			// Don't notify if commenting on own question
			if (question.user_id !== userId) {
				notificationService
					.createCommentNotification(
						question.user_id,
						comment.id,
						answer.question_id,
						answerId,
						commenterName,
						question.slug,
					)
					.catch((error) => {
						logger.error("Failed to create comment notification", {
							error: error.message,
						});
					});
			}
		}

		// Fetch comment with author info
		const comments = await repository.getCommentsByAnswerIdDB(answerId);
		return comments.find((c) => c.id === comment.id);
	} catch (error) {
		logger.error("Error creating comment:", error);
		throw error;
	}
};

/**
 * Create a comment on a question
 * @param {string} content - Comment content
 * @param {number} questionId - Question ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Created comment with author info
 */
export const createCommentOnQuestion = async (content, questionId, userId) => {
	if (!content || content.trim().length === 0) {
		throw new Error("Comment content cannot be empty");
	}

	// Sanitize comment content (plain text)
	const sanitizedContent = sanitizeText(content.trim());

	if (sanitizedContent.length < 10) {
		throw new Error("Comment must be at least 10 characters long");
	}

	// Verify question exists
	const question = await questionRepository.getQuestionByIdDB(questionId);
	if (!question) {
		throw new Error("Question not found");
	}

	try {
		const comment = await repository.createCommentDB({
			content: sanitizedContent,
			question_id: questionId,
			user_id: userId,
		});

		// Get commenter name
		const commenter = await authRepository.findUserById(userId);
		const commenterName = commenter?.name || "Someone";

		// Create notification for question author (don't notify if commenting on own question)
		if (question.user_id !== userId) {
			notificationService
				.createCommentNotification(
					question.user_id,
					comment.id,
					questionId,
					null,
					commenterName,
					question.slug,
				)
				.catch((error) => {
					logger.error("Failed to create comment notification", {
						error: error.message,
					});
				});
		}

		// Fetch comment with author info
		const comments = await repository.getCommentsByQuestionIdDB(questionId);
		return comments.find((c) => c.id === comment.id);
	} catch (error) {
		logger.error("Error creating comment:", error);
		throw error;
	}
};

/**
 * Get comments for an answer
 * @param {number} answerId - Answer ID
 * @returns {Promise<Array>} Array of comments
 */
export const getCommentsByAnswerId = async (answerId) => {
	return repository.getCommentsByAnswerIdDB(answerId);
};

/**
 * Get comments for a question
 * @param {number} questionId - Question ID
 * @returns {Promise<Array>} Array of comments
 */
export const getCommentsByQuestionId = async (questionId) => {
	return repository.getCommentsByQuestionIdDB(questionId);
};

/**
 * Get comments for multiple answers
 * @param {number[]} answerIds - Array of answer IDs
 * @returns {Promise<Object>} Object mapping answer_id to comments
 */
export const getCommentsForAnswers = async (answerIds) => {
	return repository.getCommentsForAnswersDB(answerIds);
};

/**
 * Update a comment
 * @param {number} commentId - Comment ID
 * @param {string} content - New content
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<Object>} Updated comment
 */
export const updateComment = async (commentId, content, userId) => {
	if (!content || content.trim().length === 0) {
		throw new Error("Comment content cannot be empty");
	}

	// Sanitize comment content (plain text)
	const sanitizedContent = sanitizeText(content.trim());

	if (sanitizedContent.length < 10) {
		throw new Error("Comment must be at least 10 characters long");
	}

	// Verify comment exists and user owns it
	const comment = await repository.getCommentByIdDB(commentId);
	if (!comment) {
		throw new Error("Comment not found");
	}

	if (comment.user_id !== userId) {
		throw new Error("Unauthorized: You can only edit your own comments");
	}

	return repository.updateCommentDB(commentId, sanitizedContent);
};

/**
 * Delete a comment
 * @param {number} commentId - Comment ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<boolean>} True if deleted
 */
export const deleteComment = async (commentId, userId) => {
	// Verify comment exists and user owns it
	const comment = await repository.getCommentByIdDB(commentId);
	if (!comment) {
		throw new Error("Comment not found");
	}

	if (comment.user_id !== userId) {
		throw new Error("Unauthorized: You can only delete your own comments");
	}

	return repository.deleteCommentDB(commentId);
};
