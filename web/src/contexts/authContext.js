import { createContext } from "react";

export const AuthContext = createContext({
	login: async () => {},
	signUp: async () => {},
	logout: async () => {},
	refreshToken: async () => {},
	isLoggedIn: false,
	user: null,
	token: null,
	isRefreshing: false,
});
