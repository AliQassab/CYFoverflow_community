import { useState, useEffect } from "react";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

import BackButton from "../components/BackButton";
import { resetPassword } from "../services/api.js";

function ResetPassword() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const token = searchParams.get("token");

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!token) {
			setError("Invalid reset link. Please request a new password reset.");
		}
	}, [token]);

	const validatePassword = (pwd) => {
		if (pwd.length < 8) {
			return "Password must be at least 8 characters long.";
		}
		if (!/(?=.*[a-z])/.test(pwd)) {
			return "Password must contain at least one lowercase letter.";
		}
		if (!/(?=.*[A-Z])/.test(pwd)) {
			return "Password must contain at least one uppercase letter.";
		}
		if (!/(?=.*\d)/.test(pwd)) {
			return "Password must contain at least one number.";
		}
		if (!/(?=.*[@$!%*?&#])/.test(pwd)) {
			return "Password must contain at least one special character (@$!%*?&#).";
		}
		return null;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setSuccess(false);

		if (!token) {
			setError("Invalid reset link. Please request a new password reset.");
			return;
		}

		if (!password || !confirmPassword) {
			setError("Please fill in all fields");
			return;
		}

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		const passwordError = validatePassword(password);
		if (passwordError) {
			setError(passwordError);
			return;
		}

		setLoading(true);
		try {
			const response = await resetPassword(token, password);
			if (response.success) {
				setSuccess(true);
				// Redirect to login after 3 seconds
				setTimeout(() => {
					navigate("/login", {
						state: {
							message:
								"Password reset successful! Please log in with your new password.",
						},
					});
				}, 3000);
			} else {
				setError(response.message || "Failed to reset password");
			}
		} catch (error) {
			setError(
				error.message ||
					"Failed to reset password. The link may have expired. Please request a new one.",
			);
		} finally {
			setLoading(false);
		}
	};

	if (!token) {
		return (
			<div className="min-h-screen flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
				<div className="w-full max-w-md">
					<div className="mb-4">
						<BackButton />
					</div>
					<div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8">
						<div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-md text-sm">
							<p className="font-semibold">Invalid Reset Link</p>
							<p className="mt-1">
								This password reset link is invalid or missing. Please request a
								new password reset.
							</p>
						</div>
						<div className="mt-4 text-center">
							<Link
								to="/forgot-password"
								className="text-sm font-semibold text-[#281d80] hover:text-[#ed4d4e] transition-colors cursor-pointer"
							>
								Request New Reset Link
							</Link>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
			<div className="w-full max-w-md">
				<div className="mb-4">
					<BackButton />
				</div>
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 space-y-5 sm:space-y-6">
					<div className="text-center">
						<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
							Reset Your Password
						</h2>
						<p className="text-xs sm:text-sm text-gray-600">
							Enter your new password below.
						</p>
					</div>

					{success ? (
						<div className="space-y-4">
							<div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-md text-sm">
								<p className="font-semibold">Password Reset Successful!</p>
								<p className="mt-1">
									Your password has been reset. Redirecting to login...
								</p>
							</div>
							<div className="text-center">
								<Link
									to="/login"
									className="text-sm font-semibold text-[#281d80] hover:text-[#ed4d4e] transition-colors cursor-pointer"
								>
									Go to Login
								</Link>
							</div>
						</div>
					) : (
						<form className="space-y-5" onSubmit={handleSubmit}>
							{error && (
								<div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-md text-sm">
									{error}
								</div>
							)}

							<div className="space-y-5">
								<div>
									<label
										htmlFor="password"
										className="block text-sm font-semibold text-gray-700 mb-2"
									>
										New Password
									</label>
									<div className="relative">
										<input
											id="password"
											name="password"
											type={showPassword ? "text" : "password"}
											autoComplete="new-password"
											required
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#281d80] focus:ring-2 focus:ring-[#281d80]/20 transition-all"
											placeholder="Enter new password"
											disabled={loading}
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors cursor-pointer"
											aria-label={
												showPassword ? "Hide password" : "Show password"
											}
										>
											{showPassword ? (
												<HiEye className="w-5 h-5" />
											) : (
												<HiEyeOff className="w-5 h-5" />
											)}
										</button>
									</div>
									<p className="mt-1 text-xs text-gray-500">
										Must be at least 8 characters with uppercase, lowercase,
										number, and special character.
									</p>
								</div>

								<div>
									<label
										htmlFor="confirmPassword"
										className="block text-sm font-semibold text-gray-700 mb-2"
									>
										Confirm New Password
									</label>
									<div className="relative">
										<input
											id="confirmPassword"
											name="confirmPassword"
											type={showConfirmPassword ? "text" : "password"}
											autoComplete="new-password"
											required
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#281d80] focus:ring-2 focus:ring-[#281d80]/20 transition-all"
											placeholder="Confirm new password"
											disabled={loading}
										/>
										<button
											type="button"
											onClick={() =>
												setShowConfirmPassword(!showConfirmPassword)
											}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors cursor-pointer"
											aria-label={
												showConfirmPassword ? "Hide password" : "Show password"
											}
										>
											{showConfirmPassword ? (
												<HiEye className="w-5 h-5" />
											) : (
												<HiEyeOff className="w-5 h-5" />
											)}
										</button>
									</div>
								</div>
							</div>

							<button
								type="submit"
								disabled={loading}
								className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-[#281d80] hover:bg-[#1f1566] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#281d80] transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? "Resetting Password..." : "Reset Password"}
							</button>

							<div className="text-center">
								<Link
									to="/login"
									className="text-sm font-semibold text-[#281d80] hover:text-[#ed4d4e] transition-colors cursor-pointer"
								>
									Back to Login
								</Link>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}

export default ResetPassword;
