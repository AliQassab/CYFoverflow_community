import * as pushNotificationService from "../pushNotifications/pushNotificationService.js";
import logger from "../utils/logger.js";

import * as repository from "./notificationRepository.js";
import * as sseHandler from "./notificationSSE.js";

/**
 * Create a notification for answer added
 * @param {number} questionAuthorId - Question author's user ID
 * @param {number} answerId - Answer ID
 * @param {number} questionId - Question ID
 * @param {string} answererName - Name of the person who answered
 * @param {string} questionTitle - Question title
 */
export const createAnswerNotification = async (
	questionAuthorId,
	answerId,
	questionId,
	answererName,
	questionTitle,
) => {
	try {
		// Don't notify if user answered their own question
		// (This check should be done at the service level before calling this)
		const message = `${answererName} answered your question: "${questionTitle}"`;
		await repository.createNotificationDB({
			user_id: questionAuthorId,
			type: "answer_added",
			message,
			related_question_id: questionId,
			related_answer_id: answerId,
		});

		const badgeCount = await repository
			.getUnreadNotificationCountDB(questionAuthorId)
			.catch(() => undefined);

		// Send push notification (non-blocking)
		pushNotificationService
			.sendPushNotification(questionAuthorId, {
				title: "New Answer",
				body: message,
				data: {
					type: "answer_added",
					questionId: questionId.toString(),
					answerId: answerId.toString(),
					badgeCount,
				},
			})
			.catch((error) => {
				logger.error("Failed to send push notification for answer", {
					error: error.message,
				});
			});

		// Broadcast to SSE connections (real-time update) - non-blocking
		repository
			.getUnreadNotificationCountDB(questionAuthorId)
			.then((unreadCount) => {
				sseHandler.broadcastToUser(questionAuthorId, "unread_count", {
					count: unreadCount,
				});
				sseHandler.broadcastToUser(questionAuthorId, "new_notification", {
					type: "answer_added",
					questionId,
					answerId,
				});
			})
			.catch((error) => {
				logger.error("Failed to broadcast SSE notification", {
					error: error.message,
				});
			});
	} catch (error) {
		logger.error("Error creating answer notification:", error);
		// Don't throw - notifications are non-critical
	}
};

/**
 * Create a notification for comment added
 * Always notifies the question author (not the answer author)
 * @param {number} questionAuthorId - Question author's user ID
 * @param {number} commentId - Comment ID
 * @param {number} questionId - Question ID
 * @param {number} [answerId] - Answer ID (if comment is on answer)
 * @param {string} commenterName - Name of the person who commented
 */
export const createCommentNotification = async (
	questionAuthorId,
	commentId,
	questionId,
	answerId,
	commenterName,
) => {
	try {
		const message = answerId
			? `${commenterName} commented on an answer to your question`
			: `${commenterName} commented on your question`;

		await repository.createNotificationDB({
			user_id: questionAuthorId,
			type: "comment_added",
			message,
			related_question_id: questionId,
			related_answer_id: answerId || null,
			related_comment_id: commentId,
		});

		const badgeCount = await repository
			.getUnreadNotificationCountDB(questionAuthorId)
			.catch(() => undefined);

		// Send push notification (non-blocking)
		pushNotificationService
			.sendPushNotification(questionAuthorId, {
				title: "New Comment",
				body: message,
				data: {
					type: "comment_added",
					questionId: questionId.toString(),
					answerId: answerId ? answerId.toString() : null,
					commentId: commentId.toString(),
					badgeCount,
				},
			})
			.catch((error) => {
				logger.error("Failed to send push notification for comment", {
					error: error.message,
				});
			});

		// Broadcast to SSE connections (real-time update) - non-blocking
		repository
			.getUnreadNotificationCountDB(questionAuthorId)
			.then((unreadCount) => {
				sseHandler.broadcastToUser(questionAuthorId, "unread_count", {
					count: unreadCount,
				});
				sseHandler.broadcastToUser(questionAuthorId, "new_notification", {
					type: "comment_added",
					questionId,
					answerId,
					commentId,
				});
			})
			.catch((error) => {
				logger.error("Failed to broadcast SSE notification", {
					error: error.message,
				});
			});
	} catch (error) {
		logger.error("Error creating comment notification:", error);
		// Don't throw - notifications are non-critical
	}
};

/**
 * Create a notification for accepted answer
 * Notifies the answer author when their answer is accepted
 * @param {number} answerAuthorId - Answer author's user ID
 * @param {number} answerId - Answer ID
 * @param {number} questionId - Question ID
 * @param {string} questionTitle - Question title
 * @param {string} questionSlug - Question slug for link
 */
export const createAcceptedAnswerNotification = async (
	answerAuthorId,
	answerId,
	questionId,
	questionTitle,
	questionSlug,
) => {
	try {
		const message = `Your answer was accepted for: "${questionTitle}"`;
		await repository.createNotificationDB({
			user_id: answerAuthorId,
			type: "answer_accepted",
			message,
			related_question_id: questionId,
			related_answer_id: answerId,
		});

		const badgeCount = await repository
			.getUnreadNotificationCountDB(answerAuthorId)
			.catch(() => undefined);

		// Send push notification (non-blocking)
		pushNotificationService
			.sendPushNotification(answerAuthorId, {
				title: "Answer Accepted!",
				body: message,
				data: {
					type: "answer_accepted",
					questionId: questionId.toString(),
					answerId: answerId.toString(),
					questionSlug: questionSlug,
					badgeCount,
				},
			})
			.catch((error) => {
				logger.error("Failed to send push notification for accepted answer", {
					error: error.message,
				});
			});

		// Broadcast to SSE connections (real-time update) - non-blocking
		repository
			.getUnreadNotificationCountDB(answerAuthorId)
			.then((unreadCount) => {
				sseHandler.broadcastToUser(answerAuthorId, "unread_count", {
					count: unreadCount,
				});
				sseHandler.broadcastToUser(answerAuthorId, "new_notification", {
					type: "answer_accepted",
					questionId,
					answerId,
				});
			})
			.catch((error) => {
				logger.error("Failed to broadcast SSE notification", {
					error: error.message,
				});
			});
	} catch (error) {
		logger.error("Error creating accepted answer notification:", error);
		// Don't throw - notifications are non-critical
	}
};

