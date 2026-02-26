/**
 * File upload repository
 * Handles database operations for file uploads
 */

import db from "../db.js";
import logger from "../utils/logger.js";

/**
 * Create a file upload record
 * @param {Object} fileData - File metadata
 * @returns {Promise<Object>} Created file record
 */
export const createFileUploadDB = async (fileData) => {
	try {
		const {
			user_id,
			original_filename,
			stored_filename,
			file_path,
			file_url,
			mime_type,
			file_size,
			file_type = "image",
			width = null,
			height = null,
			thumbnail_path = null,
			thumbnail_url = null,
		} = fileData;

		const result = await db.query(
			`INSERT INTO file_uploads (
				user_id, original_filename, stored_filename, file_path, file_url,
				mime_type, file_size, file_type, width, height,
				thumbnail_path, thumbnail_url
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			RETURNING *`,
			[
				user_id,
				original_filename,
				stored_filename,
				file_path,
				file_url,
				mime_type,
				file_size,
				file_type,
				width,
				height,
				thumbnail_path,
				thumbnail_url,
			],
		);

		return result.rows[0];
	} catch (error) {
		logger.error("Error creating file upload record", {
			error: error.message,
			errorCode: error.code,
		});
		throw error;
	}
};

/**
 * Get file upload by ID
 * @param {number} fileId - File upload ID
 * @returns {Promise<Object|null>} File record or null
 */
export const getFileUploadByIdDB = async (fileId) => {
	try {
		const result = await db.query(
			`SELECT * FROM file_uploads 
			 WHERE id = $1 AND deleted_at IS NULL`,
			[fileId],
		);
		return result.rows[0] || null;
	} catch (error) {
		logger.error("Error getting file upload by ID", {
			error: error.message,
			fileId,
		});
		return null;
	}
};

/**
 * Get file uploads by user ID
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of file records
 */
export const getFileUploadsByUserIdDB = async (userId, options = {}) => {
	try {
		const { limit = 50, offset = 0, file_type = null } = options;
		let query = `SELECT * FROM file_uploads 
					 WHERE user_id = $1 AND deleted_at IS NULL`;
		const params = [userId];
		let paramIndex = 2;

		if (file_type) {
			query += ` AND file_type = $${paramIndex}`;
			params.push(file_type);
			paramIndex++;
		}

		query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
		params.push(limit, offset);

		const result = await db.query(query, params);
		return result.rows;
	} catch (error) {
		logger.error("Error getting file uploads by user ID", {
			error: error.message,
			userId,
		});
		return [];
	}
};

/**
 * Soft delete a file upload
 * @param {number} fileId - File upload ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<boolean>} True if deleted
 */
export const deleteFileUploadDB = async (fileId, userId) => {
	try {
		const result = await db.query(
			`UPDATE file_uploads 
			 SET deleted_at = NOW() 
			 WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
			 RETURNING id`,
			[fileId, userId],
		);
		return result.rows.length > 0;
	} catch (error) {
		logger.error("Error deleting file upload", {
			error: error.message,
			fileId,
			userId,
		});
		return false;
	}
};
