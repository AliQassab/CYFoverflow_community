/**
 * Password reset router
 * Handles password reset endpoints
 */

import express from "express";
import Joi from "joi";

import { sensitiveLimiter } from "../utils/rateLimiter.js";
import validate from "../utils/validation.js";

import * as service from "./passwordResetService.js";


const router = express.Router();

// Validation schemas
const forgotPasswordSchema = Joi.object({
	email: Joi.string().email().required().trim(),
});

const resetPasswordSchema = Joi.object({
	token: Joi.string().required().trim(),
	password: Joi.string()
		.min(8)
		.max(128)
		.pattern(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
		)
		.required()
		.messages({
			"string.pattern.base":
				"Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
		}),
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post(
	"/forgot-password",
	sensitiveLimiter,
	validate(forgotPasswordSchema),
	async (req, res) => {
		try {
			const { email } = req.body;
			const result = await service.requestPasswordReset(email);
			res.status(200).json(result);
		} catch {
			res.status(500).json({
				success: false,
				message: "Failed to process password reset request.",
			});
		}
	},
);

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post(
	"/reset-password",
	sensitiveLimiter,
	validate(resetPasswordSchema),
	async (req, res) => {
		try {
			const { token, password } = req.body;
			const result = await service.resetPassword(token, password);

			if (result.success) {
				res.status(200).json(result);
			} else {
				res.status(400).json(result);
			}
		} catch {
			res.status(500).json({
				success: false,
				message: "Failed to reset password.",
			});
		}
	},
);

export default router;
