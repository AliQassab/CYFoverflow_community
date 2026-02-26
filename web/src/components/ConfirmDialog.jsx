import { useEffect } from "react";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";

/**
 * Confirmation dialog component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dialog is open
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message
 * @param {string} props.confirmText - Confirm button text (default: "Confirm")
 * @param {string} props.cancelText - Cancel button text (default: "Cancel")
 * @param {string} props.variant - "danger" (red) or "warning" (yellow) (default: "danger")
 * @param {Function} props.onConfirm - Callback when confirmed
 * @param {Function} props.onCancel - Callback when cancelled
 */
function ConfirmDialog({
	isOpen,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	variant = "danger",
	onConfirm,
	onCancel,
}) {
	const handleBackdropClick = (e) => {
		if (e.target === e.currentTarget) {
			onCancel();
		}
	};

	useEffect(() => {
		if (!isOpen) return;

		const handleEscape = (e) => {
			if (e.key === "Escape") {
				onCancel();
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => {
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen, onCancel]);

	if (!isOpen) return null;

	const variantStyles = {
		danger: {
			icon: "text-red-600",
			confirmButton: "bg-red-600 hover:bg-red-700 text-white",
		},
		warning: {
			icon: "text-yellow-600",
			confirmButton: "bg-yellow-600 hover:bg-yellow-700 text-white",
		},
	};

	const styles = variantStyles[variant] || variantStyles.danger;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
			onClick={handleBackdropClick}
			aria-hidden="true"
		>
			<div
				className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in"
				role="dialog"
				aria-modal="true"
			>
				{/* Close button */}
				<button
					onClick={onCancel}
					className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
					aria-label="Close"
				>
					<FaTimes className="w-5 h-5" />
				</button>

				{/* Icon */}
				<div className="flex items-center justify-center mb-4">
					<FaExclamationTriangle className={`w-12 h-12 ${styles.icon}`} />
				</div>

				{/* Title */}
				<h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
					{title}
				</h3>

				{/* Message */}
				<p className="text-gray-600 mb-6 text-center">{message}</p>

				{/* Buttons */}
				<div className="flex gap-3 justify-end">
					<button
						onClick={(e) => {
							e.stopPropagation();
							onCancel?.();
						}}
						className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
					>
						{cancelText}
					</button>
					<button
						onClick={(e) => {
							e.stopPropagation();
							onConfirm?.();
						}}
						className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${styles.confirmButton}`}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
}

export default ConfirmDialog;
