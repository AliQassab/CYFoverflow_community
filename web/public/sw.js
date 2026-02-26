/**
 * Service Worker for Push Notifications
 *
 * This service worker handles push notifications for the web app.
 * It listens for push events and displays notifications.
 */

// Service worker version
const CACHE_VERSION = "v1";
const CACHE_NAME = `cyfoverflow-sw-${CACHE_VERSION}`;

// Install event - cache resources
self.addEventListener("install", () => {
	console.log("Service Worker installing...");
	// Skip waiting to activate immediately
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
	console.log("Service Worker activating...");
	event.waitUntil(
		self.clients.claim().then(() => {
			// Clean up old caches
			return caches.keys().then((cacheNames) => {
				return Promise.all(
					cacheNames
						.filter((name) => name !== CACHE_NAME)
						.map((name) => caches.delete(name)),
				);
			});
		}),
	);
});

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
	console.log("Push notification received:", event);

	let notificationData = {
		title: "CYFoverflow",
		body: "You have a new notification",
		icon: "/favicon.svg",
		badge: "/favicon.svg",
		data: {},
	};

	// Parse push data if available
	if (event.data) {
		try {
			const data = event.data.json();
			notificationData = {
				title: data.title || notificationData.title,
				body: data.body || notificationData.body,
				icon: data.icon || notificationData.icon,
				badge: data.badge || notificationData.badge,
				data: data.data || {},
				tag: data.tag || undefined,
				requireInteraction: data.requireInteraction || false,
			};
		} catch {
			// If JSON parsing fails, try text
			const text = event.data.text();
			if (text) {
				notificationData.body = text;
			}
		}
	}

	// Show notification
	event.waitUntil(
		self.registration.showNotification(notificationData.title, {
			body: notificationData.body,
			icon: notificationData.icon,
			badge: notificationData.badge,
			data: notificationData.data,
			tag: notificationData.tag,
			requireInteraction: notificationData.requireInteraction,
			vibrate: [200, 100, 200],
			timestamp: Date.now(),
		}),
	);
});

// Notification click event - handle when user clicks notification
self.addEventListener("notificationclick", (event) => {
	console.log("Notification clicked:", event);

	event.notification.close();

	const data = event.notification.data || {};
	const questionId = data.questionId;
	const answerId = data.answerId;
	const commentId = data.commentId;

	// Build URL based on notification type
	let url = "/";
	if (questionId) {
		url = `/questions/${questionId}`;
		if (answerId) {
			url += `#answer-${answerId}`;
		}
		if (commentId) {
			url += `#comment-${commentId}`;
		}
	}

	// Open or focus the app
	event.waitUntil(
		self.clients
			.matchAll({
				type: "window",
				includeUncontrolled: true,
			})
			.then((clientList) => {
				// If app is already open, focus it and navigate
				for (const client of clientList) {
					if (client.url.includes(self.location.origin) && "focus" in client) {
						client.focus();
						client.navigate(url);
						return;
					}
				}
				// Otherwise, open new window
				if (self.clients.openWindow) {
					return self.clients.openWindow(url);
				}
			}),
	);
});

// Notification close event
self.addEventListener("notificationclose", (event) => {
	console.log("Notification closed:", event);
	// Could track analytics here if needed
});
