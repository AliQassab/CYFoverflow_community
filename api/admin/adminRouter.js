import { Router } from "express";

import { getAnswersWithDeletedByQuestionIdDB } from "../answers/answerRepository.js";
import { getDeletedQuestionByIdDB } from "../questions/questionRepository.js";
import { requireAdmin } from "../utils/adminAuth.js";
import { authenticateToken } from "../utils/auth.js";
import logger from "../utils/logger.js";

import * as adminService from "./adminService.js";

const adminRouter = Router();

adminRouter.use(authenticateToken(), requireAdmin());

// GET /api/admin/stats
adminRouter.get("/stats", async (req, res) => {
	try {
		const stats = await adminService.getStats();
		res.json(stats);
	} catch (error) {
		logger.error("Get admin stats error: %O", error);
		res.status(500).json({ error: "Failed to fetch stats" });
	}
});

// GET /api/admin/users?page=1&limit=20&search=
adminRouter.get("/users", async (req, res) => {
	try {
		const page = Math.max(1, parseInt(req.query.page) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
		const search = (req.query.search || "").trim();
		const data = await adminService.getAllUsers({ page, limit, search });
		res.json(data);
	} catch (error) {
		logger.error("Get admin users error: %O", error);
		res.status(500).json({ error: "Failed to fetch users" });
	}
});

// GET /api/admin/content?type=question&page=1&limit=20
adminRouter.get("/content", async (req, res) => {
	try {
		const type = req.query.type;
		if (!["question", "answer", "comment"].includes(type))
			return res
				.status(400)
				.json({ error: "type must be question, answer, or comment" });
		const page = Math.max(1, parseInt(req.query.page) || 1);
		const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
		const data = await adminService.getRecentContent({ type, page, limit });
		res.json(data);
	} catch (error) {
		logger.error("Get admin content error: %O", error);
		res.status(500).json({ error: "Failed to fetch content" });
	}
});

// PATCH /api/admin/users/:id/block
adminRouter.patch("/users/:id/block", async (req, res) => {
	try {
		const userId = parseInt(req.params.id, 10);
		if (isNaN(userId))
			return res.status(400).json({ error: "Invalid user ID" });

		if (userId === req.user.id)
			return res
				.status(403)
				.json({ error: "You cannot block your own account" });

		const { is_active } = req.body;
		if (typeof is_active !== "boolean")
			return res.status(400).json({ error: "is_active must be a boolean" });

		const user = await adminService.setUserActive(userId, is_active);
		res.json(user);
	} catch (error) {
		logger.error("Block/unblock user error: %O", error);
		const status = error.message === "User not found" ? 404 : 500;
		res.status(status).json({ error: error.message });
	}
});

// DELETE /api/admin/users/:id
adminRouter.delete("/users/:id", async (req, res) => {
	try {
		const userId = parseInt(req.params.id, 10);
		if (isNaN(userId))
			return res.status(400).json({ error: "Invalid user ID" });

		if (userId === req.user.id)
			return res
				.status(403)
				.json({ error: "You cannot delete your own account" });

		await adminService.deleteUser(userId);
		res.json({ message: "User deleted" });
	} catch (error) {
		logger.error("Delete user error: %O", error);
		const status = error.message === "User not found" ? 404 : 500;
		res.status(status).json({ error: error.message });
	}
});

// GET /api/admin/questions/:id — view any question including soft-deleted ones
adminRouter.get("/questions/:id", async (req, res) => {
	try {
		const question = await getDeletedQuestionByIdDB(req.params.id);
		if (!question) {
			return res.status(404).json({ error: "Question not found" });
		}
		res.json(question);
	} catch (error) {
		logger.error("Admin get question error: %O", error);
		res.status(500).json({ error: "Failed to fetch question" });
	}
});

// GET /api/admin/questions/:questionId/answers — includes soft-deleted answers
adminRouter.get("/questions/:questionId/answers", async (req, res) => {
	try {
		const questionId = parseInt(req.params.questionId, 10);
		if (isNaN(questionId))
			return res.status(400).json({ error: "Invalid question ID" });
		const answers = await getAnswersWithDeletedByQuestionIdDB(questionId);
		res.json(answers);
	} catch (error) {
		logger.error("Admin get answers error: %O", error);
		res.status(500).json({ error: "Failed to fetch answers" });
	}
});

// DELETE /api/admin/content/:type/:id
adminRouter.delete("/content/:type/:id", async (req, res) => {
	try {
		const { type, id } = req.params;
		const contentId = parseInt(id, 10);
		if (isNaN(contentId))
			return res.status(400).json({ error: "Invalid content ID" });

		await adminService.deleteContent(type, contentId);
		res.json({ message: "Content deleted" });
	} catch (error) {
		logger.error("Delete content error: %O", error);
		const status = error.message.includes("not found") ? 404 : 400;
		res.status(status).json({ error: error.message });
	}
});

export default adminRouter;
