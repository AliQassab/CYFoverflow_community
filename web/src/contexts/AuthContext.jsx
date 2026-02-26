import { useState, useMemo, useCallback, useRef, useEffect } from "react";

import * as api from "../services/api";

import { AuthContext } from "./authContext";

const TOKEN_KEY = "auth_data";
const REFRESH_TOKEN_KEY = "refresh_token";

export function AuthProvider({ children }) {
	const authData = (() => {
		try {
			return JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
		} catch {
			return null;
		}
	})();
	const refreshTokenData = localStorage.getItem(REFRESH_TOKEN_KEY);

	const [isLoggedIn, setIsLoggedIn] = useState(!!authData);
	const [user, setUser] = useState(authData?.user);
	const [token, setToken] = useState(authData?.token);
	const [refreshToken, setRefreshToken] = useState(refreshTokenData);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const refreshPromiseRef = useRef(null);

	// Logout function (defined early so it can be used in refreshTokenFn)
	const logout = useCallback(async () => {
		const currentRefreshToken = refreshToken;

		if (currentRefreshToken) {
			try {
				await api.logout(currentRefreshToken);
			} catch {
				// Non-blocking - continue with logout
			}
		}

		setUser(null);
		setToken(null);
		setRefreshToken(null);
		setIsLoggedIn(false);

		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(REFRESH_TOKEN_KEY);
	}, [refreshToken]);

	// Refresh token function
	const refreshTokenFn = useCallback(async () => {
		if (!refreshToken || isRefreshing) {
			return null;
		}

		// If refresh is already in progress, return the existing promise
		if (refreshPromiseRef.current) {
			return refreshPromiseRef.current;
		}

		setIsRefreshing(true);
		const promise = (async () => {
			try {
				const response = await api.refreshAccessToken(refreshToken);
				const { accessToken, refreshToken: newRefreshToken } = response;

				setToken(accessToken);
				setRefreshToken(newRefreshToken);
				localStorage.setItem(
					TOKEN_KEY,
					JSON.stringify({ token: accessToken, user }),
				);
				localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);

				return accessToken;
			} catch {
				// Refresh failed - logout user
				logout();
				return null;
			} finally {
				setIsRefreshing(false);
				refreshPromiseRef.current = null;
			}
		})();

		refreshPromiseRef.current = promise;
		return promise;
	}, [refreshToken, isRefreshing, user, logout]);

	// Auto-refresh token before expiration (every 14 minutes)
	useEffect(() => {
		if (!refreshToken || !isLoggedIn) {
			return;
		}

		// Refresh token every 14 minutes (access token expires in 15 minutes)
		const interval = setInterval(
			() => {
				refreshTokenFn();
			},
			14 * 60 * 1000,
		); // 14 minutes

		return () => clearInterval(interval);
	}, [refreshToken, isLoggedIn, refreshTokenFn]);

	const login = async (email, password) => {
		const response = await api.login(email, password);
		const {
			user: userData,
			accessToken,
			refreshToken: refreshTokenData,
		} = response;

		setUser(userData);
		setToken(accessToken);
		setRefreshToken(refreshTokenData);
		setIsLoggedIn(true);

		localStorage.setItem(
			TOKEN_KEY,
			JSON.stringify({ token: accessToken, user: userData }),
		);
		localStorage.setItem(REFRESH_TOKEN_KEY, refreshTokenData);

		return response;
	};

	const signUp = async (name, email, password) => {
		const response = await api.signUp(name, email, password);
		const {
			user: userData,
			accessToken,
			refreshToken: refreshTokenData,
		} = response;

		setUser(userData);
		setToken(accessToken);
		setRefreshToken(refreshTokenData);
		setIsLoggedIn(true);

		localStorage.setItem(
			TOKEN_KEY,
			JSON.stringify({ token: accessToken, user: userData }),
		);
		localStorage.setItem(REFRESH_TOKEN_KEY, refreshTokenData);

		return response;
	};

	const value = useMemo(
		() => ({
			login,
			signUp,
			logout,
			refreshToken: refreshTokenFn,
			isLoggedIn,
			user,
			token,
			isRefreshing,
		}),
		[isLoggedIn, user, token, isRefreshing, refreshTokenFn, logout],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
