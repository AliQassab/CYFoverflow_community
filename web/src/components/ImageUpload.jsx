import { useState, useRef } from "react";
import { HiX, HiCloudUpload } from "react-icons/hi";

/**
 * ImageUpload component
 * Handles image upload and preview
 * @param {Object} props
 * @param {Function} props.onUpload - Callback when image is uploaded (receives file URL)
 * @param {Function} props.onRemove - Callback when image is removed
 * @param {string} props.existingImageUrl - Existing image URL to display
 * @param {string} props.token - Auth token
 */
function ImageUpload({ onUpload, onRemove, existingImageUrl = null, token }) {
	const [uploading, setUploading] = useState(false);
	const [preview, setPreview] = useState(existingImageUrl);
	const [error, setError] = useState("");
	const fileInputRef = useRef(null);

	const handleFileSelect = async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith("image/")) {
			setError("Please select an image file");
			return;
		}

		// Validate file size (10MB)
		if (file.size > 10 * 1024 * 1024) {
			setError("Image size must be less than 10MB");
			return;
		}

		setError("");
		setUploading(true);

		try {
			// Create FormData
			const formData = new FormData();
			formData.append("file", file);

			// Upload file
			const response = await fetch("/api/upload", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Upload failed");
			}

			const data = await response.json();
			if (data.success && data.file) {
				setPreview(data.file.file_url);
				if (onUpload) {
					onUpload(data.file);
				}
			}
		} catch (err) {
			setError(err.message || "Failed to upload image");
		} finally {
			setUploading(false);
			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleRemove = () => {
		setPreview(null);
		if (onRemove) {
			onRemove();
		}
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div className="space-y-2">
			{preview ? (
				<div className="relative inline-block">
					<img
						src={preview}
						alt="Preview"
						className="max-w-full h-auto max-h-64 rounded-lg border-2 border-gray-200"
					/>
					<button
						type="button"
						onClick={handleRemove}
						className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors cursor-pointer"
						aria-label="Remove image"
					>
						<HiX className="w-4 h-4" />
					</button>
				</div>
			) : (
				<div
					onClick={handleClick}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							handleClick();
						}
					}}
					role="button"
					tabIndex={0}
					className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#281d80] transition-colors"
				>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						onChange={handleFileSelect}
						className="hidden"
						disabled={uploading}
					/>
					{uploading ? (
						<div className="flex flex-col items-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#281d80] mb-2"></div>
							<p className="text-sm text-gray-600">Uploading...</p>
						</div>
					) : (
						<div className="flex flex-col items-center">
							<HiCloudUpload className="w-8 h-8 text-gray-400 mb-2" />
							<p className="text-sm text-gray-600">Click to upload an image</p>
							<p className="text-xs text-gray-400 mt-1">
								PNG, JPG, GIF up to 10MB
							</p>
						</div>
					)}
				</div>
			)}

			{error && (
				<div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-2 rounded text-sm">
					{error}
				</div>
			)}
		</div>
	);
}

export default ImageUpload;
