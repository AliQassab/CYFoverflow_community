# Setting Up VAPID Keys for Web Push Notifications

To enable Web Push notifications, you need to generate VAPID (Voluntary Application Server Identification) keys.

## Quick Setup

### 1. Generate VAPID Keys

```bash
# Install web-push globally (if not already installed)
npm install -g web-push

# Generate keys
web-push generate-vapid-keys
```

This will output something like:

```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa40HI2F_AWkL...
Private Key: 8VKxr8Y...
```

### 2. Add to Frontend (.env file in web directory)

Create or update `web/.env`:

```env
VITE_VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
```

### 3. Add to Backend (.env file in root)

Create or update `.env` in the root directory:

```env
VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
```

### 4. Update Backend Push Service

Once keys are set, update `api/pushNotifications/pushNotificationService.js` to use the VAPID private key when sending web push notifications.

## Testing Without VAPID Keys

For now, you can test the device registration endpoint manually with a mock token:

```javascript
// In browser console (after logging in)
const authData = JSON.parse(localStorage.getItem("auth_data"));
const token = authData.token;

// Register with a mock token (for testing backend)
fetch("/api/devices/register", {
	method: "POST",
	headers: {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		token: "test-device-token-12345",
		platform: "web",
		deviceInfo: navigator.userAgent,
		appVersion: "1.0.0",
	}),
})
	.then((r) => r.json())
	.then((data) => {
		console.log("✅ Device registered:", data);
		// Now check devices
		return fetch("/api/devices", {
			headers: { Authorization: `Bearer ${token}` },
		});
	})
	.then((r) => r.json())
	.then((data) => console.log("📱 Registered devices:", data));
```

This will verify that:

- ✅ Device registration endpoint works
- ✅ Device storage works
- ✅ Device retrieval works

The actual push notifications will work once VAPID keys are configured.
