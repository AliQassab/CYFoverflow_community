import { useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";

import { useAuth } from "../contexts/useAuth";
import {
	deleteComment,
	updateComment,
	adminDeleteContent,
} from "../services/api";

import UserLink from "./UserLink";

function Comment({ comment, onUpdate, onDelete }) {
	const { isLoggedIn, user, token } = useAuth();
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState(comment.content);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [error, setError] = useState("");

	const isAuthor = isLoggedIn && user && user.id === comment.user_id;
	const isAdmin = user?.is_admin;

	const handleDelete = async () => {
		if (!window.confirm("Are you sure you want to delete this comment?")) {
			return;
		}

		setIsDeleting(true);
		setError("");

		try {
			if (isAdmin && !isAuthor) {
				await adminDeleteContent(token, "comment", comment.id);
			} else {
				await deleteComment(comment.id, token);
			}
			if (onDelete) {
				onDelete();
			}
		} catch (err) {
			setError(err.message || "Failed to delete comment");
		} finally {
			setIsDeleting(false);
		}
	};

	const handleUpdate = async () => {
		if (!editContent.trim() || editContent.trim().length < 10) {
			setError("Comment must be at least 10 characters long");
			return;
		}

		setIsUpdating(true);
		setError("");

		try {
			await updateComment(comment.id, editContent.trim(), token);
			setIsEditing(false);
			if (onUpdate) {
				onUpdate();
			}
		} catch (err) {
			setError(err.message || "Failed to update comment");
		} finally {
			setIsUpdating(false);
		}
	};

	const handleCancel = () => {
		setEditContent(comment.content);
		setIsEditing(false);
		setError("");
	};

	if (isEditing) {
		return (
			<div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
				<input
					type="text"
					value={editContent}
					onChange={(e) => setEditContent(e.target.value)}
					disabled={isUpdating}
					className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#281d80] focus:border-transparent mb-2"
					maxLength={500}
				/>
				{error && (
					<div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
						{error}
					</div>
				)}
				<div className="flex gap-2">
					<button
						onClick={handleUpdate}
						disabled={isUpdating || !editContent.trim()}
						className="px-3 py-1.5 text-sm font-semibold text-white bg-[#281d80] rounded-lg hover:bg-[#1f1566] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
					>
						{isUpdating ? "Saving..." : "Save"}
					</button>
					<button
						onClick={handleCancel}
						disabled={isUpdating}
						className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 cursor-pointer"
					>
						Cancel
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			id={`comment-${comment.id}`}
			className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg"
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<UserLink
							userId={comment.user_id}
							userName={comment.author_name}
							className="text-sm font-semibold text-gray-900"
						/>
						<span className="text-xs text-gray-500">
							{new Date(comment.created_at).toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
								year: "numeric",
								hour: "2-digit",
								minute: "2-digit",
							})}
							{comment.updated_at !== comment.created_at && (
								<span className="ml-1 italic">(edited)</span>
							)}
						</span>
					</div>
					<p className="text-sm text-gray-700 whitespace-pre-wrap wrap-break-word">
						{comment.content}
					</p>
				</div>
				{(isAuthor || isAdmin) && (
					<div className="flex gap-1 shrink-0">
						{isAuthor && (
							<button
								onClick={() => setIsEditing(true)}
								className="p-1.5 text-gray-600 hover:text-[#281d80] transition-colors"
								title="Edit comment"
								aria-label="Edit comment"
							>
								<FaEdit className="w-3.5 h-3.5" />
							</button>
						)}
						<button
							onClick={handleDelete}
							disabled={isDeleting}
							className="p-1.5 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
							title={
								isAdmin && !isAuthor
									? "Admin: Delete comment"
									: "Delete comment"
							}
							aria-label="Delete comment"
						>
							<FaTrash className="w-3.5 h-3.5" />
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

export default Comment;
