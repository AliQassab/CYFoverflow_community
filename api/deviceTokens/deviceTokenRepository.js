import db from "../db.js";
import logger from "../utils/logger.js";

/**
 * Register a device token
 * @param {number} userId - User ID
 * @param {string} token - Device token
 * @param {string} platform - Platform ('android', 'ios', 'web', 'desktop')
 * @param {string} [deviceInfo] - Device information
 * @param {string} [appVersion] - App version
 * @returns {Promise<Object>} Created device token record
 */
export const registerDeviceTokenDB = async (
	userId,
	token,
	platform,
	deviceInfo = null,
	appVersion = null,
) => {
	try {
		// Check if token already exists
		const existing = await db.query(
			`SELECT id, user_id FROM device_tokens WHERE token = $1`,
			[token],
		);

		if (existing.rows.length > 0) {
			// Update existing token
			const result = await db.query(
				`UPDATE device_tokens
				 SET user_id = $1, platform = $2, device_info = $3, app_version = $4,
				     is_active = true, last_used_at = NOW(), updated_at = NOW()
				 WHERE token = $5
				 RETURNING *`,
				[userId, platform, deviceInfo, appVersion, token],
			);
			return result.rows[0];
		}

		// Create new token
		const result = await db.query(
			`INSERT INTO device_tokens (user_id, token, platform, device_info, app_version, last_used_at)
			 VALUES ($1, $2, $3, $4, $5, NOW())
			 RETURNING *`,
			[userId, token, platform, deviceInfo, appVersion],
		);
		return result.rows[0];
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
export const unregisterDeviceTokenDB = async (token) => {
	try {
		const result = await db.query(
			`UPDATE device_tokens
			 SET is_active = false, updated_at = NOW()
			 WHERE token = $1 AND is_active = true
			 RETURNING id`,
			[token],
		);
		return result.rows.length > 0;
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
 * @returns {Promise<Array>} Array of device token records
 */
export const getUserDeviceTokensDB = async (userId, platform = null) => {
	try {
		let query = `SELECT id, token, platform, device_info, app_version, created_at, last_used_at
		             FROM device_tokens
		             WHERE user_id = $1 AND is_active = true`;
		const params = [userId];

		if (platform) {
			query += ` AND platform = $2`;
			params.push(platform);
		}

		query += ` ORDER BY last_used_at DESC NULLS LAST, created_at DESC`;

		const result = await db.query(query, params);
		return result.rows;
	} catch (error) {
		logger.error("Error getting user device tokens", {
			userId,
			platform,
			error: error.message,
		});
		throw error;
	}
};

/**
 * Update last used timestamp for a device token
 * @param {string} token - Device token
 * @returns {Promise<void>}
 */
export const updateDeviceTokenLastUsedDB = async (token) => {
	try {
		await db.query(
			`UPDATE device_tokens
			 SET last_used_at = NOW(), updated_at = NOW()
			 WHERE token = $1 AND is_active = true`,
			[token],
		);
	} catch (error) {
		logger.error("Error updating device token last used", {
			error: error.message,
		});
		// Non-critical error, don't throw
	}
};

/**
 * Clean up inactive device tokens (older than specified days)
 * @param {number} [daysOld] - Delete tokens inactive for this many days (default: 90)
 * @returns {Promise<number>} Number of tokens deleted
 */
export const cleanupInactiveDeviceTokensDB = async (daysOld = 90) => {
	try {
		const result = await db.query(
			`DELETE FROM device_tokens
			 WHERE is_active = false AND updated_at < NOW() - INTERVAL '${daysOld} days'`,
		);
		return result.rowCount || 0;
	} catch (error) {
		logger.error("Error cleaning up inactive device tokens", {
			error: error.message,
		});
		throw error;
	}
};
