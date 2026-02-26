/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from "react";

import Toast from "../components/Toast";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
	const [toasts, setToasts] = useState([]);

	const showToast = useCallback((message, type = "info", duration = 5000) => {
		const id = Date.now() + Math.random();
		setToasts((prev) => [...prev, { id, message, type, duration }]);
		return id;
	}, []);

	const removeToast = useCallback((id) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	}, []);

	const showSuccess = useCallback(
		(message, duration = 5000) => showToast(message, "success", duration),
		[showToast],
	);

	const showError = useCallback(
		(message, duration = 6000) => showToast(message, "error", duration),
		[showToast],
	);

	const showWarning = useCallback(
		(message, duration = 5000) => showToast(message, "warning", duration),
		[showToast],
	);

	const showInfo = useCallback(
		(message, duration = 5000) => showToast(message, "info", duration),
		[showToast],
	);

	return (
		<ToastContext.Provider
			value={{
				showToast,
				showSuccess,
				showError,
				showWarning,
				showInfo,
				removeToast,
			}}
		>
			{children}
			<div className="fixed top-4 right-4 z-50 space-y-2">
				{toasts.map((toast) => (
					<Toast
						key={toast.id}
						message={toast.message}
						type={toast.type}
						duration={toast.duration}
						onClose={() => removeToast(toast.id)}
					/>
				))}
			</div>
		</ToastContext.Provider>
	);
};

export const useToast = () => {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within ToastProvider");
	}
	return context;
};
