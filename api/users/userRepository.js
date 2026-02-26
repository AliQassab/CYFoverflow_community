import db from "../db.js";
import logger from "../utils/logger.js";

/**
 * Get user profile by ID with all profile fields
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} User profile or null if not found
 */
export const getUserProfileByIdDB = async (userId) => {
	try {
		const result = await db.query(
			`SELECT 
				id, 
				name, 
				email, 
				bio, 
				avatar_url, 
				is_active, 
				is_email_verified,
				COALESCE(reputation, 0) as reputation,
				created_at, 
				updated_at, 
				last_login_at
			FROM users 
			WHERE id = $1 AND deleted_at IS NULL`,
			[userId],
		);
		return result.rows[0] || null;
	} catch (error) {
		logger.error("Error getting user profile:", error);
		throw error;
	}
};

/**
 * Get user statistics (questions, answers, votes, comments counts)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User statistics
 */
export const getUserStatsDB = async (userId) => {
	try {
		const result = await db.query(
			`SELECT 
				-- Questions count
				(SELECT COUNT(*)::integer 
				 FROM questions 
				 WHERE user_id = $1 AND deleted_at IS NULL) as questions_count,
				
				-- Answers count
				(SELECT COUNT(*)::integer 
				 FROM answers 
				 WHERE user_id = $1 AND deleted_at IS NULL) as answers_count,
				
				-- Total upvotes received on answers
				(SELECT COUNT(*)::integer 
				 FROM votes v
				 JOIN answers a ON v.answer_id = a.id
				 WHERE a.user_id = $1 AND a.deleted_at IS NULL AND v.vote_type = 'upvote') as total_upvotes_received,
				
				-- Total downvotes received on answers
				(SELECT COUNT(*)::integer 
				 FROM votes v
				 JOIN answers a ON v.answer_id = a.id
				 WHERE a.user_id = $1 AND a.deleted_at IS NULL AND v.vote_type = 'downvote') as total_downvotes_received,
				
				-- Comments count
				(SELECT COUNT(*)::integer 
				 FROM comments 
				 WHERE user_id = $1 AND deleted_at IS NULL) as comments_count,
				
				-- Accepted answers count
				(SELECT COUNT(*)::integer 
				 FROM answers 
				 WHERE user_id = $1 AND is_accepted = true AND deleted_at IS NULL) as accepted_answers_count`,
			[userId],
		);
		return result.rows[0];
	} catch (error) {
		logger.error("Error getting user stats:", error);
		throw error;
	}
};

/**
 * Update user profile
 * @param {number} userId - User ID
 * @param {Object} updates - Fields to update
 * @param {string} [updates.bio] - User bio
 * @param {string} [updates.avatar_url] - Avatar URL
 * @returns {Promise<Object>} Updated user profile
 */
export const updateUserProfileDB = async (userId, { bio, avatar_url }) => {
	try {
		const updates = [];
		const values = [];
		let paramIndex = 1;

		if (bio !== undefined) {
			updates.push(`bio = $${paramIndex++}`);
			values.push(bio);
		}

		if (avatar_url !== undefined) {
			updates.push(`avatar_url = $${paramIndex++}`);
			values.push(avatar_url);
		}

		if (updates.length === 0) {
			// No updates, just return current profile
			return await getUserProfileByIdDB(userId);
		}

		values.push(userId);

		const result = await db.query(
			`UPDATE users 
			 SET ${updates.join(", ")}, updated_at = NOW()
			 WHERE id = $${paramIndex} AND deleted_at IS NULL
			 RETURNING id, name, email, bio, avatar_url, created_at, updated_at`,
			values,
		);

		if (result.rows.length === 0) {
			throw new Error("User not found");
		}

		return result.rows[0];
	} catch (error) {
		logger.error("Error updating user profile:", error);
		throw error;
	}
};
