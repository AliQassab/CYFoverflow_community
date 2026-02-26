import express from "express";

import { authenticateToken } from "../utils/auth.js";
import logger from "../utils/logger.js";

import * as deviceTokenService from "./deviceTokenService.js";

const router = express.Router();

/**
 * POST /api/devices/register
 * Register a device token for push notifications
 */
router.post("/register", authenticateToken(), async (req, res) => {
	try {
		const { token, platform, deviceInfo, appVersion } = req.body;
		const userId = req.user.id;

		if (!token || !platform) {
			return res.status(400).json({
				message: "Token and platform are required",
			});
		}

		const deviceToken = await deviceTokenService.registerDeviceToken(
			userId,
			token,
			platform,
			deviceInfo,
			appVersion,
		);

		res.status(201).json({
			message: "Device registered successfully",
			deviceToken: {
				id: deviceToken.id,
				platform: deviceToken.platform,
				createdAt: deviceToken.created_at,
			},
		});
	} catch (error) {
		logger.error("Device registration error: %O", error);
		const statusCode = error.message?.includes("Invalid platform") ? 400 : 500;
		res.status(statusCode).json({
			message: error.message || "Failed to register device",
		});
	}
});

/**
 * DELETE /api/devices/:token
 * Unregister a device token
 */
router.delete("/:token", authenticateToken(), async (req, res) => {
	try {
		const { token } = req.params;
		const userId = req.user.id;

		// Verify token belongs to user (security check)
		const userTokens = await deviceTokenService.getUserDeviceTokens(userId);
		const tokenExists = userTokens.some((dt) => dt.token === token);

		if (!tokenExists) {
			return res.status(404).json({
				message: "Device token not found",
			});
		}

		const unregistered = await deviceTokenService.unregisterDeviceToken(token);

		if (unregistered) {
			res.status(200).json({
				message: "Device unregistered successfully",
			});
		} else {
			res.status(404).json({
				message: "Device token not found or already unregistered",
			});
		}
	} catch (error) {
		logger.error("Device unregistration error: %O", error);
		res.status(500).json({
			message: error.message || "Failed to unregister device",
		});
	}
});

/**
 * GET /api/devices
 * Get user's registered devices
 */
router.get("/", authenticateToken(), async (req, res) => {
	try {
		const userId = req.user.id;
		const { platform } = req.query;

		const devices = await deviceTokenService.getUserDeviceTokens(
			userId,
			platform || null,
		);

		res.status(200).json({
			devices: devices.map((device) => ({
				id: device.id,
				platform: device.platform,
				deviceInfo: device.device_info,
				appVersion: device.app_version,
				createdAt: device.created_at,
				lastUsedAt: device.last_used_at,
			})),
		});
	} catch (error) {
		logger.error("Get devices error: %O", error);
		res.status(500).json({
			message: error.message || "Failed to get devices",
		});
	}
});

export default router;
