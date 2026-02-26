import express from "express";

import { authenticateToken, optionalAuthenticateToken } from "../utils/auth.js";
import logger from "../utils/logger.js";

import { voteOnAnswer, getVoteCounts, getUserVote } from "./voteService.js";

const router = express.Router();

/**
 * POST /api/votes/answer/:answerId
 * Vote on an answer (upvote or downvote)
 */
router.post("/answer/:answerId", authenticateToken(), async (req, res) => {
	try {
		const { answerId } = req.params;
		const { vote_type } = req.body;
		const userId = req.user.id;

		if (!vote_type || !["upvote", "downvote"].includes(vote_type)) {
			return res.status(400).json({
				message: "Invalid vote_type. Must be 'upvote' or 'downvote'",
			});
		}

		const result = await voteOnAnswer(parseInt(answerId), userId, vote_type);

		res.json(result);
	} catch (error) {
		logger.error("Vote on answer error: %O", error);
		res.status(error.message === "Answer not found" ? 404 : 500).json({
			message: error.message,
		});
	}
});

/**
 * GET /api/votes/answer/:answerId
 * Get vote counts and user's vote for an answer
 */
router.get(
	"/answer/:answerId",
	optionalAuthenticateToken(),
	async (req, res) => {
		try {
			const { answerId } = req.params;
			const userId = req.user?.id; // Optional, may be undefined if not logged in

			const voteCounts = await getVoteCounts(parseInt(answerId));
			const userVote = await getUserVote(parseInt(answerId), userId);

			res.json({
				...voteCounts,
				user_vote: userVote,
			});
		} catch (error) {
			logger.error("Get vote counts error: %O", error);
			res.status(500).json({ message: error.message });
		}
	},
);

export default router;
