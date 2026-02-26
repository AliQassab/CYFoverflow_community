import logger from "../utils/logger.js";

import * as repository from "./deviceTokenRepository.js";

/**
 * Valid platform types
 */
export const PLATFORMS = {
	ANDROID: "android",
	IOS: "ios",
	WEB: "web",
	DESKTOP: "desktop",
};

/**
 * Register a device token
 * @param {number} userId - User ID
 * @param {string} token - Device token
 * @param {string} platform - Platform type
 * @param {string} [deviceInfo] - Device information
 * @param {string} [appVersion] - App version
 * @returns {Promise<Object>} Registered device token
 */
export const registerDeviceToken = async (
	userId,
	token,
	platform,
	deviceInfo = null,
	appVersion = null,
) => {
	// Validate platform
	if (!Object.values(PLATFORMS).includes(platform)) {
		throw new Error(
			`Invalid platform. Must be one of: ${Object.values(PLATFORMS).join(", ")}`,
		);
	}

	if (!token || !token.trim()) {
		throw new Error("Device token is required");
	}

	try {
		const deviceToken = await repository.registerDeviceTokenDB(
			userId,
			token.trim(),
			platform,
			deviceInfo,
			appVersion,
		);

		return deviceToken;
	} catch (error) {
		logger.error("Error registering device token", {
			userId,
			platform,
			error: error.message,
		});
		throw error;
	}
};

/**
 * Unregister a device token
 * @param {string} token - Device token
 * @returns {Promise<boolean>} True if unregistered
 */
export const unregisterDeviceToken = async (token) => {
	if (!token || !token.trim()) {
		throw new Error("Device token is required");
	}

	try {
		const unregistered = await repository.unregisterDeviceTokenDB(token.trim());
		return unregistered;
	} catch (error) {
		logger.error("Error unregistering device token", {
			error: error.message,
		});
		throw error;
	}
};

/**
 * Get all active device tokens for a user
 * @param {number} userId - User ID
 * @param {string} [platform] - Optional platform filter
 * @returns {Promise<Array>} Array of device tokens
 */
export const getUserDeviceTokens = async (userId, platform = null) => {
	return repository.getUserDeviceTokensDB(userId, platform);
};

/**
 * Update last used timestamp for a device token
 * @param {string} token - Device token
 */
export const updateDeviceTokenLastUsed = async (token) => {
	await repository.updateDeviceTokenLastUsedDB(token);
};
