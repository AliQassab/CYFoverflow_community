import jwt from "jsonwebtoken";

import * as authRepository from "../auth/authRepository.js";

import config from "./config.js";
import logger from "./logger.js";


/**
 * Generate access token (short-lived, 15 minutes)
 * @param {number} userId - User ID
 * @returns {string} JWT access token
 */
export function generateToken(userId) {
	return jwt.sign({ userId }, config.jwtSecret, { expiresIn: "15m" });
}

/**
 * Generate access token with custom expiration
 * @param {number} userId - User ID
 * @param {string} expiresIn - Expiration time (e.g., "7d", "15m")
 * @returns {string} JWT access token
 */
export function generateTokenWithExpiry(userId, expiresIn) {
	return jwt.sign({ userId }, config.jwtSecret, { expiresIn });
}

export function verifyToken(token) {
	try {
		return jwt.verify(token, config.jwtSecret);
	} catch {
		return null;
	}
}

export function authenticateToken() {
	return async (req, res, next) => {
		try {
			let token = req.headers.authorization?.split(" ")[1];

			if (!token && req.query.token) {
				token = req.query.token;
			}

			if (!token) {
				return res
					.status(401)
					.json({ message: "No authorization header provided." });
			}

			const decoded = verifyToken(token);
			if (!decoded || !decoded.userId) {
				return res.status(401).json({ message: "Invalid or expired token." });
			}

			const user = await authRepository.findUserById(decoded.userId);
			if (!user) {
				return res.status(401).json({ message: "User not found." });
			}

			req.user = user;
			next();
		} catch (error) {
			logger.error("Authentication error:", error);
			if (!res.headersSent) {
				return res.status(401).json({ message: "Authentication failed." });
			}
		}
	};
}

/**
 * Optional authentication middleware - sets req.user if token is valid, but doesn't fail if no token
 */
export function optionalAuthenticateToken() {
	return async (req, res, next) => {
		const token = req.headers.authorization?.split(" ")[1];
		if (!token) {
			return next(); // Continue without user
		}

		const decoded = verifyToken(token);
		if (!decoded) {
			return next(); // Continue without user
		}

		const user = await authRepository.findUserById(decoded.userId);
		if (user) {
			req.user = user;
		}
		next();
	};
}
