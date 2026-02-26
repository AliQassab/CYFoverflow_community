/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows safe HTML tags but removes dangerous scripts and attributes
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
export const sanitizeHtml = (html) => {
	if (!html || typeof html !== "string") {
		return "";
	}

	// List of allowed HTML tags (for rich text editor content)
	const allowedTags = new Set([
		"p",
		"br",
		"strong",
		"em",
		"u",
		"s",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		"ul",
		"ol",
		"li",
		"blockquote",
		"code",
		"pre",
		"a",
		"img",
		"table",
		"thead",
		"tbody",
		"tr",
		"th",
		"td",
		"div",
		"span",
		"hr",
	]);

	// List of allowed attributes per tag
	const allowedAttributes = {
		a: ["href", "title", "target"],
		img: ["src", "alt", "title", "width", "height"],
		code: ["class"],
		pre: ["class"],
		div: ["class"],
		span: ["class"],
	};

	// Remove script tags and event handlers
	let sanitized = html
		// Remove script tags and their content
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
		// Remove event handlers (onclick, onerror, etc.)
		.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
		.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "")
		// Remove javascript: protocol
		.replace(/javascript:/gi, "")
		// Remove data: URLs in img src (can be used for XSS)
		.replace(/src\s*=\s*["']data:/gi, 'src="#"')
		// Remove iframe tags
		.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
		// Remove object/embed tags
		.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
		.replace(/<embed\b[^<]*>/gi, "");

	// Basic tag filtering - keep only allowed tags
	// This is a simplified version - for production, consider using DOMPurify library
	const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
	sanitized = sanitized.replace(tagRegex, (match, tagName) => {
		const lowerTag = tagName.toLowerCase();
		if (allowedTags.has(lowerTag)) {
			const attrs = allowedAttributes[lowerTag] || [];

			// Extract and validate attributes
			const attrRegex = /(\w+)\s*=\s*["']([^"']*)["']/gi;
			const safeAttrs = [];
			let attrMatch;

			while ((attrMatch = attrRegex.exec(match)) !== null) {
				const [, attrName, attrValue] = attrMatch;
				if (attrs.includes(attrName.toLowerCase())) {
					// Validate href URLs
					if (attrName.toLowerCase() === "href") {
						const url = attrValue.trim();
						if (
							url.startsWith("http://") ||
							url.startsWith("https://") ||
							url.startsWith("/") ||
							url.startsWith("#")
						) {
							safeAttrs.push(`${attrName}="${attrValue}"`);
						}
					} else if (attrName.toLowerCase() === "src") {
						// Only allow http/https URLs or relative paths
						const url = attrValue.trim();
						if (
							url.startsWith("http://") ||
							url.startsWith("https://") ||
							url.startsWith("/")
						) {
							safeAttrs.push(`${attrName}="${attrValue}"`);
						}
					} else {
						safeAttrs.push(`${attrName}="${attrValue}"`);
					}
				}
			}

			const attrsStr = safeAttrs.length > 0 ? ` ${safeAttrs.join(" ")}` : "";
			return match.startsWith("</")
				? `</${lowerTag}>`
				: `<${lowerTag}${attrsStr}>`;
		}
		return ""; // Remove disallowed tags
	});

	return sanitized.trim();
};

/**
 * Sanitize plain text input
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export const sanitizeText = (text) => {
	if (!text || typeof text !== "string") {
		return "";
	}

	return text
		.replace(/[<>]/g, "") // Remove angle brackets
		.trim();
};

/**
 * Validate and sanitize URL
 * @param {string} url - URL to validate
 * @returns {string|null} Valid URL or null
 */
export const sanitizeUrl = (url) => {
	if (!url || typeof url !== "string") {
		return null;
	}

	const trimmed = url.trim();

	// Allow http, https, and relative URLs
	if (
		trimmed.startsWith("http://") ||
		trimmed.startsWith("https://") ||
		trimmed.startsWith("/") ||
		trimmed.startsWith("#")
	) {
		try {
			// Validate URL format
			if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
				new URL(trimmed);
			}
			return trimmed;
		} catch {
			return null;
		}
	}

	return null;
};

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
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
