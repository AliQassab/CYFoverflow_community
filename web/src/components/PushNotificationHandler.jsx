import { usePushNotifications } from "../hooks/usePushNotifications";

/**
 * Component to handle push notification registration
 * Should be placed inside AuthProvider to access auth context
 */
function PushNotificationHandler() {
	usePushNotifications();
	return null; // This component doesn't render anything
}

export default PushNotificationHandler;
