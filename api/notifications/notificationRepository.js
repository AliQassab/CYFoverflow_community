import db from "../db.js";
import logger from "../utils/logger.js";

/**
 * Create a new notification
 * @param {Object} notificationData
 * @param {number} notificationData.user_id - User ID to notify
 * @param {string} notificationData.type - Notification type (answer_added, comment_added, etc.)
 * @param {string} notificationData.message - Notification message
 * @param {number} [notificationData.related_question_id] - Related question ID
 * @param {number} [notificationData.related_answer_id] - Related answer ID
 * @param {number} [notificationData.related_comment_id] - Related comment ID
 * @returns {Promise<Object>} Created notification
 */
export const createNotificationDB = async ({
	user_id,
	type,
	message,
	related_question_id = null,
	related_answer_id = null,
	related_comment_id = null,
}) => {
	try {
		const result = await db.query(
			`INSERT INTO notifications (user_id, type, message, related_question_id, related_answer_id, related_comment_id)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 RETURNING *`,
			[
				user_id,
				type,
				message,
				related_question_id,
				related_answer_id,
				related_comment_id,
			],
		);
		return result.rows[0];
	} catch (error) {
		logger.error("Error creating notification:", error);
		throw error;
	}
};

/**
 * Bulk create notifications (optimized for many users)
 * Uses PostgreSQL's VALUES clause for efficient bulk insert
 * @param {Array<Object>} notifications - Array of notification data objects
 * @param {number} notifications[].user_id - User ID to notify
 * @param {string} notifications[].type - Notification type
 * @param {string} notifications[].message - Notification message
 * @param {number} [notifications[].related_question_id] - Related question ID
 * @param {number} [notifications[].related_answer_id] - Related answer ID
 * @param {number} [notifications[].related_comment_id] - Related comment ID
 * @returns {Promise<number>} Number of notifications created
 */
export const bulkCreateNotificationsDB = async (notifications) => {
	if (!notifications || notifications.length === 0) {
		return 0;
	}

	try {
		// Build VALUES clause for bulk insert
		const values = [];
		const params = [];
		let paramIndex = 1;

		for (const notif of notifications) {
			values.push(
				`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5})`,
			);
			params.push(
				notif.user_id,
				notif.type,
				notif.message,
				notif.related_question_id || null,
				notif.related_answer_id || null,
				notif.related_comment_id || null,
			);
			paramIndex += 6;
		}

		const query = `
			INSERT INTO notifications (user_id, type, message, related_question_id, related_answer_id, related_comment_id)
			VALUES ${values.join(", ")}
		`;

		const result = await db.query(query, params);
		return result.rowCount || notifications.length;
	} catch (error) {
		logger.error("Error bulk creating notifications:", error);
		throw error;
	}
};

/**
 * Get all notifications for a user
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @param {boolean} [options.unreadOnly=false] - Only return unread notifications
 * @param {number} [options.limit=50] - Maximum number of notifications
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<Array>} Array of notifications
 */
export const getNotificationsByUserIdDB = async (
	userId,
	{ unreadOnly = false, limit = 50, offset = 0 } = {},
) => {
	try {
		let query = `
			SELECT 
				n.*,
				q.title AS question_title,
				q.slug AS question_slug
			FROM notifications n
			LEFT JOIN questions q ON n.related_question_id = q.id AND q.deleted_at IS NULL
			LEFT JOIN answers a ON n.related_answer_id = a.id
			WHERE n.user_id = $1
			  -- Exclude notifications for deleted questions
			  AND (n.related_question_id IS NULL OR q.deleted_at IS NULL)
			  -- Exclude notifications for deleted answers
			  AND (n.related_answer_id IS NULL OR a.deleted_at IS NULL)
		`;

		const params = [userId];

		if (unreadOnly) {
			query += ` AND n.read = false`;
		}

		query += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
		params.push(limit, offset);

		const result = await db.query(query, params);
		return result.rows;
	} catch (error) {
		logger.error("Error fetching notifications:", error);
		throw error;
	}
};

/**
 * Get count of unread notifications for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Count of unread notifications
 */
export const getUnreadNotificationCountDB = async (userId) => {
	try {
		// Optimized query - uses composite index (user_id, read, created_at)
		// Using read = false explicitly to leverage the partial index
		// Use the partial index directly for better performance
		// Also exclude notifications for deleted answers
		const startTime = Date.now();
		const result = await db.query(
			`SELECT COUNT(*)::integer as count
			 FROM notifications n
			 LEFT JOIN questions q ON n.related_question_id = q.id
			 LEFT JOIN answers a ON n.related_answer_id = a.id
			 WHERE n.user_id = $1 
			   AND (n.read = false OR n.read IS NULL)
			   -- Exclude notifications for deleted questions
			   AND (n.related_question_id IS NULL OR q.deleted_at IS NULL)
			   -- Exclude notifications for deleted answers
			   AND (n.related_answer_id IS NULL OR a.deleted_at IS NULL)
			   -- Hint: Use partial index notifications_user_type_read_idx if available
			   -- Otherwise falls back to notifications_user_read_created_idx`,
			[userId],
		);
		const duration = Date.now() - startTime;

		if (duration > 500) {
			logger.warn("Unread count query took longer than expected", {
				userId,
				duration,
			});
		}

		const count = result.rows[0]?.count || 0;
		logger.debug("Unread notification count fetched", {
			userId,
			count,
			duration,
		});
		return count;
	} catch (error) {
		logger.error("Error counting unread notifications:", error);
		// Return 0 instead of throwing to prevent blocking
		return 0;
	}
};

