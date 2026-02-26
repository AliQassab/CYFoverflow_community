import { useState, useRef, useEffect } from "react";

import { useNotifications } from "../contexts/NotificationContext";

import NotificationDropdown from "./NotificationDropdown";

function NotificationBell() {
	const { unreadCount, fetchNotifications } = useNotifications();
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			// Check if click is outside the dropdown
			// Don't close if clicking on notification items or buttons inside dropdown
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				// Only close if not clicking on a notification item or button inside dropdown
				const isNotificationItem = event.target.closest(".notification-item");
				const isButtonInDropdown =
					event.target.closest('[role="button"]') &&
					dropdownRef.current.contains(event.target.closest('[role="button"]'));

				if (!isNotificationItem && !isButtonInDropdown) {
					setIsOpen(false);
				}
			}
		};

		if (isOpen) {
			// Use a small delay to ensure click handlers execute first
			const timeoutId = setTimeout(() => {
				document.addEventListener("mousedown", handleClickOutside);
			}, 0);

			return () => {
				clearTimeout(timeoutId);
				document.removeEventListener("mousedown", handleClickOutside);
			};
		}
	}, [isOpen]);

	const handleBellClick = () => {
		if (!isOpen) {
			// Fetch notifications when opening dropdown
			fetchNotifications();
		}
		setIsOpen(!isOpen);
	};

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				onClick={handleBellClick}
				className="relative p-2 text-gray-700 hover:text-[#281d80] transition-colors duration-200 rounded-lg hover:bg-gray-100 cursor-pointer"
				aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
			>
				<svg
					className="w-6 h-6"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
					/>
				</svg>
				{unreadCount > 0 && (
					<span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-[#ed4d4e] rounded-full">
						{unreadCount > 99 ? "99+" : unreadCount}
					</span>
				)}
			</button>

			{isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
		</div>
	);
}

export default NotificationBell;
