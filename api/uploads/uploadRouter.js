/**
 * File upload router
 * Handles file upload endpoints
 */

import express from "express";
import multer from "multer";

import { authenticateToken } from "../utils/auth.js";
import logger from "../utils/logger.js";
import { generalLimiter } from "../utils/rateLimiter.js";

import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "./uploadConfig.js";
import * as uploadService from "./uploadService.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
	storage,
	limits: {
		fileSize: MAX_FILE_SIZE,
	},
	fileFilter: (req, file, cb) => {
		if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new Error(`File type ${file.mimetype} is not allowed`), false);
		}
	},
});

/**
 * POST /api/upload
 * Upload a file (image or other file type)
 */
router.post(
	"/",
	generalLimiter,
	upload.single("file"),
	authenticateToken(),
	async (req, res) => {
		try {
			if (!req.file) {
				return res.status(400).json({
					success: false,
					message: "No file provided",
				});
			}

			if (!req.user) {
				return res.status(401).json({
					success: false,
					message: "Authentication required",
				});
			}

			const userId = req.user.id;
			const fileRecord = await uploadService.uploadFile(req.file, userId);

			res.status(201).json({
				success: true,
				file: {
					id: fileRecord.id,
					original_filename: fileRecord.original_filename,
					file_url: fileRecord.file_url,
					thumbnail_url: fileRecord.thumbnail_url,
					mime_type: fileRecord.mime_type,
					file_size: fileRecord.file_size,
					file_type: fileRecord.file_type,
					width: fileRecord.width,
					height: fileRecord.height,
					created_at: fileRecord.created_at,
				},
			});
		} catch (error) {
			logger.error("File upload error", {
				error: error.message,
				errorCode: error.code,
				userId: req.user?.id,
			});

			if (!res.headersSent) {
				res.status(400).json({
					success: false,
					message: error.message || "Failed to upload file",
				});
			}
		}
	},
);

router.use((err, req, res, next) => {
	if (err instanceof multer.MulterError) {
		if (!res.headersSent) {
			return res.status(400).json({
				success: false,
				message: `Upload error: ${err.message}`,
			});
		}
		return;
	}
	if (err && !res.headersSent) {
		return res.status(400).json({
			success: false,
			message: err.message || "File upload failed",
		});
	}
	next(err);
});

/**
 * DELETE /api/upload/:id
 * Delete a file upload
 */
router.delete("/:id", generalLimiter, authenticateToken, async (req, res) => {
	try {
		const fileId = parseInt(req.params.id, 10);
		const userId = req.user.id;

		if (isNaN(fileId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid file ID",
			});
		}

		const deleted = await uploadService.deleteFile(fileId, userId);
		if (!deleted) {
			return res.status(404).json({
				success: false,
				message: "File not found or unauthorized",
			});
		}

		res.status(200).json({
			success: true,
			message: "File deleted successfully",
		});
	} catch (error) {
		logger.error("File deletion error", {
			error: error.message,
			fileId: req.params.id,
			userId: req.user?.id,
		});
		res.status(400).json({
			success: false,
			message: error.message || "Failed to delete file",
		});
	}
});

export default router;
