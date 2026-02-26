import express from "express";

import { authenticateToken, optionalAuthenticateToken } from "../utils/auth.js";
import logger from "../utils/logger.js";

import { getUserProfile, updateUserProfile } from "./userService.js";

const router = express.Router();

/**
 * GET /api/users/:id
 * Get user profile with statistics
 */
router.get("/:id", optionalAuthenticateToken(), async (req, res) => {
	try {
		const userId = parseInt(req.params.id, 10);
		if (isNaN(userId)) {
			return res.status(400).json({ error: "Invalid user ID" });
		}

		// Pass requesting user ID for privacy (email visibility)
		// req.user comes from optionalAuthenticateToken and has id property
		const requestingUserId = req.user ? parseInt(req.user.id, 10) : null;
		const profile = await getUserProfile(userId, requestingUserId);
		res.json(profile);
	} catch (error) {
		logger.error("Get user profile error: %O", error);
		const statusCode = error.message === "User not found" ? 404 : 500;
		res
			.status(statusCode)
			.json({ error: error.message || "Failed to fetch user profile" });
	}
});

/**
 * PATCH /api/users/:id
 * Update user profile (only own profile)
 */
router.patch("/:id", authenticateToken(), async (req, res) => {
	try {
		const userId = parseInt(req.params.id, 10);
		if (isNaN(userId)) {
			return res.status(400).json({ error: "Invalid user ID" });
		}

		// Only allow users to update their own profile
		if (req.user.id !== userId) {
			return res
				.status(403)
				.json({ error: "Unauthorized: You can only update your own profile" });
		}

		const { bio, avatar_url } = req.body;
		const updates = {};

		if (bio !== undefined) {
			updates.bio = bio;
		}

		if (avatar_url !== undefined) {
			updates.avatar_url = avatar_url;
		}

		if (Object.keys(updates).length === 0) {
			return res.status(400).json({ error: "No fields to update" });
		}

		const updatedProfile = await updateUserProfile(userId, updates);
		res.json(updatedProfile);
	} catch (error) {
		logger.error("Update user profile error: %O", error);
		const statusCode = error.message === "User not found" ? 404 : 500;
		res
			.status(statusCode)
			.json({ error: error.message || "Failed to update user profile" });
	}
});

export default router;
