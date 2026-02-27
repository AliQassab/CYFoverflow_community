import { useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useNotifications } from "../contexts/NotificationContext";

// Simple time formatter (no external dependency needed)
const formatTimeAgo = (dateString) => {
	const date = new Date(dateString);
	const now = new Date();
	const seconds = Math.floor((now - date) / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (seconds < 60) return "just now";
	if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
	if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
	if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
	return date.toLocaleDateString();
};

function NotificationDropdown({ onClose }) {
	const {
		notifications,
		loading,
		markAsRead,
		markAllAsRead,
		removeNotification,
	} = useNotifications();
	const navigate = useNavigate();
	const navigateRef = useRef(navigate);
	const pendingMarksRef = useRef([]);
	navigateRef.current = navigate; // Keep ref updated

	const handleNotificationClick = (notification) => {
		// Build navigation URL first (before any async operations)
		let url = null;
		if (notification.related_question_id) {
			// If there's a question slug, use it (preferred)
			if (notification.question_slug) {
				url = `/questions/${notification.question_slug}`;

				// If notification is about an answer, navigate to that answer
				if (notification.related_answer_id) {
					url += `#answer-${notification.related_answer_id}`;
				}
				// If notification is about a comment, navigate to that comment
				else if (notification.related_comment_id) {
					url += `#comment-${notification.related_comment_id}`;
				}
			}
			// Fallback to question ID if no slug
			else {
				url = `/questions/${notification.related_question_id}`;
				if (notification.related_answer_id) {
					url += `#answer-${notification.related_answer_id}`;
				} else if (notification.related_comment_id) {
					url += `#comment-${notification.related_comment_id}`;
				}
			}
		}

		if (!url) {
			return;
		}

		// Mark as read if unread - state updates optimistically immediately
		if (!notification.read) {
			// Call markAsRead which updates state optimistically FIRST (synchronously)
			// Then makes API call in background - this will complete even after navigation
			// The promise will continue even if component unmounts
			const markAsReadPromise = markAsRead(notification.id);

			// Track promise to prevent garbage collection
			pendingMarksRef.current.push(markAsReadPromise);

			markAsReadPromise
				.catch((error) => {
					console.error(
						"Error marking notification as read (background):",
						error,
					);
				})
				.finally(() => {
					// Remove from tracking array
					const index = pendingMarksRef.current.indexOf(markAsReadPromise);
					if (index > -1) {
						pendingMarksRef.current.splice(index, 1);
					}
				});
		}

		// Navigate immediately - state update already happened synchronously
		navigateRef.current(url);

		// Close dropdown after navigation
		onClose();
	};

	const handleMarkAllAsRead = async () => {
		try {
			await markAllAsRead();
		} catch (error) {
			console.error("Error marking all as read:", error);
		}
	};

	const handleDelete = async (e, notificationId) => {
		e.stopPropagation();
		try {
			await removeNotification(notificationId);
		} catch (error) {
			console.error("Error deleting notification:", error);
		}
	};

	const unreadNotifications = notifications.filter((n) => !n.read);
	const hasUnread = unreadNotifications.length > 0;

	return (
		<div
			className="fixed md:absolute inset-x-3 md:inset-x-auto top-16 md:top-auto md:right-0 md:mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 flex flex-col md:w-96"
			style={{ maxHeight: "min(500px, calc(100dvh - 80px))" }}
		>
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-gray-200">
				<h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
				{hasUnread && (
					<button
						onClick={handleMarkAllAsRead}
						className="text-sm text-[#281d80] hover:text-[#1f1566] font-medium cursor-pointer"
					>
						Mark all as read
					</button>
				)}
			</div>

			{/* Notifications List */}
			<div className="overflow-y-auto flex-1">
				{loading ? (
					<div className="p-8 text-center text-gray-500">Loading...</div>
				) : notifications.length === 0 ? (
					<div className="p-8 text-center text-gray-500">
						<p>No notifications</p>
					</div>
				) : (
					<div className="divide-y divide-gray-100">
						{notifications.map((notification) => (
							<div
								key={notification.id}
								onClick={() => {
									handleNotificationClick(notification);
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleNotificationClick(notification);
									}
								}}
								role="button"
								tabIndex={0}
								className={`notification-item p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
									!notification.read ? "bg-blue-50" : ""
								}`}
							>
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 min-w-0">
										<div className="flex items-start gap-2">
											{!notification.read && (
												<span className="mt-1.5 w-2 h-2 bg-[#281d80] rounded-full shrink-0"></span>
											)}
											<div className="flex-1 min-w-0">
												<p
													className={`text-sm ${
														!notification.read
															? "font-semibold text-gray-900"
															: "text-gray-700"
													}`}
												>
													{notification.message}
												</p>
												{notification.question_title && (
													<p className="text-xs text-gray-500 mt-1 truncate">
														{notification.question_title}
													</p>
												)}
												<p className="text-xs text-gray-400 mt-1">
													{formatTimeAgo(notification.created_at)}
												</p>
											</div>
										</div>
									</div>
									<button
										onClick={(e) => handleDelete(e, notification.id)}
										className="text-gray-400 hover:text-[#ed4d4e] transition-colors shrink-0 p-1 cursor-pointer"
										aria-label="Delete notification"
									>
										<svg
											className="w-4 h-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

export default NotificationDropdown;
