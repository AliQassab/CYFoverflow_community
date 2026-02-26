import { useEffect, useRef } from "react";

import { useAuth } from "../contexts/useAuth";
import * as pushNotificationService from "../services/pushNotifications";

/**
 * Hook to handle push notification registration
 * Automatically registers device when user logs in
 */
export const usePushNotifications = () => {
	const { isLoggedIn, token, user } = useAuth();
	const registeredRef = useRef(false);

	useEffect(() => {
		if (!isLoggedIn || !token || registeredRef.current) {
			return;
		}

		// Only register for web platform in browser
		if (
			typeof window === "undefined" ||
			!pushNotificationService.isPushNotificationSupported()
		) {
			return;
		}

		const registerWebPush = async () => {
			try {
				// Request permission and get subscription
				const subscription =
					await pushNotificationService.requestWebPushPermission();

				if (!subscription) {
					// User denied permission or not supported
					return;
				}

				// Convert subscription to token string
				const deviceToken =
					pushNotificationService.subscriptionToToken(subscription);

				// Get device info
				const deviceInfo = navigator.userAgent || "Unknown Browser";
				const appVersion = "1.0.0";

				// Register device with backend
				await pushNotificationService.registerDevice(
					deviceToken,
					"web",
					deviceInfo,
					appVersion,
					token,
				);

				registeredRef.current = true;
			} catch (error) {
				console.error("Error registering push notifications:", error);
				// Non-blocking - don't prevent app from working
			}
		};

		registerWebPush();
	}, [isLoggedIn, token, user]);

	// Cleanup: unregister on logout
	useEffect(() => {
		if (!isLoggedIn && registeredRef.current) {
			registeredRef.current = false;
			// Note: Device unregistration should be handled by logout
		}
	}, [isLoggedIn]);
};
