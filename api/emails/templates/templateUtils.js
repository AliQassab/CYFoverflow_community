// api/emails/templates/templateUtils.js

/**
 * Escape HTML special characters to prevent XSS
 */
export const escapeHtml = (text) => {
	if (!text || typeof text !== "string") {
		return "";
	}
	const map = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	};
	return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Truncate content and remove HTML tags
 */
export const truncateContent = (content, maxLength = 300) => {
	if (!content || typeof content !== "string") {
		return "";
	}

	// Remove HTML tags for truncation
	const textContent = content.replace(/<[^>]*>/g, "").trim();

	if (textContent.length <= maxLength) {
		return textContent;
	}

	return textContent.substring(0, maxLength) + "...";
};

export const formatDate = (date = new Date()) => {
	return date.toLocaleString();
};
