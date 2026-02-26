import express from "express";

import { authenticateToken } from "../utils/auth.js";
import logger from "../utils/logger.js";

import {
	createAnswer,
	getAnswersByQuestionId,
	updateAnswer,
	deleteAnswer,
	getAnswersByUserId,
	getAnswersByUserIdCount,
	acceptAnswer,
} from "./answerService.js";

const router = express.Router();

router.post("/", authenticateToken(), async (req, res) => {
	try {
		const { content, questionId } = req.body;
		const userId = req.user.id;

		const answer = await createAnswer(content, userId, questionId);
		res.status(201).json(answer);
	} catch (error) {
		logger.error("Create answer error: %O", error);
		res.status(500).json({ message: error.message });
	}
});

router.get("/user/me", authenticateToken(), async (req, res) => {
	try {
		const userId = req.user.id;
		const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : null;
		const page = req.query.page ? Number.parseInt(req.query.page, 10) : null;

		const paginationLimit = page ? limit || 10 : limit;

		const answers = await getAnswersByUserId(userId, paginationLimit, page);

		if (page) {
			const total = await getAnswersByUserIdCount(userId);
			const totalPages = Math.ceil(total / paginationLimit);

			res.json({
				answers,
				pagination: {
					currentPage: page,
					totalPages,
					totalItems: total,
					itemsPerPage: paginationLimit,
				},
			});
		} else {
			res.json(answers);
		}
	} catch (error) {
		logger.error("Get answers by user error: %O", error);
		res.status(500).json({ message: error.message });
	}
});

router.get("/:questionId", async (req, res) => {
	try {
		const { questionId } = req.params;
		const userId = req.user?.id || null; // Get user ID if authenticated
		const answers = await getAnswersByQuestionId(questionId, userId);
		res.json(answers);
	} catch (error) {
		logger.error("Get answers by questionId error: %O", error);
		res.status(500).json({ message: error.message });
	}
});

router.put("/:id", authenticateToken(), async (req, res) => {
	try {
		const { id } = req.params;
		const { content } = req.body;
		const userId = req.user.id;

		const updated = await updateAnswer(id, content, userId);
		res.json(updated);
	} catch (error) {
		logger.error("Update answer error: %O", error);
		res.status(500).json({ message: error.message });
	}
});

router.delete("/:id", authenticateToken(), async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user.id;

		const deleted = await deleteAnswer(id, userId);

		if (!deleted) {
			logger.warn("Answer deletion failed - not found or already deleted", {
				answerId: id,
				userId,
			});
			return res
				.status(404)
				.json({ message: "Answer not found or already deleted" });
		}

		res.json({ message: "Answer deleted successfully" });
	} catch (error) {
		logger.error("Delete answer error: %O", error);
		const statusCode =
			error.message === "Answer not found"
				? 404
				: error.message.includes("Unauthorized")
					? 403
					: 500;
		res
			.status(statusCode)
			.json({ message: error.message || "Failed to delete answer" });
	}
});

router.patch("/:id/accept", authenticateToken(), async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user.id;

		const acceptedAnswer = await acceptAnswer(id, userId);
		res.json(acceptedAnswer);
	} catch (error) {
		logger.error("Accept answer error: %O", error);
		const statusCode =
			error.message === "Answer not found" ||
			error.message === "Question not found"
				? 404
				: error.message.includes("Unauthorized")
					? 403
					: 500;
		res.status(statusCode).json({ message: error.message });
	}
});

export default router;
