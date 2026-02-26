import { useState } from "react";
import { Link } from "react-router-dom";

import BackButton from "../components/BackButton";
import { requestPasswordReset } from "../services/api.js";

function ForgotPassword() {
	const [email, setEmail] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setSuccess(false);

		if (!email) {
			setError("Please enter your email address");
			return;
		}

		setLoading(true);
		try {
			const response = await requestPasswordReset(email);
			if (response.success) {
				setSuccess(true);
			} else {
				setError(response.message || "Failed to send reset email");
			}
		} catch (error) {
			setError(
				error.message || "Failed to send reset email. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
			<div className="w-full max-w-md">
				<div className="mb-4">
					<BackButton />
				</div>
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 space-y-5 sm:space-y-6">
					<div className="text-center">
						<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
							Forgot Password?
						</h2>
						<p className="text-xs sm:text-sm text-gray-600">
							Enter your email address and we&apos;ll send you a link to reset
							your password.
						</p>
					</div>

					{success ? (
						<div className="space-y-4">
							<div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-md text-sm">
								<p className="font-semibold">Email sent!</p>
								<p className="mt-1">
									If an account with that email exists, a password reset link
									has been sent. Please check your inbox and follow the
									instructions.
								</p>
							</div>
							<div className="text-center">
								<Link
									to="/login"
									className="text-sm font-semibold text-[#281d80] hover:text-[#ed4d4e] transition-colors cursor-pointer"
								>
									Back to Login
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

							<div>
								<label
									htmlFor="email"
									className="block text-sm font-semibold text-gray-700 mb-2"
								>
									Email address
								</label>
								<input
									id="email"
									name="email"
									type="email"
									autoComplete="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#281d80] focus:ring-2 focus:ring-[#281d80]/20 transition-all"
									placeholder="Enter your email"
									disabled={loading}
								/>
							</div>

							<button
								type="submit"
								disabled={loading}
								className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-[#281d80] hover:bg-[#1f1566] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#281d80] transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? "Sending..." : "Send Reset Link"}
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

export default ForgotPassword;
