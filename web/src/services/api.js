import { getUserFriendlyError, isOnline } from "../utils/errorMessages";

const API_BASE_URL = "/api";

export const login = async (email, password) => {
	if (!isOnline()) {
		throw new Error("No internet connection");
	}

	const response = await fetch(`${API_BASE_URL}/auth/login`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ email, password }),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		const errorMessage = error.details || error.message || "Login failed";
		throw new Error(
			getUserFriendlyError(
				errorMessage,
				"Unable to log in. Please check your credentials and try again.",
			),
		);
	}

	return response.json();
};

export const signUp = async (name, email, password) => {
	if (!isOnline()) {
		throw new Error("No internet connection");
	}

	const response = await fetch(`${API_BASE_URL}/auth/signup`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ name, email, password }),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		const errorMessage = error.details || error.message || "Sign up failed";
		throw new Error(
			getUserFriendlyError(
				errorMessage,
				"Unable to create account. Please check your information and try again.",
			),
		);
	}

	return response.json();
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New access token and refresh token
 */
export const refreshAccessToken = async (refreshToken) => {
	if (!isOnline()) {
		throw new Error("No internet connection");
	}

	const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ refreshToken }),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		const errorMessage = error.message || "Token refresh failed";
		throw new Error(
			getUserFriendlyError(
				errorMessage,
				"Session expired. Please log in again.",
			),
		);
	}

	return response.json();
};

/**
 * Logout and revoke refresh token
 * @param {string} refreshToken - Refresh token to revoke
 */
export const logout = async (refreshToken) => {
	if (!isOnline()) {
		// If offline, just clear local storage
		return;
	}

	try {
		if (refreshToken) {
			await fetch(`${API_BASE_URL}/auth/logout`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ refreshToken }),
			});
		}
	} catch {
		// Non-blocking - continue with logout even if API call fails
	}
};

// Votes API methods
export const voteOnAnswer = async (answerId, voteType, token) => {
	const response = await fetch(`${API_BASE_URL}/votes/answer/${answerId}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ vote_type: voteType }),
	});

	if (!response.ok) {
		const error = await response.json();
		const errorMessage = error.message || "Failed to vote";
		throw new Error(errorMessage);
	}

	return response.json();
};

export const getVoteCounts = async (answerId, token = null) => {
	const headers = {
		"Content-Type": "application/json",
	};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const response = await fetch(`${API_BASE_URL}/votes/answer/${answerId}`, {
		method: "GET",
		headers,
	});

	if (!response.ok) {
		const error = await response.json();
		const errorMessage = error.message || "Failed to get vote counts";
		throw new Error(errorMessage);
	}

	return response.json();
};

// Accept answer API method
export const acceptAnswer = async (answerId, token) => {
	const response = await fetch(`${API_BASE_URL}/answers/${answerId}/accept`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		const error = await response.json();
		const errorMessage = error.message || "Failed to accept answer";
		throw new Error(errorMessage);
	}

	return response.json();
};

// Comments API methods
export const createComment = async (content, answerId, questionId, token) => {
	const body = { content };
	if (answerId) {
		body.answer_id = answerId;
	}
	if (questionId) {
		body.question_id = questionId;
	}

	const response = await fetch(`${API_BASE_URL}/comments`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const error = await response.json();
		const errorMessage = error.message || "Failed to create comment";
		throw new Error(errorMessage);
	}

	return response.json();
};

export const getCommentsByAnswerId = async (answerId) => {
	const response = await fetch(`${API_BASE_URL}/comments/answer/${answerId}`);

	if (!response.ok) {
		const error = await response.json();
		const errorMessage = error.message || "Failed to get comments";
		throw new Error(errorMessage);
	}

	return response.json();
};

export const getCommentsByQuestionId = async (questionId) => {
	const response = await fetch(
		`${API_BASE_URL}/comments/question/${questionId}`,
	);

	if (!response.ok) {
		const error = await response.json();
		const errorMessage = error.message || "Failed to get comments";
		throw new Error(errorMessage);
	}

	return response.json();
};

export const getCommentsForAnswers = async (answerIds) => {
	const response = await fetch(`${API_BASE_URL}/comments/batch`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ answer_ids: answerIds }),
	});

	if (!response.ok) {
		const error = await response.json();
		const errorMessage = error.message || "Failed to get comments";
		throw new Error(errorMessage);
	}

	return response.json();
};

export const updateComment = async (commentId, content, token) => {
	const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ content }),
	});

	if (!response.ok) {
		const error = await response.json();
		const errorMessage = error.message || "Failed to update comment";
		throw new Error(errorMessage);
	}

	return response.json();
};

export const deleteComment = async (commentId, token) => {
	const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
		method: "DELETE",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		const error = await response.json();
		const errorMessage = error.message || "Failed to delete comment";
		throw new Error(errorMessage);
	}

	return response.json();
};

// Notifications API methods
export const getNotifications = async (token, options = {}) => {
	const params = new URLSearchParams();
	if (options.unreadOnly) params.append("unreadOnly", "true");
	if (options.limit) params.append("limit", options.limit.toString());
	if (options.offset) params.append("offset", options.offset.toString());

	const response = await fetch(
		`${API_BASE_URL}/notifications?${params.toString()}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
			},
		},
	);

	if (!response.ok) {
		const error = await response.json();
		const errorMessage = error.message || "Failed to fetch notifications";
		throw new Error(errorMessage);
	}

	return response.json();
};

