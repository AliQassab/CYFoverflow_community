/**
 * Server-Sent Events (SSE) client for real-time notifications
 */

const API_BASE_URL = "/api";

/**
 * Create SSE connection for notifications
 * @param {string|Function} tokenOrGetter - Authentication token or function that returns current token
 * @param {Object} callbacks - Event callbacks
 * @param {Function} callbacks.onUnreadCount - Called when unread count updates
 * @param {Function} callbacks.onNewNotification - Called when new notification arrives
 * @param {Function} callbacks.onNotificationDeleted - Called when notification is deleted
 * @param {Function} callbacks.onError - Called on connection error
 * @param {Function} callbacks.getToken - Optional function to get fresh token (for reconnection)
 * @returns {Function} Cleanup function to close connection
 */
export const createNotificationSSE = (tokenOrGetter, callbacks = {}) => {
	const getToken =
		typeof tokenOrGetter === "function" ? tokenOrGetter : () => tokenOrGetter;
	const initialToken =
		typeof tokenOrGetter === "function" ? tokenOrGetter() : tokenOrGetter;

	if (!initialToken) {
		console.warn("Cannot create SSE connection: no token provided");
		return () => {};
	}

	const {
		onUnreadCount,
		onNewNotification,
		onNotificationDeleted,
		onError,
		onConnected,
		getToken: getTokenCallback,
	} = callbacks;

	let eventSource = null;
	let reconnectTimeout = null;
	let reconnectAttempts = 0;
	const MAX_RECONNECT_ATTEMPTS = 3;
	const RECONNECT_DELAY = 2000; // 2 seconds

	const connect = () => {
		try {
			// Close existing connection if any
			if (eventSource) {
				eventSource.close();
			}

			// Get current token (may have been refreshed)
			const currentToken = getTokenCallback ? getTokenCallback() : getToken();
			if (!currentToken) {
				console.warn("Cannot reconnect SSE: no token available");
				if (onError) {
					onError(new Error("No token available for SSE connection"));
				}
				return;
			}

			// EventSource doesn't support custom headers in browser
			// Pass token as query parameter (backend supports both header and query param)
			const urlWithToken = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(currentToken)}`;
			eventSource = new EventSource(urlWithToken);

			eventSource.onopen = () => {
				reconnectAttempts = 0;
				if (onConnected) {
					onConnected();
				}
			};

			eventSource.addEventListener("connected", (event) => {
				const data = JSON.parse(event.data);
				if (onConnected) {
					onConnected(data);
				}
			});

			eventSource.addEventListener("unread_count", (event) => {
				try {
					const data = JSON.parse(event.data);
					if (onUnreadCount) {
						onUnreadCount(data.count);
					}
				} catch (error) {
					console.error("Error parsing unread_count event:", error);
				}
			});

			eventSource.addEventListener("new_notification", (event) => {
				try {
					const data = JSON.parse(event.data);
					if (onNewNotification) {
						onNewNotification(data);
					}
				} catch (error) {
					console.error("Error parsing new_notification event:", error);
				}
			});

			eventSource.addEventListener("notification_deleted", (event) => {
				try {
					const data = JSON.parse(event.data);
					if (onNotificationDeleted) {
						onNotificationDeleted(data.notificationId);
					}
				} catch (error) {
					console.error("Error parsing notification_deleted event:", error);
				}
			});

			eventSource.onerror = (error) => {
				// Check if it's a 401 (authentication error)
				if (
					eventSource.readyState === EventSource.CONNECTING ||
					eventSource.readyState === EventSource.OPEN
				) {
					// Check response status if available (EventSource doesn't expose status directly)
					// For 401 errors, wait a bit for token refresh, then reconnect
					console.warn("SSE connection error - may be authentication issue");
				}

				if (eventSource.readyState === EventSource.CLOSED) {
					// Connection closed - attempt to reconnect with fresh token
					if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
						reconnectAttempts++;
						const delay = RECONNECT_DELAY * reconnectAttempts; // 2s, 4s, 6s
						reconnectTimeout = setTimeout(connect, delay);
					} else {
						if (onError) {
							onError(
								new Error("SSE connection failed after multiple attempts"),
							);
						}
					}
				} else if (onError) {
					onError(error);
				}
			};
		} catch (error) {
			console.error("Error creating SSE connection:", error);
			if (onError) {
				onError(error);
			}
		}
	};

	// Start connection
	connect();

	// Return cleanup function
	return () => {
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
		}
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
	};
};
