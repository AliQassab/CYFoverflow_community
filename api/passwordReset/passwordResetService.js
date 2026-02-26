/**
 * Password reset service
 * Handles password reset token generation, validation, and password updates
 */

import bcrypt from "bcrypt";

import * as authRepository from "../auth/authRepository.js";
import emailService from "../emails/emailService.js";
import * as accountLockout from "../utils/accountLockout.js";
import config from "../utils/config.js";
import logger from "../utils/logger.js";

import * as repository from "./passwordResetRepository.js";

// Password reset token expires in 1 hour
const RESET_TOKEN_EXPIRY_HOURS = 1;

/**
 * Request password reset (forgot password)
 * @param {string} email - User email
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const requestPasswordReset = async (email) => {
	try {
		const normalizedEmail = email.toLowerCase().trim();

		// Find user by email
		const user = await authRepository.findUserByEmail(normalizedEmail);

		// Always return success message (don't reveal if email exists)
		if (!user) {
			// Return success to prevent email enumeration
			return {
				success: true,
				message:
					"If an account with that email exists, a password reset link has been sent.",
			};
		}

		// Generate reset token
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

		const resetToken = await repository.createPasswordResetTokenDB(
			user.id,
			expiresAt,
		);

		// Build reset URL
		const resetUrl = `${config.appUrl}/reset-password?token=${resetToken}`;

		// Send password reset email (non-blocking)
		emailService
			.sendPasswordResetEmail({
				userEmail: user.email,
				userName: user.name,
				resetToken,
				resetUrl,
			})
			.then((result) => {
				if (result.success) {
					logger.info("Password reset email sent", {
						userId: user.id,
						email: user.email,
					});
				} else {
					logger.warn("Password reset email failed", {
						userId: user.id,
						error: result.error,
					});
				}
			})
			.catch((error) => {
				logger.error("Error sending password reset email", {
					userId: user.id,
					error: error.message,
				});
			});

		return {
			success: true,
			message:
				"If an account with that email exists, a password reset link has been sent.",
		};
	} catch (error) {
		logger.error("Error requesting password reset", {
			error: error.message,
			email,
		});
		// Return generic success to prevent information leakage
		return {
			success: true,
			message:
				"If an account with that email exists, a password reset link has been sent.",
		};
	}
};

/**
 * Reset password using token
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const resetPassword = async (token, newPassword) => {
	try {
		// Validate token
		const tokenData = await repository.findPasswordResetTokenDB(token);
		if (!tokenData) {
			return {
				success: false,
				message:
					"Invalid or expired reset token. Please request a new password reset.",
			};
		}

		// Validate password strength (same as signup)
		if (!newPassword || newPassword.length < 8) {
			return {
				success: false,
				message: "Password must be at least 8 characters long.",
			};
		}

		// Hash new password
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		// Update user password
		await authRepository.updateUserPasswordDB(
			tokenData.user_id,
			hashedPassword,
		);

		// Mark token as used
		await repository.markTokenAsUsedDB(token);

		// Clear account lockout (user can now login with new password)
		await accountLockout.clearFailedAttempts(tokenData.email);

		logger.info("Password reset successful", {
			userId: tokenData.user_id,
			email: tokenData.email,
		});

		return {
			success: true,
			message:
				"Password has been reset successfully. You can now log in with your new password.",
		};
	} catch (error) {
		logger.error("Error resetting password", {
			error: error.message,
		});
		return {
			success: false,
			message:
				"Failed to reset password. Please try again or request a new reset link.",
		};
	}
};
