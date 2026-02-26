/**
 * Server-Sent Events handler for real-time notifications
 * Maintains active connections and broadcasts notifications
 */

import logger from "../utils/logger.js";
import { sendSSE, setupSSE, keepAlive } from "../utils/sse.js";

// Store active SSE connections per user
const activeConnections = new Map(); // Map<userId, Set<Response>>

/**
 * Register a new SSE connection for a user
 * @param {number} userId - User ID
 * @param {import("express").Response} res - Express response object
 * @returns {Function} Cleanup function
 */
export const registerConnection = (userId, res) => {
	if (!activeConnections.has(userId)) {
		activeConnections.set(userId, new Set());
	}

	const connections = activeConnections.get(userId);
	connections.add(res);

	// Setup SSE headers
	setupSSE(res);

	// Send initial unread count
	sendSSE(res, "connected", {
		userId,
		timestamp: new Date().toISOString(),
	});

	// Keep connection alive
	const heartbeatInterval = keepAlive(res, 30000);

	// Handle client disconnect
	const cleanup = () => {
		connections.delete(res);
		if (connections.size === 0) {
			activeConnections.delete(userId);
		}
		clearInterval(heartbeatInterval);
		logger.debug("SSE connection closed", {
			userId,
			remainingConnections: connections.size,
		});
	};

	// Cleanup on client disconnect
	res.on("close", cleanup);
	res.on("error", (error) => {
		logger.error("SSE connection error", {
			userId,
			error: error.message,
		});
		cleanup();
	});

	logger.debug("SSE connection registered", {
		userId,
		totalConnections: connections.size,
	});

	return cleanup;
};

/**
 * Broadcast notification to user's active connections
 * @param {number} userId - User ID
 * @param {string} event - Event type
 * @param {any} data - Data to send
 */
export const broadcastToUser = (userId, event, data) => {
	const connections = activeConnections.get(userId);
	if (!connections || connections.size === 0) {
		return;
	}

	let sentCount = 0;
	const deadConnections = [];

	connections.forEach((res) => {
		try {
			sendSSE(res, event, data);
			sentCount++;
		} catch (error) {
			logger.error("Error broadcasting SSE message", {
				userId,
				error: error.message,
			});
			deadConnections.push(res);
		}
	});

	// Clean up dead connections
	deadConnections.forEach((res) => {
		connections.delete(res);
	});

	if (connections.size === 0) {
		activeConnections.delete(userId);
	}

	if (sentCount > 0) {
		logger.debug("SSE broadcast sent", {
			userId,
			event,
			sentCount,
			totalConnections: connections.size,
		});
	}
};

/**
 * Get number of active connections for a user
 * @param {number} userId - User ID
 * @returns {number} Number of active connections
 */
export const getConnectionCount = (userId) => {
	const connections = activeConnections.get(userId);
	return connections ? connections.size : 0;
};

/**
 * Get total number of active connections
 * @returns {number} Total active connections
 */
export const getTotalConnections = () => {
	let total = 0;
	activeConnections.forEach((connections) => {
		total += connections.size;
	});
	return total;
};
