import { Router } from "express";

import passwordResetRouter from "../passwordReset/passwordResetRouter.js";
import * as refreshTokenService from "../refreshTokens/refreshTokenService.js";
import { generateToken } from "../utils/auth.js";
import logger from "../utils/logger.js";
import { authLimiter } from "../utils/rateLimiter.js";
import validate from "../utils/validation.js";

import * as authService from "./authService.js";
import refreshRouter from "./refreshRouter.js";
import { signupSchema, loginSchema } from "./validationSchema.js";

const authRouter = Router();

// Apply rate limiting to auth endpoints
authRouter.use("/signup", authLimiter);
authRouter.use("/login", authLimiter);

authRouter.post("/signup", validate(signupSchema), async (req, res) => {
	try {
		const { name, email, password } = req.body;

		const newUser = await authService.signUp(name, email, password);
		const accessToken = generateToken(newUser.id);

		// Create refresh token
		const deviceInfo = req.headers["user-agent"] || null;
		const ipAddress = req.ip || req.connection.remoteAddress || null;
		const refreshTokenData = await refreshTokenService.createRefreshToken(
			newUser.id,
			deviceInfo,
			ipAddress,
		);

		res.status(201).json({
			user: newUser,
			accessToken,
			refreshToken: refreshTokenData.token,
			expiresAt: refreshTokenData.expiresAt.toISOString(),
		});
	} catch (error) {
		logger.error("Signup failed: %O", error);
		const statusCode = error.message?.includes("already exists") ? 409 : 500;
		res.status(statusCode).json({
			message: error.message || "Internal server error.",
		});
	}
});

authRouter.post("/login", validate(loginSchema), async (req, res) => {
	try {
		const { email, password } = req.body;
		const ipAddress = req.ip || req.connection.remoteAddress || null;

		const user = await authService.login(email, password, ipAddress);
		const accessToken = generateToken(user.id);

		// Create refresh token
		const deviceInfo = req.headers["user-agent"] || null;
		const refreshTokenData = await refreshTokenService.createRefreshToken(
			user.id,
			deviceInfo,
			ipAddress,
		);

		res.status(200).json({
			user,
			accessToken,
			refreshToken: refreshTokenData.token,
			expiresAt: refreshTokenData.expiresAt.toISOString(),
		});
	} catch (error) {
		logger.error("Login failed: %O", error);
		const statusCode = error.message?.includes("Invalid credentials")
			? 401
			: 500;
		res.status(statusCode).json({
			message: error.message || "Internal server error.",
		});
	}
});

// Mount refresh token routes
authRouter.use("/", refreshRouter);

// Mount password reset routes
authRouter.use("/", passwordResetRouter);

export default authRouter;
