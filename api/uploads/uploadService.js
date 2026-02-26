/**
 * File upload service
 * Handles file processing, optimization, and storage
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";

import logger from "../utils/logger.js";

import {
	STORAGE_TYPE,
	UPLOAD_DIR,
	MAX_FILE_SIZE,
	ALLOWED_IMAGE_TYPES,
	ALLOWED_FILE_TYPES,
	IMAGE_SETTINGS,
	getFileUrl,
} from "./uploadConfig.js";
import * as repository from "./uploadRepository.js";

// Dynamic import for sharp (image processing)
let sharp = null;
try {
	const sharpModule = await import("sharp");
	sharp = sharpModule.default;
} catch {
	// Sharp is optional - image optimization will be disabled if not installed
}

/**
 * Generate a unique filename
 * @param {string} originalFilename - Original filename
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalFilename) => {
	const ext = path.extname(originalFilename);
	const randomString = crypto.randomBytes(16).toString("hex");
	const timestamp = Date.now();
	return `${timestamp}-${randomString}${ext}`;
};

/**
 * Process and optimize image
 * @param {Buffer} buffer - Image buffer
 * @param {string} mimeType - MIME type
 * @returns {Promise<Object>} Processed image data
 */
const processImage = async (buffer, mimeType) => {
	if (!sharp) {
		return { buffer, width: null, height: null };
	}

	try {
		const image = sharp(buffer);
		const metadata = await image.metadata();

		// Resize if too large
		let processedImage = image;
		if (
			metadata.width > IMAGE_SETTINGS.maxWidth ||
			metadata.height > IMAGE_SETTINGS.maxHeight
		) {
			processedImage = image.resize(
				IMAGE_SETTINGS.maxWidth,
				IMAGE_SETTINGS.maxHeight,
				{
					fit: "inside",
					withoutEnlargement: true,
				},
			);
		}

		// Optimize based on format
		let optimizedBuffer;
		if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
			optimizedBuffer = await processedImage
				.jpeg({ quality: IMAGE_SETTINGS.quality })
				.toBuffer();
		} else if (mimeType === "image/png") {
			optimizedBuffer = await processedImage
				.png({ quality: IMAGE_SETTINGS.quality })
				.toBuffer();
		} else if (mimeType === "image/webp") {
			optimizedBuffer = await processedImage
				.webp({ quality: IMAGE_SETTINGS.quality })
				.toBuffer();
		} else {
			optimizedBuffer = await processedImage.toBuffer();
		}

		// Generate thumbnail
		const thumbnailBuffer = await image
			.resize(IMAGE_SETTINGS.thumbnailWidth, IMAGE_SETTINGS.thumbnailHeight, {
				fit: "cover",
			})
			.jpeg({ quality: IMAGE_SETTINGS.thumbnailQuality })
			.toBuffer();

		const finalMetadata = await sharp(optimizedBuffer).metadata();

		return {
			buffer: optimizedBuffer,
			thumbnailBuffer,
			width: finalMetadata.width,
			height: finalMetadata.height,
		};
	} catch (error) {
		logger.error("Error processing image", { error: error.message });
		return { buffer, width: null, height: null };
	}
};

/**
 * Save file to local storage
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Filename
 * @param {string} subdir - Subdirectory (optional)
 * @returns {Promise<string>} File path
 */
const saveToLocal = async (buffer, filename, subdir = "") => {
	const dir = subdir ? path.join(UPLOAD_DIR, subdir) : UPLOAD_DIR;
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	const filePath = path.join(dir, filename);
	await fs.promises.writeFile(filePath, buffer);
	return filePath;
};

/**
 * Upload a file
 * @param {Object} file - Multer file object
 * @param {number} userId - User ID
 * @returns {Promise<Object>} File upload record
 */
export const uploadFile = async (file, userId) => {
	try {
		// Validate file
		if (!file) {
			throw new Error("No file provided");
		}

		if (file.size > MAX_FILE_SIZE) {
			throw new Error(
				`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
			);
		}

		if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
			throw new Error(`File type ${file.mimetype} is not allowed`);
		}

		const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
		const fileType = isImage ? "image" : "file";

		// Generate unique filename
		const storedFilename = generateUniqueFilename(file.originalname);
		let fileBuffer = file.buffer;
		let width = null;
		let height = null;
		let thumbnailPath = null;
		let thumbnailUrl = null;

		// Process image if applicable
		if (isImage && sharp) {
			const processed = await processImage(file.buffer, file.mimetype);
			fileBuffer = processed.buffer;
			width = processed.width;
			height = processed.height;

			// Save thumbnail
			if (processed.thumbnailBuffer) {
				const thumbnailFilename = `thumb-${storedFilename}`;
				thumbnailPath = await saveToLocal(
					processed.thumbnailBuffer,
					thumbnailFilename,
					"thumbnails",
				);
				thumbnailUrl = getFileUrl(thumbnailPath);
			}
		}

		// Save file
		const filePath = await saveToLocal(fileBuffer, storedFilename);
		const fileUrl = getFileUrl(filePath);

		const fileRecord = await repository.createFileUploadDB({
			user_id: userId,
			original_filename: file.originalname,
			stored_filename: storedFilename,
			file_path: filePath,
			file_url: fileUrl,
			mime_type: file.mimetype,
			file_size: fileBuffer.length,
			file_type: fileType,
			width,
			height,
			thumbnail_path: thumbnailPath,
			thumbnail_url: thumbnailUrl,
		});

		return fileRecord;
	} catch (error) {
		if (error.code === "42P01") {
			throw new Error(
				"file_uploads table does not exist. Please run migrations: npm run migration up",
			);
		}
		logger.error("Error uploading file", {
			error: error.message,
			errorCode: error.code,
			userId,
		});
		throw error;
	}
};

/**
 * Delete a file upload
 * @param {number} fileId - File upload ID
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if deleted
 */
export const deleteFile = async (fileId, userId) => {
	try {
		const fileRecord = await repository.getFileUploadByIdDB(fileId);
		if (!fileRecord) {
			throw new Error("File not found");
		}

		if (fileRecord.user_id !== userId) {
			throw new Error("Unauthorized to delete this file");
		}

		// Delete physical files
		if (STORAGE_TYPE === "local") {
			try {
				if (fs.existsSync(fileRecord.file_path)) {
					await fs.promises.unlink(fileRecord.file_path);
				}
				if (
					fileRecord.thumbnail_path &&
					fs.existsSync(fileRecord.thumbnail_path)
				) {
					await fs.promises.unlink(fileRecord.thumbnail_path);
				}
			} catch (error) {
				logger.warn("Error deleting physical file", {
					error: error.message,
					filePath: fileRecord.file_path,
				});
			}
		}

		// Soft delete database record
		const deleted = await repository.deleteFileUploadDB(fileId, userId);
		return deleted;
	} catch (error) {
		logger.error("Error deleting file", {
			error: error.message,
			fileId,
			userId,
		});
		throw error;
	}
};
