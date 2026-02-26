import express from "express";

import { authenticateToken } from "../utils/auth.js";
import logger from "../utils/logger.js";

import {
	createCommentOnAnswer,
	createCommentOnQuestion,
	getCommentsByAnswerId,
	getCommentsByQuestionId,
	getCommentsForAnswers,
	updateComment,
	deleteComment,
} from "./commentService.js";

const router = express.Router();

/**
 * POST /api/comments
 * Create a new comment on an answer or question
 * Requires either answer_id OR question_id (but not both)
 */
router.post("/", authenticateToken(), async (req, res) => {
	try {
		const { content, answer_id, question_id } = req.body;
		const userId = req.user.id;

		if (!content) {
			return res.status(400).json({
				message: "Content is required",
			});
		}

		if (!answer_id && !question_id) {
			return res.status(400).json({
				message: "Either answer_id or question_id is required",
			});
		}

		if (answer_id && question_id) {
			return res.status(400).json({
				message: "Cannot specify both answer_id and question_id",
			});
		}

		let comment;
		if (answer_id) {
			comment = await createCommentOnAnswer(content, answer_id, userId);
		} else {
			comment = await createCommentOnQuestion(content, question_id, userId);
		}

		res.status(201).json(comment);
	} catch (error) {
		logger.error("Create comment error: %O", error);
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

/**
 * GET /api/comments/answer/:answerId
 * Get all comments for an answer
 */
router.get("/answer/:answerId", async (req, res) => {
	try {
		const { answerId } = req.params;
		const comments = await getCommentsByAnswerId(parseInt(answerId));
		res.json(comments);
	} catch (error) {
		logger.error("Get comments error: %O", error);
		res.status(500).json({ message: error.message });
	}
});

/**
 * GET /api/comments/question/:questionId
 * Get all comments for a question
 */
router.get("/question/:questionId", async (req, res) => {
	try {
		const { questionId } = req.params;
		const comments = await getCommentsByQuestionId(parseInt(questionId));
		res.json(comments);
	} catch (error) {
		logger.error("Get question comments error: %O", error);
		res.status(500).json({ message: error.message });
	}
});

/**
 * POST /api/comments/batch
 * Get comments for multiple answers (for performance)
 */
router.post("/batch", async (req, res) => {
	try {
		const { answer_ids } = req.body;

		if (!Array.isArray(answer_ids)) {
			return res.status(400).json({
				message: "answer_ids must be an array",
			});
		}

		const comments = await getCommentsForAnswers(answer_ids);
		res.json(comments);
	} catch (error) {
		logger.error("Get comments batch error: %O", error);
		res.status(500).json({ message: error.message });
	}
});

/**
 * PUT /api/comments/:id
 * Update a comment
 */
router.put("/:id", authenticateToken(), async (req, res) => {
	try {
		const { id } = req.params;
		const { content } = req.body;
		const userId = req.user.id;

		if (!content) {
			return res.status(400).json({
				message: "Content is required",
			});
		}

		const updated = await updateComment(parseInt(id), content, userId);
		res.json(updated);
	} catch (error) {
		logger.error("Update comment error: %O", error);
		const statusCode =
			error.message === "Comment not found"
				? 404
				: error.message.includes("Unauthorized")
					? 403
					: 500;
		res.status(statusCode).json({ message: error.message });
	}
});

/**
 * DELETE /api/comments/:id
 * Delete a comment
 */
router.delete("/:id", authenticateToken(), async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user.id;

		await deleteComment(parseInt(id), userId);
		res.json({ message: "Comment deleted" });
	} catch (error) {
		logger.error("Delete comment error: %O", error);
		const statusCode =
			error.message === "Comment not found"
				? 404
				: error.message.includes("Unauthorized")
					? 403
					: 500;
		res.status(statusCode).json({ message: error.message });
	}
});

export default router;
