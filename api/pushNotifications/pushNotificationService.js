import webPush from "web-push";

import * as deviceTokenService from "../deviceTokens/deviceTokenService.js";
import config from "../utils/config.js";
import logger from "../utils/logger.js";

let webPushInitialised = false;

const initWebPush = () => {
	if (webPushInitialised) return true;
	const { vapidPublicKey, vapidPrivateKey, vapidSubject } = config;
	if (!vapidPublicKey || !vapidPrivateKey) return false;
	webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
	webPushInitialised = true;
	return true;
};

/**
 * Push notification service
 * Handles sending push notifications to devices across different platforms
 */

/**
 * Send push notification to a user's devices
 * @param {number} userId - User ID
 * @param {Object} notification - Notification data
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {Object} [notification.data] - Additional data payload
 * @param {string} [notification.platform] - Specific platform to target (optional)
 * @returns {Promise<Object>} Result with success/failure counts
 */
export const sendPushNotification = async (userId, notification) => {
	try {
		const { title, body, platform = null } = notification;

		if (!title || !body) {
			throw new Error("Notification title and body are required");
		}

		const deviceTokens = await deviceTokenService.getUserDeviceTokens(
			userId,
			platform,
		);

		if (deviceTokens.length === 0) {
			return {
				success: 0,
				failed: 0,
				total: 0,
			};
		}

		// Group tokens by platform
		const tokensByPlatform = {};
		deviceTokens.forEach((dt) => {
			if (!tokensByPlatform[dt.platform]) {
				tokensByPlatform[dt.platform] = [];
			}
			tokensByPlatform[dt.platform].push(dt.token);
		});

		let successCount = 0;
		let failedCount = 0;

		// Send to each platform
		for (const [platformType, tokens] of Object.entries(tokensByPlatform)) {
			try {
				const result = await sendToPlatform(platformType, tokens, notification);
				successCount += result.success || 0;
				failedCount += result.failed || 0;
			} catch (error) {
				logger.error(`Error sending push to ${platformType}`, {
					userId,
					platform: platformType,
					error: error.message,
				});
				failedCount += tokens.length;
			}
		}

		return {
			success: successCount,
			failed: failedCount,
			total: deviceTokens.length,
		};
	} catch (error) {
		logger.error("Error sending push notification", {
			userId,
			error: error.message,
		});
		throw error;
	}
};

/**
 * Send push notification to a specific platform
 * @param {string} platform - Platform type ('android', 'ios', 'web', 'desktop')
 * @param {Array<string>} tokens - Array of device tokens
 * @returns {Promise<Object>} Result with success/failure counts
 */
const sendToPlatform = async (platform, tokens, notification) => {
	switch (platform) {
		case deviceTokenService.PLATFORMS.ANDROID:
			return sendToAndroid(tokens);
		case deviceTokenService.PLATFORMS.IOS:
			return sendToIOS(tokens);
		case deviceTokenService.PLATFORMS.WEB:
			return sendToWeb(tokens, notification);
		case deviceTokenService.PLATFORMS.DESKTOP:
			return sendToDesktop(tokens);
		default:
			logger.warn(`Unsupported platform: ${platform}`);
			return { success: 0, failed: tokens.length };
	}
};

/**
 * Send push notification to Android devices (FCM)
 * @param {Array<string>} tokens - FCM device tokens
 * @param {Object} notification - Notification data
 * @returns {Promise<Object>} Result with success/failure counts
 */
const sendToAndroid = async (tokens) => {
	// TODO: Implement FCM integration
	return {
		success: tokens.length,
		failed: 0,
	};
};

/**
 * Send push notification to iOS devices (APNS)
 * @param {Array<string>} tokens - APNS device tokens
 * @param {Object} notification - Notification data
 * @returns {Promise<Object>} Result with success/failure counts
 */
const sendToIOS = async (tokens) => {
	// TODO: Implement APNS integration
	return {
		success: tokens.length,
		failed: 0,
	};
};

/**
 * Send push notification to web browsers (Web Push API)
 * @param {Array<string>} tokens - Web push subscription JSON strings
 * @param {Object} notification - Notification data
 * @returns {Promise<Object>} Result with success/failure counts
 */
const sendToWeb = async (tokens, notification = {}) => {
	if (!initWebPush()) {
		logger.warn("VAPID keys not configured — web push skipped");
		return { success: 0, failed: tokens.length };
	}

	const payload = JSON.stringify({
		title: notification.title || "CYFoverflow",
		body: notification.body || "You have a new notification",
		icon: "/favicon.svg",
		badge: "/favicon.svg",
		data: notification.data || {},
		tag: notification.data?.type,
	});

	let successCount = 0;
	let failedCount = 0;

	for (const token of tokens) {
		try {
			const subscription = JSON.parse(token);
			await webPush.sendNotification(subscription, payload);
			successCount++;
		} catch (error) {
			// 410 Gone / 404 Not Found = subscription expired, safe to ignore
			if (error.statusCode === 410 || error.statusCode === 404) {
				logger.info("Web push subscription expired, should be cleaned up");
			} else {
				logger.error("Error sending web push", { error: error.message });
			}
			failedCount++;
		}
	}

	return { success: successCount, failed: failedCount };
};

/**
 * Send push notification to desktop apps (Electron/React Native)
 * @param {Array<string>} tokens - Desktop device tokens
 * @param {Object} notification - Notification data
 * @returns {Promise<Object>} Result with success/failure counts
 */
const sendToDesktop = async (tokens) => {
	// TODO: Implement desktop push notification
	return {
		success: tokens.length,
		failed: 0,
	};
};
