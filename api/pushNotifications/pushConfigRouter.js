import { Router } from "express";

import config from "../utils/config.js";

const router = Router();

/**
 * GET /api/push/config
 * Returns the VAPID public key so the frontend can create push subscriptions.
 * The public key is safe to expose — only the private key must stay secret.
 */
router.get("/config", (req, res) => {
	res.json({
		vapidPublicKey: config.vapidPublicKey || null,
	});
});

export default router;
