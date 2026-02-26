import bcrypt from "bcrypt";

import * as accountLockout from "../utils/accountLockout.js";

import * as repository from "./authRepository.js";

export async function signUp(name, email, password) {
	const normalizedEmail = email.toLowerCase().trim();
	const normalizedName = name.trim();

	const existingUser = await repository.findUserByEmail(normalizedEmail);
	if (existingUser) {
		throw new Error("An account with this email already exists.");
	}

	const hashedPassword = await bcrypt.hash(password, 10);

	const newUser = await repository.createUser(
		normalizedName,
		normalizedEmail,
		hashedPassword,
	);
	return newUser;
}

export async function login(email, password, ipAddress = null) {
	const normalizedEmail = email.toLowerCase().trim();

	const lockStatus = await accountLockout.checkAccountLocked(normalizedEmail);
	if (lockStatus.locked) {
		throw new Error(
			`Account temporarily locked due to too many failed login attempts. Please try again in ${lockStatus.lockoutMinutes} minutes.`,
		);
	}

	const user = await repository.findUserByEmail(normalizedEmail);
	if (!user) {
		if (ipAddress) {
			await accountLockout.recordFailedAttempt(normalizedEmail, ipAddress);
		}
		throw new Error("Invalid credentials.");
	}

	const match = await bcrypt.compare(password, user.hashed_password);
	if (!match) {
		if (ipAddress) {
			const attemptResult = await accountLockout.recordFailedAttempt(
				normalizedEmail,
				ipAddress,
			);
			if (attemptResult.locked) {
				throw new Error(
					`Account temporarily locked due to too many failed login attempts. Please try again in ${attemptResult.lockoutMinutes} minutes.`,
				);
			}
		}
		throw new Error("Invalid credentials.");
	}

	await accountLockout.clearFailedAttempts(normalizedEmail);

	const { hashed_password: _, ...userWithoutPassword } = user;
	return userWithoutPassword;
}
