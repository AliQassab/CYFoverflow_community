import logger from "../utils/logger.js";

import * as repository from "./refreshTokenRepository.js";

// Refresh token expires in 7 days
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Create a new refresh token for a user
 * @param {number} userId - User ID
 * @param {string} [deviceInfo] - Device/browser info
 * @param {string} [ipAddress] - IP address
 * @returns {Promise<{token: string, expiresAt: Date}>} Refresh token and expiration
 */
export const createRefreshToken = async (
	userId,
	deviceInfo = null,
	ipAddress = null,
) => {
	try {
		const token = repository.generateRefreshToken();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

		await repository.createRefreshTokenDB(
			userId,
			token,
			expiresAt,
			deviceInfo,
			ipAddress,
		);

		return {
			token,
			expiresAt,
		};
	} catch (error) {
		logger.error("Error creating refresh token", {
			userId,
			error: error.message,
		});
		throw error;
	}
};

/**
 * Verify and get refresh token data
 * @param {string} token - Plain refresh token
 * @returns {Promise<Object|null>} Refresh token data or null if invalid
 */
export const verifyRefreshToken = async (token) => {
	try {
		const refreshToken = await repository.findRefreshTokenDB(token);
		if (!refreshToken) {
			return null;
		}

		return refreshToken;
	} catch (error) {
		logger.error("Error verifying refresh token", {
			error: error.message,
		});
		return null;
	}
};

/**
 * Revoke a refresh token
 * @param {string} token - Plain refresh token
 * @returns {Promise<boolean>} True if revoked
 */
export const revokeRefreshToken = async (token) => {
	try {
		const revoked = await repository.revokeRefreshTokenDB(token);
		return revoked;
	} catch (error) {
		logger.error("Error revoking refresh token", {
			error: error.message,
		});
		throw error;
	}
};

/**
 * Revoke all refresh tokens for a user (e.g., on logout or security event)
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of tokens revoked
 */
export const revokeAllUserRefreshTokens = async (userId) => {
	try {
		const count = await repository.revokeAllUserRefreshTokensDB(userId);
		return count;
	} catch (error) {
		logger.error("Error revoking all user refresh tokens", {
			userId,
			error: error.message,
		});
		throw error;
	}
};

/**
 * Rotate refresh token (create new, revoke old)
 * @param {string} oldToken - Old refresh token to revoke
 * @param {number} userId - User ID
 * @param {string} [deviceInfo] - Device/browser info
 * @param {string} [ipAddress] - IP address
 * @returns {Promise<{token: string, expiresAt: Date}>} New refresh token
 */
export const rotateRefreshToken = async (
	oldToken,
	userId,
	deviceInfo = null,
	ipAddress = null,
) => {
	try {
		// Revoke old token
		await repository.revokeRefreshTokenDB(oldToken);

		const newToken = await createRefreshToken(userId, deviceInfo, ipAddress);
		return newToken;
	} catch (error) {
		logger.error("Error rotating refresh token", {
			userId,
			error: error.message,
		});
		throw error;
	}
};
