# File Upload System

## Overview

The file upload system allows users to upload images and files that can be embedded in questions and answers. Images are automatically optimized and thumbnails are generated.

## Features

- ✅ Image upload with automatic optimization (resize, compress)
- ✅ Thumbnail generation for images
- ✅ Support for multiple file types (images, text files, code snippets)
- ✅ Local storage (development) and S3 storage (production) support
- ✅ File size validation (10MB max)
- ✅ File type validation
- ✅ Secure file storage with unique filenames
- ✅ Integration with TinyMCE editor (drag & drop image upload)

## Database Schema

The `file_uploads` table stores metadata for all uploaded files:

- `id` - Primary key
- `user_id` - Owner of the file
- `original_filename` - Original filename
- `stored_filename` - Unique stored filename
- `file_path` - Physical file path (local) or S3 key
- `file_url` - Public URL to access the file
- `mime_type` - File MIME type
- `file_size` - File size in bytes
- `file_type` - Type: 'image' or 'file'
- `width`, `height` - Image dimensions (for images)
- `thumbnail_path`, `thumbnail_url` - Thumbnail paths (for images)
- `created_at` - Upload timestamp
- `deleted_at` - Soft delete timestamp

## API Endpoints

### POST /api/upload

Upload a file.

**Authentication:** Required

**Request:**

- `multipart/form-data`
- Field name: `file`

**Response:**

```json
{
	"success": true,
	"file": {
		"id": 1,
		"original_filename": "screenshot.png",
		"file_url": "/uploads/1234567890-abc123.png",
		"thumbnail_url": "/uploads/thumbnails/thumb-1234567890-abc123.png",
		"mime_type": "image/png",
		"file_size": 123456,
		"file_type": "image",
		"width": 1920,
		"height": 1080,
		"created_at": "2025-01-17T12:00:00Z"
	}
}
```

### DELETE /api/upload/:id

Delete an uploaded file.

**Authentication:** Required (only owner can delete)

**Response:**

```json
{
	"success": true,
	"message": "File deleted successfully"
}
```

## Configuration

### Environment Variables

- `STORAGE_TYPE` - Storage type: `"local"` (default) or `"s3"`
- `UPLOAD_DIR` - Local upload directory (default: `api/uploads`)
- `APP_URL` - Base URL for file access
- `S3_BASE_URL` - S3 bucket URL (if using S3)

### Image Optimization Settings

Configured in `uploadConfig.js`:

- Max dimensions: 1920x1920px
- Quality: 85%
- Thumbnail size: 300x300px
- Thumbnail quality: 70%

## Usage

### In TinyMCE Editor

Images can be uploaded directly in the TinyMCE editor:

1. Click the image button in the toolbar
2. Select "Upload" tab
3. Choose an image file
4. Image is automatically uploaded and inserted

### Programmatic Upload

```javascript
import { uploadFile } from "../services/api";

const file = event.target.files[0];
const result = await uploadFile(file, token);
console.log(result.file.file_url); // Use this URL in content
```

## File Storage

### Local Storage (Development)

Files are stored in `api/uploads/` directory:

- Original files: `api/uploads/`
- Thumbnails: `api/uploads/thumbnails/`

Files are served statically via `/uploads/` route.

### S3 Storage (Production)

When `STORAGE_TYPE=s3`, files are uploaded to AWS S3:

- Requires AWS credentials
- Files are stored with unique keys
- URLs point to S3 bucket

## Security

- ✅ File type validation (whitelist)
- ✅ File size limits (10MB)
- ✅ Authentication required
- ✅ User can only delete their own files
- ✅ Unique filenames prevent conflicts
- ✅ Soft delete (files marked as deleted, not removed immediately)

## Future Enhancements

- [ ] S3 integration for production
- [ ] Image cropping/editing
- [ ] Batch upload
- [ ] File expiration/cleanup
- [ ] CDN integration
- [ ] Video upload support
