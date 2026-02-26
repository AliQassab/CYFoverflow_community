import { useEffect } from "react";

/**
 * Toast component for displaying temporary success/error/info messages
 * @param {Object} props
 * @param {string} props.message - Message to display
 * @param {"success"|"error"|"warning"|"info"} props.type - Toast type
 * @param {Function} props.onClose - Callback when toast closes
 * @param {number} props.duration - Duration in milliseconds (0 = no auto-close)
 */
export const Toast = ({ message, type = "info", onClose, duration = 5000 }) => {
	useEffect(() => {
		if (duration > 0) {
			const timer = setTimeout(() => {
				onClose();
			}, duration);
			return () => clearTimeout(timer);
		}
	}, [duration, onClose]);

	const bgColor = {
		success: "bg-green-50 border-green-500 text-green-800",
		error: "bg-red-50 border-red-500 text-red-800",
		warning: "bg-yellow-50 border-yellow-500 text-yellow-800",
		info: "bg-blue-50 border-blue-500 text-blue-800",
	}[type];

	const icon = {
		success: "✓",
		error: "✕",
		warning: "⚠",
		info: "ℹ",
	}[type];

	return (
		<div
			className={`min-w-[300px] max-w-md border-l-4 ${bgColor} px-4 py-3 rounded-md shadow-lg flex items-start gap-3 animate-slide-in`}
			role="alert"
		>
			<span className="text-lg font-bold shrink-0">{icon}</span>
			<div className="flex-1">
				<p className="text-sm font-medium">{message}</p>
			</div>
			<button
				onClick={onClose}
				className="text-gray-500 hover:text-gray-700 shrink-0 ml-2"
				aria-label="Close"
			>
				✕
			</button>
		</div>
	);
};

export default Toast;
