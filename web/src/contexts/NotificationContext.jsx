/* eslint-disable react-refresh/only-export-components */
import {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
	useRef,
} from "react";

import {
	getNotifications,
	getUnreadNotificationCount,
	markNotificationAsRead,
	markAllNotificationsAsRead,
	deleteNotification,
} from "../services/api";
import { createNotificationSSE } from "../services/sse";

import { useAuth } from "./useAuth";

const NotificationContext = createContext();

export const useNotifications = () => {
	const context = useContext(NotificationContext);
	if (!context) {
		throw new Error(
			"useNotifications must be used within NotificationProvider",
		);
	}
	return context;
};

export const NotificationProvider = ({ children }) => {
	const { isLoggedIn, token } = useAuth();
	const [notifications, setNotifications] = useState([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Polling interval (30 seconds) - fallback if SSE fails
	const POLL_INTERVAL = 30000;
	const sseCleanupRef = useRef(null);
	const useSSE = useRef(true); // Try SSE first, fallback to polling if it fails

	// Fetch notifications
	const fetchNotifications = useCallback(
		async (showUnreadOnly = false) => {
			if (!isLoggedIn || !token) {
				setNotifications([]);
				setUnreadCount(0);
				return;
			}

			try {
				setLoading(true);
				setError(null);

				const result = await getNotifications(token, {
					unreadOnly: showUnreadOnly,
					limit: 50,
				});

				setNotifications(result.notifications || []);
				setUnreadCount(result.unreadCount || 0);
			} catch (err) {
				console.error("Error fetching notifications:", err);
				setError(err.message || "Failed to fetch notifications");
			} finally {
				setLoading(false);
			}
		},
		[isLoggedIn, token],
	);

	// Track recent optimistic updates and pending API calls to prevent polling from overwriting them
	const recentOptimisticUpdates = useRef(new Map()); // Map<notificationId, timestamp>
	const pendingMarkAsReadCalls = useRef(new Set()); // Set<notificationId>

	// Fetch unread count only (lighter request) - NON-BLOCKING
	const fetchUnreadCount = useCallback(async () => {
		if (!isLoggedIn || !token) {
			setUnreadCount(0);
			return;
		}

		try {
			const result = await getUnreadNotificationCount(token);
			const newCount = result.count || 0;

			// Prevent polling from overwriting optimistic updates
			// Check if we have recent optimistic updates (within last 30 seconds) OR pending API calls
			const now = Date.now();
			const hasRecentUpdates = Array.from(
				recentOptimisticUpdates.current.values(),
			).some(
				(timestamp) => now - timestamp < 30000, // 30 seconds protection
			);
			const hasPendingCalls = pendingMarkAsReadCalls.current.size > 0;

			setUnreadCount((prev) => {
				// If we have recent optimistic updates or pending calls, and new count is higher, it's stale data
				if ((hasRecentUpdates || hasPendingCalls) && newCount > prev) {
					return prev; // Keep optimistic count
				}
				return newCount;
			});
		} catch (err) {
			console.error("Error fetching unread count (non-blocking):", err);
			// Don't block - don't change count on error
		}
	}, [isLoggedIn, token]);

	// Mark notification as read
	const markAsRead = useCallback(
		async (notificationId) => {
			if (!token) {
				return;
			}

			recentOptimisticUpdates.current.set(notificationId, Date.now());
			pendingMarkAsReadCalls.current.add(notificationId);

			setNotifications((prev) =>
				prev.map((n) =>
					n.id === notificationId
						? { ...n, read: true, read_at: new Date().toISOString() }
						: n,
				),
			);
			setUnreadCount((prev) => Math.max(0, prev - 1));

			try {
				await markNotificationAsRead(notificationId, token);
				pendingMarkAsReadCalls.current.delete(notificationId);
				recentOptimisticUpdates.current.set(notificationId, Date.now());
			} catch (err) {
				console.error("Error marking notification as read:", err);
				pendingMarkAsReadCalls.current.delete(notificationId);

				if (err.message && err.message.includes("timeout")) {
					recentOptimisticUpdates.current.set(notificationId, Date.now());
				} else {
					recentOptimisticUpdates.current.delete(notificationId);
					setNotifications((prev) =>
						prev.map((n) =>
							n.id === notificationId
								? { ...n, read: false, read_at: null }
								: n,
						),
					);
					setUnreadCount((prev) => prev + 1);
				}
				throw err;
			}
		},
		[token],
	);

	// Mark all notifications as read
	const markAllAsRead = useCallback(async () => {
		if (!token) return;

		// Update local state optimistically FIRST (before API call)
		const previousNotifications = [...notifications];
		const previousUnreadCount = unreadCount;
		setNotifications((prev) =>
			prev.map((n) => ({
				...n,
				read: true,
				read_at: new Date().toISOString(),
			})),
		);
		setUnreadCount(0);

		try {
			// Then make the API call in the background
			await markAllNotificationsAsRead(token);
		} catch (err) {
			console.error("Error marking all notifications as read:", err);
			// Revert optimistic update on error
			setNotifications(previousNotifications);
			setUnreadCount(previousUnreadCount);
			throw err;
		}
	}, [token, notifications, unreadCount]);

	// Delete notification
	const removeNotification = useCallback(
		async (notificationId) => {
			if (!token) return;

			try {
				await deleteNotification(notificationId, token);
				// Update local state
				setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
				// Update unread count if notification was unread
				const notification = notifications.find((n) => n.id === notificationId);
				if (notification && !notification.read) {
					setUnreadCount((prev) => Math.max(0, prev - 1));
				}
			} catch (err) {
				console.error("Error deleting notification:", err);
				throw err;
			}
		},
		[token, notifications],
	);

	// Sync the app icon badge count with unread notifications
	useEffect(() => {
		if (!("setAppBadge" in navigator)) return;
		if (unreadCount > 0) {
			navigator.setAppBadge(unreadCount).catch(() => {});
		} else {
			navigator.clearAppBadge().catch(() => {});
		}
	}, [unreadCount]);

	// Initial fetch when logged in
	useEffect(() => {
		if (isLoggedIn && token) {
			fetchNotifications();
		} else {
			setNotifications([]);
			setUnreadCount(0);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoggedIn, token]); // Removed fetchNotifications to prevent infinite loop

	// Listen for notifications changed events (when questions/answers are deleted)
	useEffect(() => {
		if (!isLoggedIn || !token) return;

		const handleNotificationsChanged = () => {
			// Refresh both notifications list and unread count when content is deleted
			fetchNotifications().catch(() => {
				// Silently fail - don't block
			});
			fetchUnreadCount().catch(() => {
				// Silently fail - don't block
			});
		};

		window.addEventListener("notificationsChanged", handleNotificationsChanged);

		return () => {
			window.removeEventListener(
				"notificationsChanged",
				handleNotificationsChanged,
			);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoggedIn, token]);

	// Real-time updates: Use SSE for instant notifications, fallback to polling
	useEffect(() => {
		if (!isLoggedIn || !token) {
			setUnreadCount(0);
			return;
		}

		// Cleanup previous SSE connection
		if (sseCleanupRef.current) {
			sseCleanupRef.current();
			sseCleanupRef.current = null;
		}

		// Try SSE first (real-time updates)
		if (useSSE.current && typeof EventSource !== "undefined") {
			try {
				sseCleanupRef.current = createNotificationSSE(
					() => {
						// Get fresh token from auth context
						return token;
					},
					{
						onConnected: () => {
							// SSE connected successfully
							console.log("SSE connected for real-time notifications");
						},
						onUnreadCount: (count) => {
							setUnreadCount(count);
						},
						onNewNotification: () => {
							// Refresh notifications list when new notification arrives
							fetchNotifications().catch(() => {
								// Silently fail
							});
						},
						onNotificationDeleted: (notificationId) => {
							setNotifications((prev) =>
								prev.filter((n) => n.id !== notificationId),
							);
						},
						getToken: () => token, // Provide function to get current token for reconnection
						onError: (error) => {
							console.error(
								"SSE connection error, falling back to polling:",
								error,
							);
							useSSE.current = false; // Disable SSE, use polling instead
						},
					},
				);

				// Fetch initial unread count
				fetchUnreadCount().catch(() => {
					// Silently fail
				});
			} catch (error) {
				console.error("Failed to create SSE connection, using polling:", error);
				useSSE.current = false;
			}
		}

		// Fallback to polling if SSE is disabled or unavailable
		let intervalId = null;
		let handleVisibilityChange = null;

		if (!useSSE.current || typeof EventSource === "undefined") {
			// Fetch immediately (non-blocking)
			fetchUnreadCount().catch(() => {
				// Silently fail
			});

			// Set up polling interval (only if page is visible)
			if (document.visibilityState === "visible") {
				intervalId = setInterval(() => {
					if (document.visibilityState === "visible") {
						const hasPendingCalls = pendingMarkAsReadCalls.current.size > 0;
						const now = Date.now();
						const hasRecentUpdates = Array.from(
							recentOptimisticUpdates.current.values(),
						).some((timestamp) => now - timestamp < 30000);

						if (hasPendingCalls || hasRecentUpdates) {
							return;
						}

						fetchUnreadCount().catch(() => {
							// Silently fail
						});
					}
				}, POLL_INTERVAL);
			}

			// Also fetch when page becomes visible
			handleVisibilityChange = () => {
				if (document.visibilityState === "visible") {
					fetchUnreadCount().catch(() => {
						// Silently fail
					});
				}
			};

			document.addEventListener("visibilitychange", handleVisibilityChange);
		}

		// Cleanup function
		return () => {
			if (sseCleanupRef.current) {
				sseCleanupRef.current();
				sseCleanupRef.current = null;
			}
			if (intervalId) {
				clearInterval(intervalId);
			}
			if (handleVisibilityChange) {
				document.removeEventListener(
					"visibilitychange",
					handleVisibilityChange,
				);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoggedIn, token]);

	return (
		<NotificationContext.Provider
			value={{
				notifications,
				unreadCount,
				loading,
				error,
				fetchNotifications,
				fetchUnreadCount,
				markAsRead,
				markAllAsRead,
				removeNotification,
			}}
		>
			{children}
		</NotificationContext.Provider>
	);
};
