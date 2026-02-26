import crypto from "crypto";

import db from "../db.js";
import logger from "../utils/logger.js";

/**
 * Generate a secure random refresh token
 * @returns {string} Random token string
 */
export const generateRefreshToken = () => {
	return crypto.randomBytes(64).toString("hex");
};

/**
 * Hash a refresh token for storage
 * @param {string} token - Plain token
 * @returns {string} Hashed token
 */
export const hashToken = (token) => {
	return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Create a new refresh token
 * @param {number} userId - User ID
 * @param {string} token - Plain refresh token (will be hashed)
 * @param {Date} expiresAt - Expiration date
 * @param {string} [deviceInfo] - Device/browser info
 * @param {string} [ipAddress] - IP address
 * @returns {Promise<Object>} Created refresh token record
 */
export const createRefreshTokenDB = async (
	userId,
	token,
	expiresAt,
	deviceInfo = null,
	ipAddress = null,
) => {
	try {
		const hashedToken = hashToken(token);
		const result = await db.query(
			`INSERT INTO refresh_tokens (user_id, token, expires_at, device_info, ip_address)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING id, user_id, expires_at, device_info, ip_address, created_at`,
			[userId, hashedToken, expiresAt, deviceInfo, ipAddress],
		);
		return result.rows[0];
	} catch (error) {
		logger.error("Error creating refresh token", {
			userId,
			error: error.message,
		});
		throw error;
	}
};

/**
 * Find refresh token by token value
 * @param {string} token - Plain refresh token
 * @returns {Promise<Object|null>} Refresh token record or null
 */
export const findRefreshTokenDB = async (token) => {
	try {
		const hashedToken = hashToken(token);
		const result = await db.query(
			`SELECT id, user_id, token, expires_at, revoked, revoked_at, device_info, ip_address, created_at
			 FROM refresh_tokens
			 WHERE token = $1 AND revoked = false AND expires_at > NOW()`,
			[hashedToken],
		);
		return result.rows[0] || null;
	} catch (error) {
		logger.error("Error finding refresh token", {
			error: error.message,
		});
		throw error;
	}
};

/**
 * Revoke a refresh token
 * @param {string} token - Plain refresh token
 * @returns {Promise<boolean>} True if revoked
 */
export const revokeRefreshTokenDB = async (token) => {
	try {
		const hashedToken = hashToken(token);
		const result = await db.query(
			`UPDATE refresh_tokens
			 SET revoked = true, revoked_at = NOW()
			 WHERE token = $1 AND revoked = false
			 RETURNING id`,
			[hashedToken],
		);
		return result.rows.length > 0;
	} catch (error) {
		logger.error("Error revoking refresh token", {
			error: error.message,
		});
		throw error;
	}
};

/**
 * Revoke all refresh tokens for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of tokens revoked
 */
export const revokeAllUserRefreshTokensDB = async (userId) => {
	try {
		const result = await db.query(
			`UPDATE refresh_tokens
			 SET revoked = true, revoked_at = NOW()
			 WHERE user_id = $1 AND revoked = false
			 RETURNING id`,
			[userId],
		);
		return result.rows.length;
	} catch (error) {
		logger.error("Error revoking all user refresh tokens", {
			userId,
			error: error.message,
		});
		throw error;
	}
};

/**
 * Delete expired refresh tokens (cleanup)
 * @param {number} [daysOld] - Delete tokens older than this many days (default: 30)
 * @returns {Promise<number>} Number of tokens deleted
 */
export const deleteExpiredRefreshTokensDB = async (daysOld = 30) => {
	try {
		const result = await db.query(
			`DELETE FROM refresh_tokens
			 WHERE expires_at < NOW() - INTERVAL '${daysOld} days' OR revoked = true`,
		);
		return result.rowCount || 0;
	} catch (error) {
		logger.error("Error deleting expired refresh tokens", {
			error: error.message,
		});
		throw error;
	}
};

/**
 * Get all active refresh tokens for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of refresh token records
 */
export const getUserRefreshTokensDB = async (userId) => {
	try {
		const result = await db.query(
			`SELECT id, device_info, ip_address, expires_at, created_at
			 FROM refresh_tokens
			 WHERE user_id = $1 AND revoked = false AND expires_at > NOW()
			 ORDER BY created_at DESC`,
			[userId],
		);
		return result.rows;
	} catch (error) {
		logger.error("Error getting user refresh tokens", {
			userId,
			error: error.message,
		});
		throw error;
	}
};
