/**
 * Converts technical error messages to user-friendly messages
 * @param {Error|string} error - Error object or error message string
 * @param {string} defaultMessage - Default message if error can't be parsed
 * @returns {string} User-friendly error message
 */
export const getUserFriendlyError = (
	error,
	defaultMessage = "Something went wrong. Please try again.",
) => {
	if (!error) return defaultMessage;

	// Extract message from error object or string
	const errorMessage =
		typeof error === "string" ? error : error.message || error.toString();

	// Network/connection errors
	if (
		errorMessage.includes("Failed to fetch") ||
		errorMessage.includes("NetworkError") ||
		errorMessage.includes("Network request failed") ||
		errorMessage.includes("fetch")
	) {
		return "Unable to connect to the server. Please check your internet connection and try again.";
	}

	// Timeout errors
	if (errorMessage.includes("timeout") || errorMessage.includes("AbortError")) {
		return "The request took too long. Please try again.";
	}

	// Authentication errors
	if (
		errorMessage.includes("401") ||
		errorMessage.includes("Unauthorized") ||
		errorMessage.includes("Invalid token") ||
		errorMessage.includes("Token expired")
	) {
		return "Your session has expired. Please log in again.";
	}

	// Permission errors
	if (
		errorMessage.includes("403") ||
		errorMessage.includes("Forbidden") ||
		errorMessage.includes("permission") ||
		errorMessage.includes("not authorized")
	) {
		return "You don't have permission to perform this action.";
	}

	// Not found errors
	if (
		errorMessage.includes("404") ||
		errorMessage.includes("Not found") ||
		errorMessage.includes("does not exist")
	) {
		return "The requested item could not be found.";
	}

	// Server errors
	if (
		errorMessage.includes("500") ||
		errorMessage.includes("Internal Server Error") ||
		errorMessage.includes("Server error")
	) {
		return "A server error occurred. Please try again later.";
	}

	// Validation errors (keep as-is if they're already user-friendly)
	if (
		errorMessage.includes("must be") ||
		errorMessage.includes("required") ||
		errorMessage.includes("cannot be empty") ||
		errorMessage.includes("invalid") ||
		errorMessage.includes("too short") ||
		errorMessage.includes("too long")
	) {
		return errorMessage;
	}

	// Remove technical details
	const cleaned = errorMessage
		.replace(/Error:\s*/i, "")
		.replace(/\[.*?\]/g, "")
		.replace(/\(.*?\)/g, "")
		.trim();

	// If cleaned message is still technical, return default
	if (
		cleaned.includes("HTTP") ||
		cleaned.includes("status") ||
		cleaned.includes("code") ||
		cleaned.match(/^\d{3}$/)
	) {
		return defaultMessage;
	}

	return cleaned || defaultMessage;
};

/**
 * Checks if the browser is online
 * @returns {boolean} True if online, false if offline
 */
export const isOnline = () => {
	return navigator.onLine !== false;
};

/**
 * Detects network errors from fetch responses
 * @param {Response} response - Fetch response object
 * @returns {boolean} True if response indicates a network/server error
 */
export const isNetworkError = (response) => {
	return !response || response.status >= 500 || response.status === 0;
};
