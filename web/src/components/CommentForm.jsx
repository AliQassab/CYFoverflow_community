import { useState } from "react";
import { FaTimes } from "react-icons/fa";

import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/useAuth";
import { createComment } from "../services/api";
import { getUserFriendlyError, isOnline } from "../utils/errorMessages";

function CommentForm({ answerId, questionId, onSuccess, onCancel, token }) {
	const { showError: showToastError, showSuccess } = useToast();
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");

	const { isLoggedIn } = useAuth();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (!isLoggedIn || !token) {
			setError("Please log in to add a comment");
			return;
		}

		if (!content.trim() || content.trim().length < 10) {
			setError("Comment must be at least 10 characters long");
			return;
		}

		if (!isOnline()) {
			const errorMsg =
				"No internet connection. Please check your connection and try again.";
			setError(errorMsg);
			showToastError(errorMsg);
			return;
		}

		setIsSubmitting(true);

		try {
			await createComment(content.trim(), answerId, questionId, token);
			setContent("");
			showSuccess("Comment posted successfully!");
			if (onSuccess) {
				onSuccess();
			}
		} catch (err) {
			const friendlyError = getUserFriendlyError(
				err,
				"Failed to submit comment. Please try again.",
			);
			setError(friendlyError);
			showToastError(friendlyError);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isLoggedIn) {
		return (
			<div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
				<p className="text-sm text-gray-600">
					Please{" "}
					<a
						href="/login"
						className="text-[#281d80] hover:underline font-semibold"
					>
						log in
					</a>{" "}
					to add a comment.
				</p>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="mt-3">
			<div className="flex gap-2">
				<input
					type="text"
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder="Add a comment..."
					disabled={isSubmitting}
					className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#281d80] focus:border-transparent"
					maxLength={500}
				/>
				{onCancel && (
					<button
						type="button"
						onClick={onCancel}
						disabled={isSubmitting}
						className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
						title="Cancel"
					>
						<FaTimes className="w-4 h-4" />
					</button>
				)}
				<button
					type="submit"
					disabled={isSubmitting || !content.trim()}
					className="px-4 py-2 text-sm font-semibold text-white bg-[#281d80] rounded-lg hover:bg-[#1f1566] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
				>
					{isSubmitting ? "Posting..." : "Post"}
				</button>
			</div>
			{error && (
				<div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
					{error}
				</div>
			)}
			<div className="mt-1 text-xs text-gray-500">
				{content.length}/500 characters
			</div>
		</form>
	);
}

export default CommentForm;
