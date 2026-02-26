import * as authRepository from "../auth/authRepository.js";
import emailService from "../emails/emailService.js";
import * as notificationService from "../notifications/notificationService.js";
import * as questionRepository from "../questions/questionRepository.js";
import * as reputationService from "../reputation/reputationService.js";
import logger from "../utils/logger.js";
import { sanitizeHtml } from "../utils/security.js";

import * as repository from "./answerRepository.js";

export const createAnswer = async (content, userId, questionId) => {
	if (!content) {
		throw new Error("Content is required");
	}

	try {
		const sanitizedContent =
			typeof content === "string" ? sanitizeHtml(content.trim()) : content;

		if (!sanitizedContent || sanitizedContent.trim().length === 0) {
			throw new Error("Content is required");
		}

		const answerer = await authRepository.findUserById(userId);
		if (!answerer) throw new Error("Answerer not found");
		const answererName = answerer.name || "A fellow learner";

		const question = await questionRepository.getQuestionByIdDB(questionId);
		if (!question) throw new Error("Question not found");

		const answer = await repository.createAnswerDB({
			content: sanitizedContent,
			user_id: userId,
			question_id: questionId,
		});

		if (question.user_id !== userId) {
			notificationService
				.createAnswerNotification(
					question.user_id,
					answer.id,
					questionId,
					answererName,
					question.title,
				)
				.catch((error) => {
					logger.error("Failed to create answer notification", {
						error: error.message,
					});
				});

			if (question.author_email && question.slug) {
				emailService
					.sendAnswerNotification({
						questionAuthorEmail: question.author_email,
						questionAuthorName: question.author_name || "User",
						questionSlug: question.slug,
						questionId: question.id,
						questionTitle: question.title,
						answererName: answererName,
						answerContent: content,
					})
					.then((result) => {
						if (!result.success) {
							logger.warn("Email service returned error", {
								answerId: answer.id,
								questionId: question.id,
								error: result.error,
							});
						}
					})
					.catch((error) => {
						logger.error("Email sending failed", {
							answerId: answer.id,
							questionId: question.id,
							error: error.message,
						});
					});
			} else if (!question.author_email) {
				logger.warn("Cannot send email notification - missing author email", {
					questionId: question.id,
					hasSlug: !!question.slug,
				});
			} else if (!question.slug) {
				logger.warn("Cannot send email notification - missing question slug", {
					questionId: question.id,
					hasEmail: !!question.author_email,
				});
			}
		}

		return answer;
	} catch (error) {
		logger.error("Error creating answer", { error: error.message });
		throw error;
	}
};

export const getAnswersByQuestionId = async (questionId, userId = null) => {
	const answers = await repository.getAnswerByQuestionIdDB(questionId, userId);
	if (!answers) {
		logger.error("Error not found Question" + questionId);
	}
	return answers;
};

export const updateAnswer = async (id, content, userId) => {
	if (!content) throw new Error("Content cannot be empty");

	const answer = await repository.getAnswerByIdDB(id);

	if (!answer) {
		throw new Error("Answer not found");
	}

	if (answer.user_id !== userId) {
		throw new Error("Unauthorized: You can only edit your own answer");
	}

	const sanitizedContent =
		typeof content === "string" ? sanitizeHtml(content.trim()) : content;

	if (!sanitizedContent || sanitizedContent.trim().length === 0) {
		throw new Error("Content cannot be empty");
	}

	return repository.updateAnswerDB(id, sanitizedContent);
};

export const deleteAnswer = async (id, userId) => {
	const answer = await repository.getAnswerByIdDB(id);

	if (!answer) {
		throw new Error("Answer not found");
	}

	if (answer.user_id !== userId) {
		logger.warn("Unauthorized deletion attempt", {
			answerId: id,
			answerUserId: answer.user_id,
			requestingUserId: userId,
		});
		throw new Error("Unauthorized: You can only delete your own answer");
	}

	const deleted = await repository.deleteAnswerDB(id);

	if (!deleted) {
		throw new Error("Answer not found or already deleted");
	}

	notificationService.deleteAnswerNotifications(id).catch((error) => {
		logger.error("Failed to delete answer notifications", {
			answerId: id,
			error: error.message,
		});
	});

	return deleted;
};

export const getAnswersByUserId = async (userId, limit = null, page = null) => {
	try {
		const answers = await repository.getAnswersByUserIdWithQuestionsDB(
			userId,
			limit,
			page,
		);
		return answers;
	} catch (error) {
		logger.error("Error getting answers by user", {
			userId,
			error: error.message,
		});
		throw error;
	}
};

export const getAnswersByUserIdCount = async (userId) => {
	try {
		return await repository.getAnswersByUserIdCountDB(userId);
	} catch (error) {
		logger.error("Error getting answers count by user", {
			userId,
			error: error.message,
		});
		throw error;
	}
};

export const acceptAnswer = async (answerId, userId) => {
	try {
		const answer = await repository.getAnswerByIdDB(answerId);
		if (!answer) {
			throw new Error("Answer not found");
		}

		const question = await questionRepository.getQuestionByIdDB(
			answer.question_id,
		);
		if (!question) {
			throw new Error("Question not found");
		}

		if (question.user_id !== userId) {
			throw new Error(
				"Unauthorized: Only the question author can accept answers",
			);
		}

		const wasPreviouslyAccepted = answer.is_accepted === true;

		const previouslyAcceptedAnswer =
			await repository.getAcceptedAnswerByQuestionIdDB(answer.question_id);

		const acceptedAnswer = await repository.acceptAnswerDB(
			answerId,
			answer.question_id,
		);

		if (previouslyAcceptedAnswer && previouslyAcceptedAnswer.id !== answerId) {
			reputationService
				.handleAnswerAcceptedReputation(previouslyAcceptedAnswer.user_id, false)
				.catch((error) => {
					logger.error("Failed to update reputation for unaccepted answer", {
						error: error.message,
					});
				});
		}

		if (!wasPreviouslyAccepted) {
			reputationService
				.handleAnswerAcceptedReputation(answer.user_id, true)
				.catch((error) => {
					logger.error("Failed to update reputation for accepted answer", {
						error: error.message,
					});
				});
		}

		if (answer.user_id !== userId) {
			notificationService
				.createAcceptedAnswerNotification(
					answer.user_id,
					answerId,
					answer.question_id,
					question.title,
					question.slug,
				)
				.catch((error) => {
					logger.error("Failed to create accepted answer notification", {
						error: error.message,
					});
				});
		}

		return acceptedAnswer;
	} catch (error) {
		logger.error("Error accepting answer", {
			answerId,
			userId,
			error: error.message,
		});
		throw error;
	}
};
