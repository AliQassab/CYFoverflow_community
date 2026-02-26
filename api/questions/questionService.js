import * as authRepository from "../auth/authRepository.js";
import * as notificationService from "../notifications/notificationService.js";
import * as similarQuestionsService from "../similarQuestions/similarQuestionsService.js";
import logger from "../utils/logger.js";
import { sanitizeHtml } from "../utils/security.js";

import * as repository from "./questionRepository.js";

export const createQuestion = async (
	userId,
	title,
	content,
	templateType,
	browser = null,
	os = null,
	documentationLink = null,
	labelId = [],
) => {
	if (!title) {
		throw new Error("Title is required");
	}

	const trimmedTitle = title.trim();
	const MAX_TITLE_LENGTH = 100;
	const MIN_TITLE_LENGTH = 10;

	if (trimmedTitle.length < MIN_TITLE_LENGTH) {
		throw new Error(
			`Title must be at least ${MIN_TITLE_LENGTH} characters long`,
		);
	}

	if (trimmedTitle.length > MAX_TITLE_LENGTH) {
		throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
	}
	if (!content || (typeof content === "string" && !content.trim())) {
		throw new Error("Content is required");
	}

	if (labelId == null) labelId = [];
	if (!Array.isArray(labelId)) throw new Error("Labels must be an array");

	if (labelId.length > 3) throw new Error("Maximum 3 labels allowed");

	// Sanitize HTML content to prevent XSS
	const sanitizedContent =
		typeof content === "string" ? sanitizeHtml(content.trim()) : content;

	if (!sanitizedContent || sanitizedContent.trim().length === 0) {
		throw new Error("Content is required");
	}

	const question = await repository.createQuestionDB(
		trimmedTitle,
		sanitizedContent,
		templateType,
		userId,
		browser,
		os,
		documentationLink,
		labelId,
	);

	// Create notifications for all users (non-blocking - runs in background)
	// This doesn't block question creation response
	(async () => {
		try {
			const allUsers = await authRepository.getAllUsers();
			const userIdsToNotify = allUsers
				.map((u) => u.id)
				.filter((id) => id !== userId); // Don't notify the question author

			if (userIdsToNotify.length > 0) {
				const questionAuthor = await authRepository.findUserById(userId);
				const authorName = questionAuthor?.name || "Someone";

				await notificationService.createQuestionNotification(
					question.id,
					trimmedTitle,
					authorName,
					userIdsToNotify,
				);
			}
		} catch (error) {
			logger.error("Error creating question notifications:", error);
			// Don't throw - notifications are non-critical
		}
	})();

	// Auto-detect similar questions (non-blocking, async - don't wait for it)
	// This runs in the background so it doesn't slow down question creation
	similarQuestionsService
		.suggestSimilarQuestions(
			question.id,
			trimmedTitle,
			typeof content === "string" ? content.trim() : content,
			5, // Limit to 5 suggestions
		)
		.then((similarQuestions) => {
			// Attach suggestions to the question object
			question.similarQuestions = similarQuestions;
		})
		.catch((error) => {
			logger.error("Error detecting similar questions:", error);
			// Don't throw - similar questions detection is non-critical
			question.similarQuestions = [];
		});

	return question;
};

export const getAllQuestions = async (limit = null, page = null) => {
	return repository.getAllQuestionsDB(limit, page);
};

export const getTotalQuestionsCount = async () => {
	return repository.getTotalQuestionsCountDB();
};

export const getQuestionById = async (id) => {
	const question = await repository.getQuestionByIdDB(id);
	if (!question) {
		logger.error("Error not found Question");
	}
	return question;
};

export const getQuestionsByUserId = async (
	userId,
	limit = null,
	page = null,
) => {
	return repository.getQuestionsByUserIdDB(userId, limit, page);
};

export const getQuestionsByUserIdCount = async (userId) => {
	return repository.getQuestionsByUserIdCountDB(userId);
};
export const updateQuestion = async (
	idOrSlug,
	userId,
	title,
	content,
	templateType,
	browser = null,
	os = null,
	documentationLink = null,
	labelId = [],
) => {
	const question = await repository.getQuestionByIdDB(idOrSlug);
	if (!question) {
		throw new Error("Question not found");
	}
	if (!title) {
		throw new Error("title is required");
	}

	const trimmedTitle = title.trim();
	const MAX_TITLE_LENGTH = 100;
	const MIN_TITLE_LENGTH = 10;

	if (trimmedTitle.length < MIN_TITLE_LENGTH) {
		throw new Error(
			`Title must be at least ${MIN_TITLE_LENGTH} characters long`,
		);
	}

	if (trimmedTitle.length > MAX_TITLE_LENGTH) {
		throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
	}
	if (!content) {
		throw new Error("content is required");
	}
	if (question.user_id !== userId) {
		throw new Error("You are not authorised to edit");
	}

	// Sanitize HTML content to prevent XSS
	const sanitizedContent =
		typeof content === "string" ? sanitizeHtml(content.trim()) : content;

	if (!sanitizedContent || sanitizedContent.trim().length === 0) {
		throw new Error("Content is required");
	}

	// Use the actual question ID from the fetched question
	return repository.updateQuestionDB(
		question.id,
		trimmedTitle,
		sanitizedContent,
		templateType,
		browser,
		os,
		documentationLink,
		labelId,
	);
};

export const deleteQuestion = async (idOrSlug, userId) => {
	const question = await repository.getQuestionByIdDB(idOrSlug);
	if (!question) {
		throw new Error("Question not found");
	}
	if (question.user_id !== userId) {
		throw new Error("You are not authorised to delete");
	}

	// Delete the question (this also soft-deletes all related answers)
	const deleted = await repository.deleteQuestionDB(question.id);

	// Delete all notifications related to this question (non-blocking)
	// This includes:
	// - question_added notifications (for all users)
	// - answer_added notifications (for answers to this question)
	// - comment_added notifications (for comments on this question or its answers)
	// - answer_accepted notifications (for accepted answers to this question)
	notificationService
		.deleteQuestionNotifications(question.id)
		.catch((error) => {
			logger.error("Failed to delete question notifications", {
				questionId: question.id,
				error: error.message,
			});
		});

	return deleted;
};

export const getAllLabels = async () => {
	return repository.getAllLabelsDB();
};

export const searchQuestionsByLabels = async (labelId = []) => {
	if (!Array.isArray(labelId)) throw new Error("labelIds must be an array");
	if (labelId.length === 0) throw new Error("At least one label ID required");

	return repository.searchQuestionsByLabelsDB(labelId);
};

export const searchQuestionsByText = async (
	searchTerm,
	limit = null,
	page = null,
	options = {},
) => {
	if (!searchTerm || !searchTerm.trim()) {
		throw new Error("Search term is required");
	}

	return repository.searchQuestionsByTextDB(
		searchTerm.trim(),
		limit,
		page,
		options,
	);
};

export const getSearchQuestionsCount = async (searchTerm, options = {}) => {
	if (!searchTerm || !searchTerm.trim()) {
		return 0;
	}

	return repository.getSearchQuestionsCountDB(searchTerm.trim(), options);
};

export const markQuestionSolved = async (idOrSlug, userId, isSolved) => {
	const question = await repository.getQuestionByIdDB(idOrSlug);

	if (!question) {
		throw new Error("Question not found");
	}

	if (question.user_id !== userId) {
		throw new Error("You are not authorised to change solved status");
	}

	return repository.updateSolvedStatusDB(question.id, isSolved);
};
