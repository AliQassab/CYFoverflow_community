/**
 * Password reset token repository
 * Handles database operations for password reset tokens
 */

import crypto from "crypto";

import db from "../db.js";
import logger from "../utils/logger.js";

/**
 * Generate a secure random token
 * @returns {string} Random token
 */
export const generateResetToken = () => {
	return crypto.randomBytes(32).toString("hex");
};

/**
 * Hash a password reset token (for storage)
 * @param {string} token - Plain token
 * @returns {string} Hashed token
 */
export const hashToken = (token) => {
	return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Create a password reset token
 * @param {number} userId - User ID
 * @param {Date} expiresAt - Expiration date
 * @returns {Promise<string>} Plain token (before hashing)
 */
export const createPasswordResetTokenDB = async (userId, expiresAt) => {
	try {
		const plainToken = generateResetToken();
		const hashedToken = hashToken(plainToken);

		// Invalidate any existing tokens for this user
		await db.query(
			`UPDATE password_reset_tokens 
			 SET used_at = NOW() 
			 WHERE user_id = $1 AND used_at IS NULL`,
			[userId],
		);

		// Create new token
		await db.query(
			`INSERT INTO password_reset_tokens (user_id, token, expires_at)
			 VALUES ($1, $2, $3)`,
			[userId, hashedToken, expiresAt],
		);

		return plainToken;
	} catch (error) {
		logger.error("Error creating password reset token", {
			userId,
			error: error.message,
		});
		throw error;
	}
};

/**
 * Find and validate a password reset token
 * @param {string} token - Plain token
 * @returns {Promise<Object|null>} Token data or null if invalid
 */
export const findPasswordResetTokenDB = async (token) => {
	try {
		const hashedToken = hashToken(token);
		const now = new Date();

		const result = await db.query(
			`SELECT prt.*, u.email, u.name
			 FROM password_reset_tokens prt
			 JOIN users u ON prt.user_id = u.id
			 WHERE prt.token = $1 
			   AND prt.expires_at > $2
			   AND prt.used_at IS NULL`,
			[hashedToken, now],
		);

		if (result.rows.length === 0) {
			return null;
		}

		return result.rows[0];
	} catch (error) {
		logger.error("Error finding password reset token", {
			error: error.message,
		});
		return null;
	}
};

/**
 * Mark a password reset token as used
 * @param {string} token - Plain token
 * @returns {Promise<boolean>} True if marked as used
 */
export const markTokenAsUsedDB = async (token) => {
	try {
		const hashedToken = hashToken(token);
		const result = await db.query(
			`UPDATE password_reset_tokens 
			 SET used_at = NOW() 
			 WHERE token = $1 AND used_at IS NULL
			 RETURNING id`,
			[hashedToken],
		);

		return result.rows.length > 0;
	} catch (error) {
		logger.error("Error marking password reset token as used", {
			error: error.message,
		});
		return false;
	}
};

/**
 * Clean up expired tokens (older than specified days)
 * @param {number} [daysOld] - Delete tokens older than this many days (default: 7)
 * @returns {Promise<number>} Number of tokens deleted
 */
export const cleanupExpiredTokensDB = async (daysOld = 7) => {
	try {
		const result = await db.query(
			`DELETE FROM password_reset_tokens
			 WHERE expires_at < NOW() - INTERVAL '${daysOld} days'
			    OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '${daysOld} days')`,
		);
		return result.rowCount || 0;
	} catch (error) {
		logger.error("Error cleaning up expired password reset tokens", {
			error: error.message,
		});
		return 0;
	}
};