export const getUnreadNotificationCount = async (token) => {
	// Add timeout to prevent hanging requests (increased to 10 seconds for slow queries)
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

	try {
		const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const contentType = response.headers.get("content-type");
			let error;
			if (contentType && contentType.includes("application/json")) {
				error = await response.json();
			} else {
				await response.text();
				error = { message: `Server error: ${response.status}` };
			}
			const errorMessage =
				error.message || error.error || "Failed to fetch unread count";
			throw new Error(errorMessage);
		}

		return response.json();
	} catch (err) {
		clearTimeout(timeoutId);
		if (err.name === "AbortError") {
			throw new Error("Request timeout - unread count fetch took too long");
		}
		throw err;
	}
};

export const markNotificationAsRead = async (notificationId, token) => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 10000);

	try {
		const response = await fetch(
			`${API_BASE_URL}/notifications/${notificationId}/read`,
			{
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				signal: controller.signal,
			},
		);

		clearTimeout(timeoutId);

		if (!response.ok) {
			let error;
			try {
				error = await response.json();
			} catch {
				error = { message: `HTTP ${response.status}: ${response.statusText}` };
			}
			const errorMessage =
				error.message || error.error || "Failed to mark notification as read";
			throw new Error(errorMessage);
		}

		return response.json();
	} catch (error) {
		clearTimeout(timeoutId);
		if (error.name === "AbortError") {
			throw new Error(
				"Request timeout - marking notification as read took too long",
			);
		}
		throw error;
	}
};

export const markAllNotificationsAsRead = async (token) => {
	const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
		method: "PUT",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		const error = await response.json();
		const errorMessage =
			error.message || "Failed to mark all notifications as read";
		throw new Error(errorMessage);
	}

	return response.json();
};

export const deleteNotification = async (notificationId, token) => {
	const response = await fetch(
		`${API_BASE_URL}/notifications/${notificationId}`,
		{
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		},
	);

	if (!response.ok) {
		const error = await response.json();
		const errorMessage = error.message || "Failed to delete notification";
		throw new Error(errorMessage);
	}

	return response.json();
};

/**
 * Delete an answer
 * @param {number|string} answerId - Answer ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Deletion result
 */
export const deleteAnswer = async (answerId, token) => {
	const response = await fetch(`${API_BASE_URL}/answers/${answerId}`, {
		method: "DELETE",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		const errorMessage =
			error.message ||
			error.error ||
			`Failed to delete answer (${response.status})`;
		throw new Error(errorMessage);
	}

	return response.json();
};

// Questions API methods
export const getLatestQuestions = async (limit = 10) => {
	const response = await fetch(`${API_BASE_URL}/questions?limit=${limit}`);

	if (!response.ok) {
		const error = await response.json();
		const errorMessage =
			error.details || error.message || "Failed to fetch questions";
		throw new Error(errorMessage);
	}

	return response.json();
};

/**
 * Search for similar questions before posting (for suggestions)
 * @param {string} title - Question title
 * @param {string} content - Question content (HTML)
 * @param {number} limit - Maximum number of results (default: 5)
 * @returns {Promise<Array>} Array of similar questions
 */
export const searchSimilarQuestions = async (
	title,
	content = "",
	limit = 5,
) => {
	const response = await fetch(`${API_BASE_URL}/questions/search-similar`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ title, content, limit }),
	});

	if (!response.ok) {
		const error = await response.json();
		const errorMessage =
			error.message || "Failed to search for similar questions";
		throw new Error(errorMessage);
	}

	return response.json();
};

/**
 * Get similar questions for a given question
 * @param {number|string} questionId - Question ID or slug
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of similar questions (default: 5)
 * @param {string} options.type - Filter by relation type ('similar', 'duplicate', 'related')
 * @returns {Promise<Array>} Array of similar questions
 */
export const getSimilarQuestions = async (questionId, options = {}) => {
	const params = new URLSearchParams();
	if (options.limit) params.append("limit", options.limit.toString());
	if (options.type) params.append("type", options.type);

	const queryString = params.toString();
	const url = `${API_BASE_URL}/questions/${questionId}/similar${queryString ? `?${queryString}` : ""}`;

	const response = await fetch(url);

	if (!response.ok) {
		let errorMessage = "Failed to fetch similar questions";
		try {
			const error = await response.json();
			errorMessage = error.error || error.message || errorMessage;
		} catch {
			errorMessage = response.statusText || errorMessage;
		}
		throw new Error(errorMessage);
	}

	const data = await response.json();
	// Ensure we always return an array
	return Array.isArray(data) ? data : [];
};

/**
 * Get user profile with statistics
 * @param {number|string} userId - User ID
 * @returns {Promise<Object>} User profile with stats
 */
