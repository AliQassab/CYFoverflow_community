/**
 * Push notification utilities for frontend
 *
 * Handles Web Push API registration and device token management
 */

const API_BASE_URL = "/api";

/**
 * Register device for push notifications (Web Push API)
 * @param {string} deviceToken - Device token/subscription
 * @param {string} platform - Platform type ('web', 'android', 'ios', 'desktop')
 * @param {string} [deviceInfo] - Device information
 * @param {string} [appVersion] - App version
 * @param {string} accessToken - User's access token for authentication
 * @returns {Promise<Object>} Registration result
 */
export const registerDevice = async (
	deviceToken,
	platform,
	deviceInfo = null,
	appVersion = null,
	accessToken,
) => {
	const response = await fetch(`${API_BASE_URL}/devices/register`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify({
			token: deviceToken,
			platform,
			deviceInfo,
			appVersion,
		}),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.message || "Failed to register device");
	}

	return response.json();
};

/**
 * Unregister device for push notifications
 * @param {string} deviceToken - Device token to unregister
 * @param {string} accessToken - User's access token
 * @returns {Promise<void>}
 */
export const unregisterDevice = async (deviceToken, accessToken) => {
	const response = await fetch(
		`${API_BASE_URL}/devices/${encodeURIComponent(deviceToken)}`,
		{
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.message || "Failed to unregister device");
	}

	return response.json();
};

/**
 * Get user's registered devices
 * @param {string} accessToken - User's access token
 * @param {string} [platform] - Optional platform filter
 * @returns {Promise<Array>} Array of registered devices
 */
export const getRegisteredDevices = async (accessToken, platform = null) => {
	const params = platform ? `?platform=${platform}` : "";
	const response = await fetch(`${API_BASE_URL}/devices${params}`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.message || "Failed to get devices");
	}

	return response.json();
};

/**
 * Request Web Push API permission and create subscription
 * @returns {Promise<PushSubscription|null>} Push subscription or null if not supported/denied
 */
export const requestWebPushPermission = async () => {
	if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
		return null;
	}

	try {
		// Register service worker first (if not already registered)
		let registration;
		if (navigator.serviceWorker.controller) {
			// Service worker already active
			registration = await navigator.serviceWorker.ready;
		} else {
			// Register new service worker
			registration = await navigator.serviceWorker.register("/sw.js", {
				scope: "/",
			});
			// Wait for it to be ready
			await registration.ready;
		}

		// Request permission
		const permission = await Notification.requestPermission();
		if (permission !== "granted") {
			return null;
		}

		const vapidKey = await getVapidPublicKey();

		if (!vapidKey || vapidKey.trim() === "") {
			return null;
		}

		// Convert VAPID key to Uint8Array
		const keyArray = urlBase64ToUint8Array(vapidKey);

		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: keyArray,
		});

		return subscription;
	} catch (error) {
		console.error("Error requesting push permission:", error);
		return null;
	}
};

/**
 * Fetch VAPID public key from the API at runtime.
 * This avoids needing a build-time env var in Docker deployments.
 * @returns {Promise<string>} VAPID public key or empty string
 */
let _cachedVapidKey = null;
const getVapidPublicKey = async () => {
	if (_cachedVapidKey !== null) return _cachedVapidKey;
	try {
		const response = await fetch(`${API_BASE_URL}/push/config`);
		if (!response.ok) return "";
		const data = await response.json();
		_cachedVapidKey = data.vapidPublicKey || "";
		return _cachedVapidKey;
	} catch {
		return "";
	}
};

/**
 * Convert VAPID key from base64 URL to Uint8Array
 * @param {string} base64String - Base64 URL string
 * @returns {Uint8Array} Converted key
 */
const urlBase64ToUint8Array = (base64String) => {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
};

/**
 * Convert PushSubscription to token string for storage
 * @param {PushSubscription} subscription - Push subscription object
 * @returns {string} JSON string representation
 */
export const subscriptionToToken = (subscription) => {
	return JSON.stringify(subscription);
};

/**
 * Check if push notifications are supported
 * @returns {boolean} True if supported
 */
export const isPushNotificationSupported = () => {
	return (
		"serviceWorker" in navigator &&
		"PushManager" in window &&
		"Notification" in window
	);
};
