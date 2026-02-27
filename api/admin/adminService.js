import {
	deleteContentDB,
	deleteUserDB,
	getAllUsersDB,
	getRecentContentDB,
	getStatsDB,
	setUserActiveDB,
} from "./adminRepository.js";

export const getStats = async () => {
	return getStatsDB();
};

export const getAllUsers = async ({ page, limit, search }) => {
	return getAllUsersDB({ page, limit, search });
};

export const getRecentContent = async ({ type, page, limit }) => {
	return getRecentContentDB({ type, page, limit });
};

export const setUserActive = async (userId, isActive) => {
	const user = await setUserActiveDB(userId, isActive);
	if (!user) throw new Error("User not found");
	return user;
};

export const deleteUser = async (userId) => {
	const user = await deleteUserDB(userId);
	if (!user) throw new Error("User not found");
	return user;
};

export const deleteContent = async (type, id) => {
	const content = await deleteContentDB(type, id);
	if (!content) throw new Error("Content not found");
	return content;
};
