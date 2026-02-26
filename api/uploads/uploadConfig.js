/**
 * File upload configuration
 * Supports local storage (development) and S3 (production)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import config from "../utils/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage configuration
export const STORAGE_TYPE = config.storageType;
export const UPLOAD_DIR =
	config.uploadDir || path.join(__dirname, "..", "uploads");
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/gif",
	"image/webp",
];
export const ALLOWED_FILE_TYPES = [
	...ALLOWED_IMAGE_TYPES,
	"text/plain",
	"text/markdown",
	"application/json",
	"text/javascript",
	"text/css",
	"text/html",
];

// Image optimization settings
export const IMAGE_SETTINGS = {
	maxWidth: 1920,
	maxHeight: 1920,
	quality: 85,
	thumbnailWidth: 300,
	thumbnailHeight: 300,
	thumbnailQuality: 70,
};

// Ensure upload directory exists
if (STORAGE_TYPE === "local") {
	if (!fs.existsSync(UPLOAD_DIR)) {
		fs.mkdirSync(UPLOAD_DIR, { recursive: true });
	}
	if (!fs.existsSync(path.join(UPLOAD_DIR, "thumbnails"))) {
		fs.mkdirSync(path.join(UPLOAD_DIR, "thumbnails"), { recursive: true });
	}
}

// Base URL for file access
export const getBaseUrl = () => {
	if (STORAGE_TYPE === "s3") {
		return (
			config.s3BaseUrl ||
			config.appUrl ||
			"https://cyfoverflow.hosting.codeyourfuture.io"
		);
	}
	return config.appUrl || "http://localhost:3100";
};

// File URL generator
export const getFileUrl = (filePath) => {
	if (STORAGE_TYPE === "s3") {
		// S3 URLs will be stored in the database
		return filePath;
	}
	// Local storage: return relative URL
	// File path is absolute (e.g., /path/to/api/uploads/filename.jpg)
	// Static files are served from /uploads (mapped to api/uploads directory)
	const filename = path.basename(filePath);
	const dirname = path.dirname(filePath);

	// Check if it's a thumbnail (path contains "thumbnails")
	if (dirname.includes("thumbnails")) {
		return `/uploads/thumbnails/${filename}`;
	}

	// Regular file - just return /uploads/filename
	return `/uploads/${filename}`;
};
