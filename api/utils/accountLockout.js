/**
 * Account lockout mechanism to prevent brute force attacks
 */

import db from "../db.js";

import logger from "./logger.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Record a failed login attempt
 * @param {string} email - User email
 * @param {string} ipAddress - IP address
 * @returns {Promise<{locked: boolean, remainingAttempts: number}>}
 */
export const recordFailedAttempt = async (email, ipAddress) => {
	try {
		const normalizedEmail = email.toLowerCase().trim();
		const now = new Date();

		// Check existing attempts
		const result = await db.query(
			`SELECT failed_attempts, locked_until 
			 FROM users 
			 WHERE email = $1`,
			[normalizedEmail],
		);

		if (result.rows.length === 0) {
			// User doesn't exist - don't reveal this
			return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS };
		}

		const user = result.rows[0];
		const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;

		// Check if account is still locked
		if (lockedUntil && lockedUntil > now) {
			const minutesRemaining = Math.ceil((lockedUntil - now) / 1000 / 60);
			logger.warn("Login attempt on locked account", {
				email: normalizedEmail,
				ipAddress,
				minutesRemaining,
			});
			return {
				locked: true,
				remainingAttempts: 0,
				lockoutMinutes: minutesRemaining,
			};
		}

		// Reset if lockout expired
		let failedAttempts =
			lockedUntil && lockedUntil <= now ? 0 : user.failed_attempts || 0;
		failedAttempts += 1;

		let lockedUntilDate = null;
		if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
			lockedUntilDate = new Date(
				now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000,
			);
			logger.warn("Account locked due to failed login attempts", {
				email: normalizedEmail,
				ipAddress,
				failedAttempts,
				lockedUntil: lockedUntilDate,
			});
		}

		// Update failed attempts
		await db.query(
			`UPDATE users 
			 SET failed_attempts = $1, 
			     locked_until = $2,
			     updated_at = NOW()
			 WHERE email = $3`,
			[failedAttempts, lockedUntilDate, normalizedEmail],
		);

		const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts);

		return {
			locked: failedAttempts >= MAX_FAILED_ATTEMPTS,
			remainingAttempts,
			lockoutMinutes:
				failedAttempts >= MAX_FAILED_ATTEMPTS ? LOCKOUT_DURATION_MINUTES : null,
		};
	} catch (error) {
		logger.error("Error recording failed login attempt", {
			error: error.message,
			email,
		});
		// Don't block login on error - fail open
		return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS };
	}
};

/**
 * Clear failed attempts on successful login
 * @param {string} email - User email
 */
export const clearFailedAttempts = async (email) => {
	try {
		const normalizedEmail = email.toLowerCase().trim();
		await db.query(
			`UPDATE users 
			 SET failed_attempts = 0, 
			     locked_until = NULL,
			     updated_at = NOW()
			 WHERE email = $1`,
			[normalizedEmail],
		);
	} catch (error) {
		logger.error("Error clearing failed attempts", {
			error: error.message,
			email,
		});
		// Non-critical error
	}
};

/**
 * Check if account is locked
 * @param {string} email - User email
 * @returns {Promise<{locked: boolean, lockoutMinutes?: number}>}
 */
export const checkAccountLocked = async (email) => {
	try {
		const normalizedEmail = email.toLowerCase().trim();
		const result = await db.query(
			`SELECT locked_until FROM users WHERE email = $1`,
			[normalizedEmail],
		);

		if (result.rows.length === 0) {
			return { locked: false };
		}

		const lockedUntil = result.rows[0].locked_until;
		if (!lockedUntil) {
			return { locked: false };
		}

		const now = new Date();
		const lockoutDate = new Date(lockedUntil);

		if (lockoutDate > now) {
			const minutesRemaining = Math.ceil((lockoutDate - now) / 1000 / 60);
			return { locked: true, lockoutMinutes: minutesRemaining };
		}

		// Lockout expired - clear it
		await db.query(
			`UPDATE users SET locked_until = NULL, failed_attempts = 0 WHERE email = $1`,
			[normalizedEmail],
		);

		return { locked: false };
	} catch (error) {
		logger.error("Error checking account lock status", {
			error: error.message,
			email,
		});
		return { locked: false };
	}
};