/**
 * Delete all notifications related to a specific answer
 * Called when an answer is deleted to clean up related notifications
 * @param {number} answerId - Answer ID
 */
export const deleteAnswerNotifications = async (answerId) => {
	try {
		// Get affected user IDs before deletion
		const notifications =
			await repository.getNotificationsByAnswerIdDB(answerId);
		const affectedUserIds = new Set(notifications.map((n) => n.user_id));

		const deletedCount =
			await repository.deleteNotificationsByAnswerIdDB(answerId);

		// Broadcast to affected users
		affectedUserIds.forEach((userId) => {
			repository
				.getUnreadNotificationCountDB(userId)
				.then((unreadCount) => {
					sseHandler.broadcastToUser(userId, "unread_count", {
						count: unreadCount,
					});
				})
				.catch(() => {
					// Non-critical
				});
		});

		return deletedCount;
	} catch (error) {
		logger.error("Error deleting answer notifications:", error);
		// Don't throw - notification cleanup is non-critical
		return 0;
	}
};

/**
 * Delete all notifications related to a specific question
 * Called when a question is deleted to clean up all related notifications
 * This includes: question_added, answer_added, comment_added, and answer_accepted notifications
 * @param {number} questionId - Question ID
 */
export const deleteQuestionNotifications = async (questionId) => {
	try {
		// Get affected user IDs before deletion
		const notifications =
			await repository.getNotificationsByQuestionIdDB(questionId);
		const affectedUserIds = new Set(notifications.map((n) => n.user_id));

		const deletedCount =
			await repository.deleteNotificationsByQuestionIdDB(questionId);

		// Broadcast to affected users
		affectedUserIds.forEach((userId) => {
			repository
				.getUnreadNotificationCountDB(userId)
				.then((unreadCount) => {
					sseHandler.broadcastToUser(userId, "unread_count", {
						count: unreadCount,
					});
				})
				.catch(() => {
					// Non-critical
				});
		});

		return deletedCount;
	} catch (error) {
		logger.error("Error deleting question notifications:", error);
		// Don't throw - notification cleanup is non-critical
		return 0;
	}
};

/**
 * Create notifications for new question (notify all users)
 * Uses bulk insert for performance
 * @param {number} questionId - Question ID
 * @param {string} questionTitle - Question title
 * @param {string} questionAuthorName - Question author's name
 * @param {Array<number>} allUserIds - Array of all user IDs to notify
 */
export const createQuestionNotification = async (
	questionId,
	questionTitle,
	questionAuthorName,
	allUserIds,
) => {
	if (!allUserIds || allUserIds.length === 0) {
		return;
	}

	try {
		const message = `${questionAuthorName} asked: "${questionTitle}"`;

		// Prepare notification data for bulk insert
		const notifications = allUserIds.map((userId) => ({
			user_id: userId,
			type: "question_added",
			message,
			related_question_id: questionId,
			related_answer_id: null,
			related_comment_id: null,
		}));

		// Use bulk insert for better performance
		// Process in batches of 500 to avoid query size limits
		const BATCH_SIZE = 500;

		for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
			const batch = notifications.slice(i, i + BATCH_SIZE);
			try {
				await repository.bulkCreateNotificationsDB(batch);
			} catch (error) {
				logger.error(
					`Failed to create notification batch ${i / BATCH_SIZE + 1}:`,
					error,
				);
				// Continue with next batch
			}
		}
	} catch (error) {
		logger.error("Error creating question notifications:", error);
		// Don't throw - notifications are non-critical
	}
};

/**
 * Get notifications for a user
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Notifications and unread count
 */
export const getNotifications = async (userId, options = {}) => {
	const notifications = await repository.getNotificationsByUserIdDB(
		userId,
		options,
	);
	const unreadCount = await repository.getUnreadNotificationCountDB(userId);

	return {
		notifications,
		unreadCount,
	};
};

/**
 * Get unread notification count for a user (optimized - only count, no data)
 * @param {number} userId - User ID
 * @returns {Promise<number>} Unread notification count
 */
export const getUnreadNotificationCount = async (userId) => {
	try {
		return await repository.getUnreadNotificationCountDB(userId);
	} catch (error) {
		logger.error("Error getting unread notification count:", error);
		// Return 0 instead of throwing to prevent blocking
		return 0;
	}
};

/**
 * Mark notification as read
 * @param {number} notificationId - Notification ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated notification
 */
export const markNotificationAsRead = async (notificationId, userId) => {
	return repository.markNotificationAsReadDB(notificationId, userId);
};

/**
 * Mark all notifications as read
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of notifications marked as read
 */
export const markAllNotificationsAsRead = async (userId) => {
	return repository.markAllNotificationsAsReadDB(userId);
};

/**
 * Delete a notification
 * @param {number} notificationId - Notification ID
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteNotification = async (notificationId, userId) => {
	return repository.deleteNotificationDB(notificationId, userId);
};
