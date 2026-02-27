import * as answerRepository from "../answers/answerRepository.js";
import * as questionRepository from "../questions/questionRepository.js";
import logger from "../utils/logger.js";

import * as repository from "./userRepository.js";

/**
 * Get user profile with statistics
 * @param {number} userId - User ID
 * @param {number} [requestingUserId] - ID of user making the request (for privacy)
 * @returns {Promise<Object>} User profile with stats
 */
export const getUserProfile = async (userId, requestingUserId = null) => {
	try {
		// Get user profile
		const profile = await repository.getUserProfileByIdDB(userId);
		if (!profile) {
			throw new Error("User not found");
		}

		// Remove email if viewing someone else's profile (privacy)
		const isOwnProfile =
			requestingUserId &&
			parseInt(requestingUserId, 10) === parseInt(userId, 10);
		if (!isOwnProfile) {
			delete profile.email;
		}

		// Get user statistics
		const stats = await repository.getUserStatsDB(userId);

		// Get user's questions (limited to recent 10)
		const questions = await questionRepository.getQuestionsByUserIdDB(userId);
		const recentQuestions = questions.slice(0, 10);

		// Get user's answers (limited to recent 10)
		const answers =
			await answerRepository.getAnswersByUserIdWithQuestionsDB(userId);
		const recentAnswers = answers.slice(0, 10);

		return {
			...profile,
			stats: {
				questions_count: stats.questions_count || 0,
				answers_count: stats.answers_count || 0,
				comments_count: stats.comments_count || 0,
				total_upvotes_received: stats.total_upvotes_received || 0,
				total_downvotes_received: stats.total_downvotes_received || 0,
				accepted_answers_count: stats.accepted_answers_count || 0,
				net_votes:
					(stats.total_upvotes_received || 0) -
					(stats.total_downvotes_received || 0),
			},
			recent_questions: recentQuestions,
			recent_answers: recentAnswers,
		};
	} catch (error) {
		logger.error("Error getting user profile:", error);
		throw error;
	}
};

/**
 * Update user profile
 * @param {number} userId - User ID
 * @param {Object} updates - Fields to update
 * @param {string} [updates.bio] - User bio
 * @param {string} [updates.avatar_url] - Avatar URL
 * @returns {Promise<Object>} Updated user profile
 */
export const updateUserProfile = async (userId, updates) => {
	try {
		if (
			updates.avatar_url !== undefined &&
			typeof updates.avatar_url !== "string"
		) {
			throw new Error("Avatar URL must be a string");
		}

		if (
			updates.public_email !== undefined &&
			updates.public_email !== null &&
			typeof updates.public_email !== "string"
		) {
			throw new Error("Public email must be a string");
		}

		if (
			updates.is_cyf_trainee !== undefined &&
			typeof updates.is_cyf_trainee !== "boolean"
		) {
			throw new Error("is_cyf_trainee must be a boolean");
		}

		const updatedProfile = await repository.updateUserProfileDB(
			userId,
			updates,
		);
		return updatedProfile;
	} catch (error) {
		logger.error("Error updating user profile:", error);
		throw error;
	}
};
