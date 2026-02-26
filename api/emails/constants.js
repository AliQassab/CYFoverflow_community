// api/emails/constants.js
import config from "../utils/config.js";

export const EMAIL_SOURCE = config.emailSource;
export const EMAIL_REGION = config.emailRegion;
export const APP_URL = config.appUrl;
export const EMAIL_MODE = config.emailMode;

// Email subjects
export const SUBJECTS = {
	ANSWER_NOTIFICATION: (questionTitle) => `New Answer to: "${questionTitle}"`,
	WELCOME: "Welcome to CYFoverflow!",
	PASSWORD_RESET: "Reset Your CYFoverflow Password",
	// We will add more subjects as needed
};
