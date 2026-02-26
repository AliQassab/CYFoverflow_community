import db from "../db.js";
import logger from "../utils/logger.js";

export async function findUserByEmail(email) {
	try {
		const result = await db.query("SELECT * FROM users WHERE email = $1", [
			email,
		]);
		return result.rows[0];
	} catch (error) {
		logger.error("Error finding user by email: %O", error);
		throw error;
	}
}

export async function createUser(name, email, hashedPassword) {
	try {
		const result = await db.query(
			"INSERT INTO users (name, email, hashed_password) VALUES ($1, $2, $3) RETURNING id, name, email",
			[name, email, hashedPassword],
		);
		return result.rows[0];
	} catch (error) {
		logger.error("Error creating user: %O", error);
		throw error;
	}
}

export async function findUserById(id) {
	try {
		const result = await db.query(
			"SELECT id, name, email FROM users WHERE id = $1",
			[id],
		);
		return result.rows[0];
	} catch (error) {
		logger.error("Error finding user by id: %O", error);
		throw error;
	}
}

/**
 * Update user password
 * @param {number} userId - User ID
 * @param {string} hashedPassword - New hashed password
 */
export async function updateUserPasswordDB(userId, hashedPassword) {
	try {
		await db.query(
			`UPDATE users 
			 SET hashed_password = $1, updated_at = NOW()
			 WHERE id = $2`,
			[hashedPassword, userId],
		);
	} catch (error) {
		logger.error("Error updating user password: %O", error);
		throw error;
	}
}

/**
 * Get all active users (for notifications)
 * @returns {Promise<Array>} Array of user objects with id
 */
export async function getAllUsers() {
	try {
		const result = await db.query(
			`SELECT id FROM users 
			 WHERE (deleted_at IS NULL)
			 AND (is_active IS NULL OR is_active = true)`,
		);
		return result.rows;
	} catch (error) {
		logger.error("Error getting all users: %O", error);
		throw error;
	}
}
