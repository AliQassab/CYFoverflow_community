import { Router } from "express";

import { authenticateToken } from "../utils/auth.js";
import logger from "../utils/logger.js";

import * as sseHandler from "./notificationSSE.js";
import * as service from "./notificationService.js";

const router = Router();

/**
 * GET /api/notifications
 * Get all notifications for the authenticated user
 * Query params:
 *   - unreadOnly: boolean (only return unread notifications)
 *   - limit: number (default: 50)
 *   - offset: number (default: 0)
 */
router.get("/", authenticateToken(), async (req, res) => {
	try {
		const userId = req.user.id;
		const unreadOnly = req.query.unreadOnly === "true";
		const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
		const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;

		const result = await service.getNotifications(userId, {
			unreadOnly,
			limit,
			offset,
		});

		res.json(result);
	} catch (error) {
		logger.error("Get notifications error:", error);
		res.status(500).json({ error: "Failed to fetch notifications" });
	}
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications (optimized - only returns count, not full notifications)
 */
router.get("/unread-count", authenticateToken(), async (req, res) => {
	try {
		const userId = req.user.id;
		// Use repository directly for better performance - only get count, not full notifications
		const count = await service.getUnreadNotificationCount(userId);
		res.json({ count });
	} catch (error) {
		logger.error("Get unread count error:", error);
		res.status(500).json({ error: "Failed to fetch unread count" });
	}
});

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put("/:id/read", authenticateToken(), async (req, res) => {
	try {
		const notificationId = parseInt(req.params.id, 10);
		const userId = req.user.id;

		const notification = await service.markNotificationAsRead(
			notificationId,
			userId,
		);

		// Return notification immediately
		res.json({
			...notification,
		});

		// Broadcast unread count update to SSE connections (non-blocking)
		service
			.getUnreadNotificationCount(userId)
			.then((count) => {
				sseHandler.broadcastToUser(userId, "unread_count", { count });
			})
			.catch((err) => {
				logger.error(
					"Error fetching unread count after mark as read (non-blocking):",
					err,
				);
			});
	} catch (error) {
		logger.error("Mark notification as read error:", error);
		const statusCode = error.message.includes("not found") ? 404 : 500;
		res
			.status(statusCode)
			.json({ error: error.message || "Failed to mark notification as read" });
	}
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the authenticated user
 */
router.put("/read-all", authenticateToken(), async (req, res) => {
	try {
		const userId = req.user.id;
		const count = await service.markAllNotificationsAsRead(userId);

		// Broadcast unread count update to SSE connections
		sseHandler.broadcastToUser(userId, "unread_count", { count: 0 });

		res.json({ message: "All notifications marked as read", count });
	} catch (error) {
		logger.error("Mark all notifications as read error:", error);
		res.status(500).json({ error: "Failed to mark all notifications as read" });
	}
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete("/:id", authenticateToken(), async (req, res) => {
	try {
		const notificationId = parseInt(req.params.id, 10);
		const userId = req.user.id;

		await service.deleteNotification(notificationId, userId);

		// Broadcast deletion to SSE connections
		sseHandler.broadcastToUser(userId, "notification_deleted", {
			notificationId,
		});

		res.json({ message: "Notification deleted" });
	} catch (error) {
		logger.error("Delete notification error:", error);
		const statusCode = error.message.includes("not found") ? 404 : 500;
		res
			.status(statusCode)
			.json({ error: error.message || "Failed to delete notification" });
	}
});

/**
 * GET /api/notifications/stream
 * Server-Sent Events endpoint for real-time notifications
 * Maintains persistent connection and sends updates as they occur
 */
router.get("/stream", authenticateToken(), async (req, res) => {
	try {
		const userId = req.user.id;

		// Register SSE connection
		sseHandler.registerConnection(userId, res);

		// Send initial unread count
		const unreadCount = await service.getUnreadNotificationCount(userId);
		sseHandler.broadcastToUser(userId, "unread_count", {
			count: unreadCount,
		});

		// Connection will remain open until client disconnects
		// Cleanup is handled automatically in registerConnection
	} catch (error) {
		logger.error("SSE stream error:", error);
		if (!res.headersSent) {
			res.status(500).json({ error: "Failed to establish SSE connection" });
		}
	}
});

export default router;