/**
 * Mark a notification as read
 * @param {number} notificationId - Notification ID
 * @param {number} userId - User ID (for security check)
 * @returns {Promise<Object>} Updated notification
 */
export const markNotificationAsReadDB = async (notificationId, userId) => {
	try {
		const result = await db.query(
			`UPDATE notifications
			 SET read = true, read_at = NOW()
			 WHERE id = $1 AND user_id = $2 AND read = false
			 RETURNING *`,
			[notificationId, userId],
		);

		if (result.rows.length === 0) {
			// Check if notification exists but is already read
			const checkResult = await db.query(
				`SELECT id, read FROM notifications WHERE id = $1 AND user_id = $2`,
				[notificationId, userId],
			);

			if (checkResult.rows.length === 0) {
				throw new Error("Notification not found or unauthorized");
			}

			if (checkResult.rows[0].read) {
				// Already read - return the existing notification
				logger.debug("Notification already marked as read", {
					notificationId,
					userId,
				});
				const existingResult = await db.query(
					`SELECT * FROM notifications WHERE id = $1 AND user_id = $2`,
					[notificationId, userId],
				);
				return existingResult.rows[0];
			}

			throw new Error("Notification not found or unauthorized");
		}

		const updatedNotification = result.rows[0];
		logger.info("Notification marked as read", {
			notificationId,
			userId,
			read: updatedNotification.read,
			readAt: updatedNotification.read_at,
		});

		return updatedNotification;
	} catch (error) {
		logger.error("Error marking notification as read:", error);
		throw error;
	}
};

/**
 * Mark all notifications as read for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of notifications marked as read
 */
export const markAllNotificationsAsReadDB = async (userId) => {
	try {
		const result = await db.query(
			`UPDATE notifications
			 SET read = true, read_at = NOW()
			 WHERE user_id = $1 AND read = false
			 RETURNING id`,
			[userId],
		);
		return result.rows.length;
	} catch (error) {
		logger.error("Error marking all notifications as read:", error);
		throw error;
	}
};

/**
 * Delete a notification
 * @param {number} notificationId - Notification ID
 * @param {number} userId - User ID (for security check)
 * @returns {Promise<boolean>} Success status
 */
export const deleteNotificationDB = async (notificationId, userId) => {
	try {
		const result = await db.query(
			`DELETE FROM notifications
			 WHERE id = $1 AND user_id = $2
			 RETURNING id`,
			[notificationId, userId],
		);

		if (result.rows.length === 0) {
			throw new Error("Notification not found or unauthorized");
		}

		return true;
	} catch (error) {
		logger.error("Error deleting notification:", error);
		throw error;
	}
};

/**
 * Delete all notifications related to a specific answer
 * This is used when an answer is deleted - we should remove notifications about that answer
 * @param {number} answerId - Answer ID
 * @returns {Promise<number>} Number of notifications deleted
 */
/**
 * Get notifications by answer ID (for getting affected users before deletion)
 * @param {number} answerId - Answer ID
 * @returns {Promise<Array>} Array of notifications
 */
export const getNotificationsByAnswerIdDB = async (answerId) => {
	try {
		const result = await db.query(
			`SELECT user_id FROM notifications WHERE related_answer_id = $1`,
			[answerId],
		);
		return result.rows;
	} catch (error) {
		logger.error("Error getting notifications by answer ID:", error);
		throw error;
	}
};

export const deleteNotificationsByAnswerIdDB = async (answerId) => {
	try {
		const result = await db.query(
			`DELETE FROM notifications
			 WHERE related_answer_id = $1
			 RETURNING id`,
			[answerId],
		);

		const deletedCount = result.rows.length;
		return deletedCount;
	} catch (error) {
		logger.error("Error deleting notifications by answer ID:", error);
		throw error;
	}
};

/**
 * Delete all notifications related to a specific question
 * This is used when a question is deleted - we should remove all notifications about that question
 * including question_added, answer_added, comment_added, and answer_accepted notifications
 * @param {number} questionId - Question ID
 * @returns {Promise<number>} Number of notifications deleted
 */
/**
 * Get notifications by question ID (for getting affected users before deletion)
 * @param {number} questionId - Question ID
 * @returns {Promise<Array>} Array of notifications
 */
export const getNotificationsByQuestionIdDB = async (questionId) => {
	try {
		const result = await db.query(
			`SELECT user_id FROM notifications WHERE related_question_id = $1`,
			[questionId],
		);
		return result.rows;
	} catch (error) {
		logger.error("Error getting notifications by question ID:", error);
		throw error;
	}
};

export const deleteNotificationsByQuestionIdDB = async (questionId) => {
	try {
		const result = await db.query(
			`DELETE FROM notifications
			 WHERE related_question_id = $1
			 RETURNING id`,
			[questionId],
		);

		const deletedCount = result.rows.length;
		return deletedCount;
	} catch (error) {
		logger.error("Error deleting notifications by question ID:", error);
		throw error;
	}
};
