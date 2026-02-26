import { Router } from "express";

import * as refreshTokenService from "../refreshTokens/refreshTokenService.js";
import { generateToken } from "../utils/auth.js";
import logger from "../utils/logger.js";

const refreshRouter = Router();

/**
 * POST /api/auth/refresh
 * Exchange refresh token for new access token
 */
refreshRouter.post("/refresh", async (req, res) => {
	try {
		const { refreshToken } = req.body;

		if (!refreshToken) {
			return res.status(400).json({
				message: "Refresh token is required.",
			});
		}

		// Verify refresh token
		const tokenData =
			await refreshTokenService.verifyRefreshToken(refreshToken);
		if (!tokenData) {
			return res.status(401).json({
				message: "Invalid or expired refresh token.",
			});
		}

		// Generate new access token
		const accessToken = generateToken(tokenData.user_id);

		// Rotate refresh token (security best practice)
		const deviceInfo = req.headers["user-agent"] || null;
		const ipAddress = req.ip || req.connection.remoteAddress || null;
		const newRefreshTokenData = await refreshTokenService.rotateRefreshToken(
			refreshToken,
			tokenData.user_id,
			deviceInfo,
			ipAddress,
		);

		res.status(200).json({
			accessToken,
			refreshToken: newRefreshTokenData.token,
			expiresAt: newRefreshTokenData.expiresAt.toISOString(),
		});
	} catch (error) {
		logger.error("Token refresh failed: %O", error);
		res.status(500).json({
			message: error.message || "Internal server error.",
		});
	}
});

/**
 * POST /api/auth/logout
 * Revoke refresh token (logout)
 */
refreshRouter.post("/logout", async (req, res) => {
	try {
		const { refreshToken } = req.body;

		if (refreshToken) {
			await refreshTokenService.revokeRefreshToken(refreshToken);
		}

		res.status(200).json({
			message: "Logged out successfully.",
		});
	} catch (error) {
		logger.error("Logout failed: %O", error);
		res.status(500).json({
			message: error.message || "Internal server error.",
		});
	}
});

export default refreshRouter;
