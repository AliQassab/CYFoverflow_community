/**
 * CYFoverflow Service Worker
 * Handles: offline caching + push notifications
 */

const CACHE_VERSION = "v2";
const STATIC_CACHE = `cyfoverflow-static-${CACHE_VERSION}`;
const API_CACHE = `cyfoverflow-api-${CACHE_VERSION}`;

const PRECACHE_ASSETS = ["/", "/index.html", "/favicon.svg", "/manifest.json"];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(STATIC_CACHE)
			.then((cache) => cache.addAll(PRECACHE_ASSETS))
			.then(() => self.skipWaiting()),
	);
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
	event.waitUntil(
		Promise.all([
			self.clients.claim(),
			caches
				.keys()
				.then((names) =>
					Promise.all(
						names
							.filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
							.map((name) => caches.delete(name)),
					),
				),
		]),
	);
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Only handle GET requests over http(s)
	if (request.method !== "GET" || !url.protocol.startsWith("http")) return;

	// API calls → network first, fall back to cache
	if (url.pathname.startsWith("/api/")) {
		event.respondWith(networkFirst(request, API_CACHE));
		return;
	}

	// Static assets → cache first
	const staticDestinations = ["script", "style", "image", "font", "manifest"];
	if (staticDestinations.includes(request.destination)) {
		event.respondWith(cacheFirst(request, STATIC_CACHE));
		return;
	}

	// HTML navigation (SPA) → network first, fall back to index.html for offline
	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request).catch(() =>
				caches
					.match("/index.html")
					.then((cached) => cached || Response.error()),
			),
		);
		return;
	}
});

async function networkFirst(request, cacheName) {
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(cacheName);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached = await caches.match(request);
		return cached || Response.error();
	}
}

async function cacheFirst(request, cacheName) {
	const cached = await caches.match(request);
	if (cached) return cached;
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(cacheName);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		return Response.error();
	}
}

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
	let notificationData = {
		title: "CYFoverflow",
		body: "You have a new notification",
		icon: "/favicon.svg",
		badge: "/favicon.svg",
		data: {},
	};

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
			const text = event.data.text();
			if (text) notificationData.body = text;
		}
	}

	const badgeCount = notificationData.data?.badgeCount;

	event.waitUntil(
		Promise.all([
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
			// Set the numeric badge on the app icon (Chrome/Edge/Android PWA)
			badgeCount !== undefined && "setAppBadge" in self.registration
				? self.registration.setAppBadge(badgeCount).catch(() => {})
				: Promise.resolve(),
		]),
	);
});

// ─── Notification Click ───────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	const data = event.notification.data || {};
	const { questionId, answerId, commentId } = data;

	let url = "/";
	if (questionId) {
		url = `/questions/${questionId}`;
		if (answerId) url += `#answer-${answerId}`;
		if (commentId) url += `#comment-${commentId}`;
	}

	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				for (const client of clientList) {
					if (client.url.includes(self.location.origin) && "focus" in client) {
						client.focus();
						client.navigate(url);
						return;
					}
				}
				if (self.clients.openWindow) {
					return self.clients.openWindow(url);
				}
			}),
	);
});

self.addEventListener("notificationclose", () => {
	// reserved for analytics
});