export const getUserProfile = async (userId) => {
	const response = await fetch(`${API_BASE_URL}/users/${userId}`);

	if (!response.ok) {
		const error = await response.json();
		const errorMessage =
			error.error || error.message || "Failed to fetch user profile";
		throw new Error(errorMessage);
	}

	return response.json();
};

/**
 * Update user profile
 * @param {number|string} userId - User ID
 * @param {Object} updates - Fields to update
 * @param {string} [updates.avatar_url] - Avatar URL
 * @param {string} [updates.public_email] - Publicly visible email
 * @param {boolean} [updates.is_cyf_trainee] - Whether user is/was a CYF trainee
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Updated user profile
 */
export const updateUserProfile = async (userId, updates, token) => {
	const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(updates),
	});

	if (!response.ok) {
		const error = await response.json();
		const errorMessage =
			error.error || error.message || "Failed to update user profile";
		throw new Error(errorMessage);
	}

	return response.json();
};

/**
 * Upload a file
 * @param {File} file - File to upload
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Uploaded file data
 */
export const uploadFile = async (file, token) => {
	if (!isOnline()) {
		throw new Error("No internet connection");
	}

	const formData = new FormData();
	formData.append("file", file);

	const response = await fetch(`${API_BASE_URL}/upload`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
		},
		body: formData,
	});

	if (!response.ok) {
		const error = await response.json();
		const errorMessage = error.message || "Failed to upload file";
		throw new Error(errorMessage);
	}

	return response.json();
};

/**
 * Delete an uploaded file
 * @param {number} fileId - File ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Deletion result
 */
export const deleteFile = async (fileId, token) => {
	if (!isOnline()) {
		throw new Error("No internet connection");
	}

	const response = await fetch(`${API_BASE_URL}/upload/${fileId}`, {
		method: "DELETE",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		const error = await response.json();
		const errorMessage = error.message || "Failed to delete file";
		throw new Error(errorMessage);
	}

	return response.json();
};

/**
 * Request password reset (forgot password)
 * @param {string} email - User email
 * @returns {Promise<Object>} Response with success status and message
 */
export const requestPasswordReset = async (email) => {
	if (!isOnline()) {
		throw new Error("No internet connection");
	}

	const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ email }),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		const errorMessage =
			error.message || error.details || "Failed to send reset email";
		throw new Error(
			getUserFriendlyError(
				errorMessage,
				"Failed to send reset email. Please try again.",
			),
		);
	}

	return response.json();
};

/**
 * Reset password using token
 * @param {string} token - Password reset token
 * @param {string} password - New password
 * @returns {Promise<Object>} Response with success status and message
 */
export const resetPassword = async (token, password) => {
	if (!isOnline()) {
		throw new Error("No internet connection");
	}

	const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ token, password }),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		const errorMessage =
			error.message || error.details || "Failed to reset password";
		throw new Error(
			getUserFriendlyError(
				errorMessage,
				"Failed to reset password. The link may have expired. Please request a new one.",
			),
		);
	}

	return response.json();
};

// ─── Admin API ────────────────────────────────────────────────────────────────

export const getAdminStats = async (token) => {
	const response = await fetch(`${API_BASE_URL}/admin/stats`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!response.ok) throw new Error("Failed to fetch admin stats");
	return response.json();
};

export const getAdminUsers = async (
	token,
	{ page = 1, limit = 20, search = "" } = {},
) => {
	const params = new URLSearchParams({
		page,
		limit,
		...(search && { search }),
	});
	const response = await fetch(`${API_BASE_URL}/admin/users?${params}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!response.ok) throw new Error("Failed to fetch users");
	return response.json();
};

export const adminSetUserActive = async (token, userId, isActive) => {
	const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/block`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ is_active: isActive }),
	});
	if (!response.ok) throw new Error("Failed to update user");
	return response.json();
};

export const adminDeleteUser = async (token, userId) => {
	const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
		method: "DELETE",
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!response.ok) throw new Error("Failed to delete user");
	return response.json();
};

export const getAdminContent = async (
	token,
	{ type, page = 1, limit = 20 } = {},
) => {
	const params = new URLSearchParams({ type, page, limit });
	const response = await fetch(`${API_BASE_URL}/admin/content?${params}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!response.ok) throw new Error("Failed to fetch content");
	return response.json();
};

export const getAdminAnswers = async (token, questionId) => {
	const response = await fetch(
		`${API_BASE_URL}/admin/questions/${questionId}/answers`,
		{ headers: { Authorization: `Bearer ${token}` } },
	);
	if (!response.ok) throw new Error("Failed to fetch answers");
	return response.json();
};

export const getAdminQuestion = async (token, id) => {
	const response = await fetch(`${API_BASE_URL}/admin/questions/${id}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!response.ok) throw new Error("Failed to fetch question");
	return response.json();
};

export const adminDeleteContent = async (token, type, id) => {
	const response = await fetch(`${API_BASE_URL}/admin/content/${type}/${id}`, {
		method: "DELETE",
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!response.ok) throw new Error("Failed to delete content");
	return response.json();
};
