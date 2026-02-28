import path from "path";
import { fileURLToPath } from "url";

import express from "express";

import apiRouter from "./api.js";
import { testConnection } from "./db.js";
import config from "./utils/config.js";
import {
	clientRouter,
	configuredCors,
	configuredHelmet,
	configuredMorgan,
	httpsOnly,
	logErrors,
} from "./utils/middleware.js";
import { generalLimiter, speedLimiter } from "./utils/rateLimiter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_ROOT = "/api";

const app = express();

app.use((req, res, next) => {
	if (req.headers["content-type"]?.includes("multipart/form-data")) {
		return next();
	}
	express.json({ limit: "10mb" })(req, res, next);
});

app.use(configuredCors());
app.use(configuredHelmet());
app.use(configuredMorgan());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Apply rate limiting to all API routes except the SSE stream
// (SSE is a long-lived connection and should not count against the limit)
const rateLimitSkipSSE = (req) => req.path === "/notifications/stream";
app.use(API_ROOT, (req, res, next) => {
	if (rateLimitSkipSSE(req)) return next();
	return generalLimiter(req, res, next);
});
app.use(API_ROOT, (req, res, next) => {
	if (rateLimitSkipSSE(req)) return next();
	return speedLimiter(req, res, next);
});

if (config.production) {
	app.enable("trust proxy");
	app.use(httpsOnly());
}

app.get("/healthz", async (_, res) => {
	await testConnection();
	res.sendStatus(200);
});

app.use(API_ROOT, apiRouter);

app.use(clientRouter(API_ROOT));

app.use(logErrors());

export default app;
