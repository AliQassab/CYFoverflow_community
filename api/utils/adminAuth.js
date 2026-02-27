import config from "./config.js";
import logger from "./logger.js";

/**
 * Middleware that checks if the authenticated user is an admin.
 * Must be used after authenticateToken().
 * Admins are defined by the ADMIN_EMAILS env var (comma-separated).
 */
export function requireAdmin() {
	return (req, res, next) => {
		if (!req.user) {
			return res.status(401).json({ error: "Authentication required" });
		}

		if (!config.adminEmails.includes(req.user.email.toLowerCase())) {
			logger.warn(
				`Unauthorized admin access attempt by user ${req.user.id} (${req.user.email})`,
			);
			return res.status(403).json({ error: "Admin access required" });
		}

		next();
	};
}

/**
 * Helper: check if an email belongs to an admin.
 */
export function isAdminEmail(email) {
	if (!email) return false;
	return config.adminEmails.includes(email.toLowerCase());
}
