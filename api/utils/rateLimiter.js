/**
 * Rate limiting middleware for API endpoints
 */

import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

import config from "./config.js";
import logger from "./logger.js";

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	skip: () => {
		try {
			return config.isTest;
		} catch {
			return false;
		}
	},
	message: {
		error: "Too many requests from this IP, please try again later.",
	},
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	handler: (req, res) => {
		logger.warn("Rate limit exceeded", {
			ip: req.ip,
			path: req.path,
			method: req.method,
		});
		res.status(429).json({
			error: "Too many requests from this IP, please try again later.",
		});
	},
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits: 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // Limit each IP to 5 login/signup attempts per windowMs
	skip: () => {
		try {
			return config.isTest;
		} catch {
			return false;
		}
	},
	message: {
		error: "Too many authentication attempts, please try again later.",
	},
	standardHeaders: true,
	legacyHeaders: false,
	skipSuccessfulRequests: true, // Don't count successful requests
	handler: (req, res) => {
		logger.warn("Auth rate limit exceeded", {
			ip: req.ip,
			path: req.path,
			email: req.body?.email,
		});
		res.status(429).json({
			error: "Too many authentication attempts, please try again later.",
		});
	},
});

/**
 * Rate limiter for password reset and sensitive operations
 * Limits: 3 requests per hour per IP
 */
export const sensitiveLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 3, // Limit each IP to 3 requests per hour
	skip: () => {
		try {
			return config.isTest;
		} catch {
			return false;
		}
	},
	message: {
		error: "Too many requests for this operation, please try again later.",
	},
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		logger.warn("Sensitive operation rate limit exceeded", {
			ip: req.ip,
			path: req.path,
		});
		res.status(429).json({
			error: "Too many requests for this operation, please try again later.",
		});
	},
});

/**
 * Speed limiter - slows down requests after a threshold
 * Slows down after 50 requests per 15 minutes
 */
export const speedLimiter = slowDown({
	windowMs: 15 * 60 * 1000, // 15 minutes
	delayAfter: 50, // Allow 50 requests per windowMs without delay
	delayMs: () => 500, // Add 500ms delay per request after delayAfter (v2 API)
	maxDelayMs: 20000, // Maximum delay of 20 seconds
	skipSuccessfulRequests: false,
	skip: () => {
		try {
			return config.isTest;
		} catch {
			return false;
		}
	},
});
