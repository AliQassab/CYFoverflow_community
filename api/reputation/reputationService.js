import logger from "../utils/logger.js";

import * as repository from "./reputationRepository.js";

/**
 * Reputation points awarded for different actions
 */
export const REPUTATION_RULES = {
	ANSWER_UPVOTE: 10,
	ANSWER_ACCEPTED: 15,
	QUESTION_UPVOTE: 5,
	CONTENT_DOWNVOTE: -2, // For both questions and answers
};

/**
 * Update user reputation
 * @param {number} userId - User ID
 * @param {number} points - Points to add (can be negative)
 * @returns {Promise<number>} New reputation value
 */
export const updateReputation = async (userId, points) => {
	if (!userId || points === 0) {
		return;
	}

	try {
		const newReputation = await repository.updateReputationDB(userId, points);
		return newReputation;
	} catch (error) {
		logger.error("Error updating reputation", {
			userId,
			points,
			error: error.message,
		});
		throw error;
	}
};

/**
 * Handle reputation change for answer vote
 * @param {number} answerUserId - User who wrote the answer
 * @param {number} voterUserId - User who voted
 * @param {string} voteType - 'upvote' or 'downvote'
 * @param {string} previousVoteType - Previous vote type (if changing vote) or null
 * @param {boolean} isRemoved - Whether the vote was removed (toggled off)
 */
export const handleAnswerVoteReputation = async (
	answerUserId,
	voterUserId,
	voteType,
	previousVoteType = null,
	isRemoved = false,
) => {
	// Don't award reputation if user votes on their own content
	if (answerUserId === voterUserId) {
		return;
	}

	let pointsToAdd = 0;

	if (isRemoved) {
		// Vote was removed - reverse the previous reputation change
		if (previousVoteType === "upvote") {
			pointsToAdd = -REPUTATION_RULES.ANSWER_UPVOTE;
		} else if (previousVoteType === "downvote") {
			pointsToAdd = -REPUTATION_RULES.CONTENT_DOWNVOTE;
		}
	} else if (previousVoteType) {
		// Vote type changed - reverse old, apply new
		if (previousVoteType === "upvote" && voteType === "downvote") {
			// Upvote -> Downvote: remove +10, add -2 = -12 total
			pointsToAdd =
				-REPUTATION_RULES.ANSWER_UPVOTE + REPUTATION_RULES.CONTENT_DOWNVOTE;
		} else if (previousVoteType === "downvote" && voteType === "upvote") {
			// Downvote -> Upvote: remove -2, add +10 = +12 total
			pointsToAdd =
				-REPUTATION_RULES.CONTENT_DOWNVOTE + REPUTATION_RULES.ANSWER_UPVOTE;
		}
	} else {
		// New vote
		if (voteType === "upvote") {
			pointsToAdd = REPUTATION_RULES.ANSWER_UPVOTE;
		} else if (voteType === "downvote") {
			pointsToAdd = REPUTATION_RULES.CONTENT_DOWNVOTE;
		}
	}

	if (pointsToAdd !== 0) {
		await updateReputation(answerUserId, pointsToAdd);
	}
};

/**
 * Handle reputation change for question vote
 * @param {number} questionUserId - User who wrote the question
 * @param {number} voterUserId - User who voted
 * @param {string} voteType - 'upvote' or 'downvote'
 * @param {string} previousVoteType - Previous vote type (if changing vote) or null
 * @param {boolean} isRemoved - Whether the vote was removed (toggled off)
 */
export const handleQuestionVoteReputation = async (
	questionUserId,
	voterUserId,
	voteType,
	previousVoteType = null,
	isRemoved = false,
) => {
	// Don't award reputation if user votes on their own content
	if (questionUserId === voterUserId) {
		return;
	}

	let pointsToAdd = 0;

	if (isRemoved) {
		// Vote was removed - reverse the previous reputation change
		if (previousVoteType === "upvote") {
			pointsToAdd = -REPUTATION_RULES.QUESTION_UPVOTE;
		} else if (previousVoteType === "downvote") {
			pointsToAdd = -REPUTATION_RULES.CONTENT_DOWNVOTE;
		}
	} else if (previousVoteType) {
		// Vote type changed - reverse old, apply new
		if (previousVoteType === "upvote" && voteType === "downvote") {
			// Upvote -> Downvote: remove +5, add -2 = -7 total
			pointsToAdd =
				-REPUTATION_RULES.QUESTION_UPVOTE + REPUTATION_RULES.CONTENT_DOWNVOTE;
		} else if (previousVoteType === "downvote" && voteType === "upvote") {
			// Downvote -> Upvote: remove -2, add +5 = +7 total
			pointsToAdd =
				-REPUTATION_RULES.CONTENT_DOWNVOTE + REPUTATION_RULES.QUESTION_UPVOTE;
		}
	} else {
		// New vote
		if (voteType === "upvote") {
			pointsToAdd = REPUTATION_RULES.QUESTION_UPVOTE;
		} else if (voteType === "downvote") {
			pointsToAdd = REPUTATION_RULES.CONTENT_DOWNVOTE;
		}
	}

	if (pointsToAdd !== 0) {
		await updateReputation(questionUserId, pointsToAdd);
	}
};

/**
 * Handle reputation change for accepted answer
 * @param {number} answerUserId - User who wrote the answer
 * @param {boolean} isAccepted - Whether answer is being accepted (true) or unaccepted (false)
 */
export const handleAnswerAcceptedReputation = async (
	answerUserId,
	isAccepted,
) => {
	const pointsToAdd = isAccepted
		? REPUTATION_RULES.ANSWER_ACCEPTED
		: -REPUTATION_RULES.ANSWER_ACCEPTED;

	if (pointsToAdd !== 0) {
		await updateReputation(answerUserId, pointsToAdd);
	}
};

/**
 * Get user reputation
 * @param {number} userId - User ID
 * @returns {Promise<number>} User's reputation
 */
export const getUserReputation = async (userId) => {
	return repository.getUserReputationDB(userId);
};
