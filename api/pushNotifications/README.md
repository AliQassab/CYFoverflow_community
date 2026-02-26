# Push Notifications Infrastructure

This directory contains the push notification service infrastructure for CYFoverflow.

## Current Status

✅ **Infrastructure Complete** - Database, API endpoints, and service structure are ready
⏳ **FCM/APNS Integration Pending** - Platform-specific implementations need to be added

## Architecture

### Database

- `device_tokens` table stores device tokens for all platforms
- Supports: Android (FCM), iOS (APNS), Web (Web Push API), Desktop

### API Endpoints

- `POST /api/devices/register` - Register a device token
- `DELETE /api/devices/:token` - Unregister a device token
- `GET /api/devices` - Get user's registered devices

### Services

- `deviceTokenService.js` - Manages device token registration/unregistration
- `pushNotificationService.js` - Sends push notifications (structure ready for FCM/APNS)

## Next Steps for Full Implementation

### 1. Firebase Cloud Messaging (FCM) for Android

```bash
npm install firebase-admin
```

**Setup:**

1. Create Firebase project
2. Download service account key JSON
3. Set `FCM_SERVICE_ACCOUNT_KEY` environment variable
4. Implement `sendToAndroid()` in `pushNotificationService.js`

### 2. Apple Push Notification Service (APNS) for iOS

```bash
npm install apn
```

**Setup:**

1. Create APNS certificate/key
2. Set `APNS_KEY_PATH` and `APNS_KEY_ID` environment variables
3. Implement `sendToIOS()` in `pushNotificationService.js`

### 3. Web Push API (Browser)

```bash
npm install web-push
```

**Setup:**

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` environment variables
3. Implement `sendToWeb()` in `pushNotificationService.js`
4. Update frontend `pushNotifications.js` with VAPID public key

### 4. Desktop (Electron/React Native)

- Uses same FCM/APNS infrastructure
- Or implement native desktop notifications

## Environment Variables Needed

```env
# FCM (Android)
FCM_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json

# APNS (iOS)
APNS_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
APNS_KEY_ID=XXXXXXXXXX
APNS_TEAM_ID=XXXXXXXXXX
APNS_BUNDLE_ID=com.cyfoverflow.app

# Web Push
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

## Usage

Once implemented, push notifications are automatically sent when:

- New answer is added to a user's question
- New comment is added to a user's question/answer
- User's answer is accepted

The system is designed to be non-blocking - push notification failures won't affect the main application flow.
