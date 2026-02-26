import db from "../db.js";
import logger from "../utils/logger.js";

/**
 * Update user reputation
 * @param {number} userId - User ID
 * @param {number} points - Points to add (can be negative)
 * @returns {Promise<number>} New reputation value
 */
export const updateReputationDB = async (userId, points) => {
	try {
		const result = await db.query(
			`UPDATE users 
			 SET reputation = GREATEST(0, reputation + $1), updated_at = NOW()
			 WHERE id = $2
			 RETURNING reputation`,
			[points, userId],
		);

		if (result.rows.length === 0) {
			throw new Error(`User ${userId} not found`);
		}

		return parseInt(result.rows[0].reputation, 10);
	} catch (error) {
		logger.error("Error updating reputation in database", {
			userId,
			points,
			error: error.message,
		});
		throw error;
	}
};

/**
 * Get user reputation
 * @param {number} userId - User ID
 * @returns {Promise<number>} User's reputation (defaults to 0 if not found)
 */
export const getUserReputationDB = async (userId) => {
	try {
		const result = await db.query(
			`SELECT COALESCE(reputation, 0) as reputation FROM users WHERE id = $1`,
			[userId],
		);

		if (result.rows.length === 0) {
			return 0;
		}

		return parseInt(result.rows[0].reputation, 10);
	} catch (error) {
		logger.error("Error getting user reputation", {
			userId,
			error: error.message,
		});
		return 0;
	}
};

/**
 * Get top users by reputation (for leaderboard)
 * @param {number} limit - Number of users to return
 * @returns {Promise<Array>} Array of users with reputation
 */
export const getTopUsersByReputationDB = async (limit = 10) => {
	try {
		const result = await db.query(
			`SELECT id, name, email, reputation, avatar_url, bio
			 FROM users
			 WHERE deleted_at IS NULL AND is_active = true
			 ORDER BY reputation DESC, created_at ASC
			 LIMIT $1`,
			[limit],
		);

		return result.rows.map((row) => ({
			...row,
			reputation: parseInt(row.reputation, 10) || 0,
		}));
	} catch (error) {
		logger.error("Error getting top users by reputation", {
			limit,
			error: error.message,
		});
		throw error;
	}
};
