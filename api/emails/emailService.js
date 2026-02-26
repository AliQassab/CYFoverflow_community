import AWS from "aws-sdk";

import config from "../utils/config.js";
import logger from "../utils/logger.js";

import { EMAIL_SOURCE, EMAIL_REGION, SUBJECTS, APP_URL } from "./constants.js";
import {
	getAnswerNotificationHtml,
	getAnswerNotificationText,
	getPasswordResetHtml,
	getPasswordResetText,
} from "./templates/index.js";
import { truncateContent } from "./templates/templateUtils.js";

// Configure AWS SES (only in production)
let ses = null;
const isProduction = config.production || config.emailMode === "aws";
if (isProduction) {
	AWS.config.update({
		region: EMAIL_REGION,
		accessKeyId: config.awsAccessKeyId,
		secretAccessKey: config.awsSecretAccessKey,
	});
	ses = new AWS.SES({ apiVersion: "2010-12-01" });
}

class EmailService {
	async sendAnswerNotification({
		questionAuthorEmail,
		questionAuthorName,
		questionSlug,
		questionId,
		questionTitle,
		answererName,
		answerContent,
		appUrl = APP_URL,
	}) {
		try {
			// Validate required fields
			if (!questionAuthorEmail) {
				logger.warn("EmailService: Question author email is required", {
					questionId,
				});
				return {
					success: false,
					error: "Question author email is required",
				};
			}

			if (!questionSlug) {
				logger.warn("EmailService: Question slug is required", {
					questionId,
					hasEmail: !!questionAuthorEmail,
				});
				return {
					success: false,
					error: "Question slug is required",
				};
			}

			if (!questionTitle) {
				logger.warn("EmailService: Question title is required", {
					questionId,
				});
				return {
					success: false,
					error: "Question title is required",
				};
			}

			// Build the URL with the slug
			const questionUrl = `${appUrl}/questions/${questionSlug}`;
			const truncatedAnswer = truncateContent(answerContent || "", 300);

			// Clean question title for subject (remove HTML tags, limit length)
			const cleanTitle = (questionTitle || "").replace(/<[^>]*>/g, "").trim();
			const subjectTitle =
				cleanTitle.length > 60
					? cleanTitle.substring(0, 57) + "..."
					: cleanTitle;

			const htmlContent = getAnswerNotificationHtml({
				questionAuthorName,
				questionTitle,
				answererName,
				answerContent: truncatedAnswer,
				questionUrl,
			});
			const textContent = getAnswerNotificationText({
				questionTitle,
				answererName,
				answerContent: truncatedAnswer,
				questionUrl,
			});
			const subject = SUBJECTS.ANSWER_NOTIFICATION(subjectTitle);

			// Send email: Use AWS SES in production, log to console in development
			if (isProduction && ses) {
				// Production: Use AWS SES
				const params = {
					Source: EMAIL_SOURCE,
					Destination: {
						ToAddresses: [questionAuthorEmail],
					},
					Message: {
						Subject: {
							Data: subject,
							Charset: "UTF-8",
						},
						Body: {
							Html: {
								Data: htmlContent,
								Charset: "UTF-8",
							},
							Text: {
								Data: textContent,
								Charset: "UTF-8",
							},
						},
					},
				};

				const result = await ses.sendEmail(params).promise();
				return {
					success: true,
					messageId: result.MessageId,
				};
			} else {
				// Development: Log to console (emails will work in production)
				logger.info(
					"📧 Email notification (development mode - will send in production)",
					{
						to: questionAuthorEmail,
						subject: subject,
						questionId,
						questionUrl,
					},
				);

				return {
					success: true,
					messageId: `dev-${Date.now()}`,
				};
			}
		} catch (error) {
			logger.error("EmailService: Failed to send answer notification", {
				error: error.message,
				errorCode: error.code,
				questionId,
				questionSlug,
				to: questionAuthorEmail,
			});

			return {
				success: false,
				error: error.message,
				code: error.code,
			};
		}
	}

	async sendPasswordResetEmail({ userEmail, userName, resetUrl }) {
		try {
			// Validate required fields
			if (!userEmail) {
				logger.warn("EmailService: User email is required for password reset");
				return {
					success: false,
					error: "User email is required",
				};
			}

			if (!resetUrl) {
				logger.warn("EmailService: Reset URL is required", {
					hasEmail: !!userEmail,
				});
				return {
					success: false,
					error: "Reset URL is required",
				};
			}

			const htmlContent = getPasswordResetHtml({
				userName,
				resetUrl,
			});
			const textContent = getPasswordResetText({
				userName,
				resetUrl,
			});
			const subject = SUBJECTS.PASSWORD_RESET;

			// Send email: Use AWS SES in production, log to console in development
			if (isProduction && ses) {
				// Production: Use AWS SES
				const params = {
					Source: EMAIL_SOURCE,
					Destination: {
						ToAddresses: [userEmail],
					},
					Message: {
						Subject: {
							Data: subject,
							Charset: "UTF-8",
						},
						Body: {
							Html: {
								Data: htmlContent,
								Charset: "UTF-8",
							},
							Text: {
								Data: textContent,
								Charset: "UTF-8",
							},
						},
					},
				};

				const result = await ses.sendEmail(params).promise();
				return {
					success: true,
					messageId: result.MessageId,
				};
			} else {
				logger.info(
					"📧 Password reset email (development mode - will send in production)",
					{
						to: userEmail,
						subject: subject,
						resetUrl,
					},
				);
				return {
					success: true,
					messageId: `dev-${Date.now()}`,
				};
			}
		} catch (error) {
			logger.error("EmailService: Failed to send password reset email", {
				error: error.message,
				errorCode: error.code,
				to: userEmail,
			});

			return {
				success: false,
				error: error.message,
				code: error.code,
			};
		}
	}
}

export default new EmailService();
