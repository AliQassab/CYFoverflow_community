import * as answerRepository from "../answers/answerRepository.js";
import * as reputationService from "../reputation/reputationService.js";
import logger from "../utils/logger.js";

import * as repository from "./voteRepository.js";

/**
 * Vote on an answer
 * @param {number} answerId - The answer ID
 * @param {number} userId - The user ID
 * @param {string} voteType - 'upvote' or 'downvote'
 * @returns {Promise<Object>} Updated vote counts and user's vote
 */
export const voteOnAnswer = async (answerId, userId, voteType) => {
	if (!["upvote", "downvote"].includes(voteType)) {
		throw new Error("Invalid vote type. Must be 'upvote' or 'downvote'");
	}

	// Verify answer exists
	const answer = await answerRepository.getAnswerByIdDB(answerId);
	if (!answer) {
		throw new Error("Answer not found");
	}

	// Prevent users from voting on their own answers
	if (answer.user_id === userId) {
		throw new Error("You cannot vote on your own answer");
	}

	try {
		// Get previous vote to calculate reputation change
		const previousVote = await repository.getUserVoteDB(answerId, userId);

		const vote = await repository.createOrUpdateVoteDB(
			answerId,
			userId,
			voteType,
		);
		const voteCounts = await repository.getVoteCountsDB(answerId);
		const userVote = vote.removed ? null : vote.vote_type;

		// Update reputation (non-blocking)
		reputationService
			.handleAnswerVoteReputation(
				answer.user_id,
				userId,
				voteType,
				previousVote,
				vote.removed || false,
			)
			.catch((error) => {
				logger.error("Failed to update reputation for vote", {
					error: error.message,
				});
			});

		return {
			...voteCounts,
			user_vote: userVote,
		};
	} catch (error) {
		logger.error("Error voting on answer:", error);
		throw error;
	}
};

/**
 * Get vote counts for an answer
 * @param {number} answerId - The answer ID
 * @returns {Promise<Object>} Vote counts
 */
export const getVoteCounts = async (answerId) => {
	return repository.getVoteCountsDB(answerId);
};

/**
 * Get user's vote for an answer
 * @param {number} answerId - The answer ID
 * @param {number} userId - The user ID (optional)
 * @returns {Promise<string|null>} User's vote type or null
 */
export const getUserVote = async (answerId, userId) => {
	if (!userId) {
		return null;
	}
	return repository.getUserVoteDB(answerId, userId);
};
