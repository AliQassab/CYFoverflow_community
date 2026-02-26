/**
 * Server-Sent Events (SSE) utilities
 * Provides real-time updates to clients
 */

import logger from "./logger.js";

/**
 * Send SSE message to client
 * @param {import("express").Response} res - Express response object
 * @param {string} event - Event type (optional)
 * @param {any} data - Data to send
 */
export const sendSSE = (res, event, data) => {
	try {
		if (event) {
			res.write(`event: ${event}\n`);
		}
		res.write(`data: ${JSON.stringify(data)}\n\n`);
	} catch (error) {
		logger.error("Error sending SSE message", {
			error: error.message,
			event,
		});
	}
};

/**
 * Setup SSE connection headers
 * @param {import("express").Response} res - Express response object
 */
export const setupSSE = (res) => {
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

	// Send initial connection message
	res.write(": connected\n\n");
};

/**
 * Keep SSE connection alive with heartbeat
 * @param {import("express").Response} res - Express response object
 * @param {number} intervalMs - Interval in milliseconds (default: 30 seconds)
 * @returns {NodeJS.Timeout} Interval ID
 */
export const keepAlive = (res, intervalMs = 30000) => {
	return setInterval(() => {
		try {
			res.write(": heartbeat\n\n");
		} catch (error) {
			logger.error("Error sending SSE heartbeat", {
				error: error.message,
			});
		}
	}, intervalMs);
};
