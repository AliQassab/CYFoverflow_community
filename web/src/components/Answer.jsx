import { Editor } from "@tinymce/tinymce-react";
import { useState, useEffect } from "react";
import { FaArrowUp, FaArrowDown, FaCheckCircle } from "react-icons/fa";

import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/useAuth";
import {
	voteOnAnswer,
	getCommentsByAnswerId,
	acceptAnswer,
	deleteAnswer,
	adminDeleteContent,
} from "../services/api";
import { getUserFriendlyError, isOnline } from "../utils/errorMessages";

import Comment from "./Comment";
import CommentForm from "./CommentForm";
import ConfirmDialog from "./ConfirmDialog";
import EditAnswerForm from "./EditAnswerForm";
import UserLink from "./UserLink";

function Answer({ answer, onDelete, onUpdate, questionAuthorId, onAccept }) {
	const { isLoggedIn, user, token } = useAuth();
	const { showError: showToastError, showSuccess } = useToast();
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [displayContent, setDisplayContent] = useState(
		answer.content || answer.body,
	);
	const [upvoteCount, setUpvoteCount] = useState(answer.upvote_count || 0);
	const [downvoteCount, setDownvoteCount] = useState(
		answer.downvote_count || 0,
	);
	const [userVote, setUserVote] = useState(answer.user_vote || null);
	const [isVoting, setIsVoting] = useState(false);
	const [comments, setComments] = useState([]);
	const [showCommentForm, setShowCommentForm] = useState(false);
	const [loadingComments, setLoadingComments] = useState(false);
	const [isAccepted, setIsAccepted] = useState(answer.is_accepted || false);
	const [isAccepting, setIsAccepting] = useState(false);

	const isAuthor = isLoggedIn && user && user.id === answer.user_id;
	const isAdmin = user?.is_admin;
	const currentUserId = user?.id ? Number(user.id) : null;
	const questionAuthorIdNum = questionAuthorId
		? Number(questionAuthorId)
		: null;
	const isQuestionAuthor =
		isLoggedIn &&
		currentUserId &&
		questionAuthorIdNum &&
		currentUserId === questionAuthorIdNum;

	// Update accepted state when answer prop changes
	useEffect(() => {
		setIsAccepted(answer.is_accepted || false);
	}, [answer.is_accepted]);

	// Fetch comments when answer loads
	useEffect(() => {
		const fetchComments = async () => {
			setLoadingComments(true);
			try {
				const fetchedComments = await getCommentsByAnswerId(answer.id);
				setComments(fetchedComments || []);
			} catch {
				// Silently fail - comments are non-critical
			} finally {
				setLoadingComments(false);
			}
		};

		fetchComments();
	}, [answer.id]);

	const handleDeleteClick = () => {
		setShowDeleteConfirm(true);
	};

	const handleDeleteConfirm = async () => {
		if (!token) {
			showToastError("You must be logged in to delete answers.");
			setShowDeleteConfirm(false);
			return;
		}

		if (!answer.id) {
			showToastError("Invalid answer ID.");
			setShowDeleteConfirm(false);
			return;
		}

		if (!isOnline()) {
			showToastError(
				"No internet connection. Please check your connection and try again.",
			);
			return;
		}

		setIsDeleting(true);
		setShowDeleteConfirm(false);

		try {
			if (isAdmin && !isAuthor) {
				await adminDeleteContent(token, "answer", answer.id);
			} else {
				await deleteAnswer(answer.id, token);
			}

			// Call onDelete callback with answer ID for optimistic removal
			if (onDelete) {
				onDelete(answer.id);
			}
			showSuccess("Answer deleted successfully");
		} catch (err) {
			const friendlyError = getUserFriendlyError(
				err,
				"Failed to delete answer. Please try again.",
			);
			showToastError(friendlyError);
			setIsDeleting(false);
			// Re-show the confirmation dialog on error so user can retry
			setShowDeleteConfirm(true);
		}
	};

	const handleDeleteCancel = () => {
		setShowDeleteConfirm(false);
	};

	const handleEditSuccess = (updatedAnswer) => {
		setDisplayContent(updatedAnswer.content);

		setIsEditing(false);
	};

	const handleVote = async (e, voteType) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}

		if (!isLoggedIn || !token) {
			showToastError("Please log in to vote");
			return;
		}

		if (isAuthor) {
			showToastError("You cannot vote on your own answer");
			return;
		}

		if (!isOnline()) {
			showToastError(
				"No internet connection. Please check your connection and try again.",
			);
			return;
		}

		setIsVoting(true);

		const previousVote = userVote;
		const previousUpvotes = upvoteCount;
		const previousDownvotes = downvoteCount;

		if (previousVote === voteType) {
			// Toggle off: remove vote
			setUserVote(null);
			if (voteType === "upvote") {
				setUpvoteCount(Math.max(0, upvoteCount - 1));
			} else {
				setDownvoteCount(Math.max(0, downvoteCount - 1));
			}
		} else if (previousVote === null) {
			// New vote
			setUserVote(voteType);
			if (voteType === "upvote") {
				setUpvoteCount(upvoteCount + 1);
			} else {
				setDownvoteCount(downvoteCount + 1);
			}
		} else {
			// Switch vote type
			setUserVote(voteType);
			if (previousVote === "upvote") {
				setUpvoteCount(Math.max(0, upvoteCount - 1));
				if (voteType === "downvote") {
					setDownvoteCount(downvoteCount + 1);
				}
			} else {
				setDownvoteCount(Math.max(0, downvoteCount - 1));
				if (voteType === "upvote") {
					setUpvoteCount(upvoteCount + 1);
				}
			}
		}

		try {
			const result = await voteOnAnswer(answer.id, voteType, token);
			setUpvoteCount(result.upvote_count);
			setDownvoteCount(result.downvote_count);
			setUserVote(result.user_vote);

			// Don't call onUpdate for votes - it causes page to scroll to top
			// The optimistic update is sufficient, and we've already synced with server
		} catch (err) {
			const friendlyError = getUserFriendlyError(
				err,
				"Failed to vote. Please try again.",
			);
			showToastError(friendlyError);
			// Revert optimistic update on error
			setUserVote(previousVote);
			setUpvoteCount(previousUpvotes);
			setDownvoteCount(previousDownvotes);
		} finally {
			setIsVoting(false);
		}
	};

	const handleCommentSuccess = async () => {
		// Refresh comments after adding a new one
		try {
			const fetchedComments = await getCommentsByAnswerId(answer.id);
			setComments(fetchedComments || []);
			setShowCommentForm(false);
		} catch {
			// Silently fail - comments are non-critical
		}
	};

	const handleCommentUpdate = async () => {
		try {
			const fetchedComments = await getCommentsByAnswerId(answer.id);
			setComments(fetchedComments || []);
		} catch {
			// Silently fail - comments are non-critical
		}
	};

	const handleCommentDelete = async () => {
		try {
			const fetchedComments = await getCommentsByAnswerId(answer.id);
			setComments(fetchedComments || []);
		} catch {
			// Silently fail - comments are non-critical
		}
	};

	const handleAcceptAnswer = async () => {
		if (!isLoggedIn || !token) {
			showToastError("Please log in to accept answers");
			return;
		}

		if (!isOnline()) {
			showToastError(
				"No internet connection. Please check your connection and try again.",
			);
			return;
		}

		setIsAccepting(true);

		try {
			await acceptAnswer(answer.id, token);
			setIsAccepted(true);

			// Notify parent component to refresh question and answers
			if (onAccept) {
				onAccept();
			}
			if (onUpdate) {
				onUpdate();
			}
			showSuccess("Answer accepted successfully");
		} catch (err) {
			const friendlyError = getUserFriendlyError(
				err,
				"Failed to accept answer. Please try again.",
			);
			showToastError(friendlyError);
		} finally {
			setIsAccepting(false);
		}
	};

	if (isEditing) {
		return (
			<EditAnswerForm
				answer={answer}
				initialContent={displayContent}
				onCancel={() => setIsEditing(false)}
				onSuccess={handleEditSuccess}
			/>
		);
	}

	return (
		<div
			id={`answer-${answer.id}`}
			className={`bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-4 ${
				isAccepted ? "border-green-500 border-2 bg-green-50" : "border-gray-200"
			}`}
		>
			<div className="flex gap-3 sm:gap-4">
				{/* Voting Section */}
				<div className="flex flex-col items-center gap-1 pt-1">
					<button
						type="button"
						onClick={(e) => handleVote(e, "upvote")}
						disabled={isVoting || isAuthor || !isLoggedIn}
						className={`
							flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded border-2 transition-all
							${
								userVote === "upvote"
									? "bg-[#281d80] border-[#281d80] text-white"
									: "bg-white border-gray-300 text-gray-600 hover:border-[#281d80] hover:text-[#281d80]"
							}
							${isVoting || isAuthor || !isLoggedIn ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
						`}
						title={isAuthor ? "You cannot vote on your own answer" : "Upvote"}
						aria-label="Upvote"
					>
						<FaArrowUp className="w-4 h-4" />
					</button>
					<div className="text-sm sm:text-base font-semibold text-gray-700 min-w-8 text-center">
						{upvoteCount - downvoteCount}
					</div>
					<button
						type="button"
						onClick={(e) => handleVote(e, "downvote")}
						disabled={isVoting || isAuthor || !isLoggedIn}
						className={`
							flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded border-2 transition-all
							${
								userVote === "downvote"
									? "bg-red-600 border-red-600 text-white"
									: "bg-white border-gray-300 text-gray-600 hover:border-red-600 hover:text-red-600"
							}
							${isVoting || isAuthor || !isLoggedIn ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
						`}
						title={isAuthor ? "You cannot vote on your own answer" : "Downvote"}
						aria-label="Downvote"
					>
						<FaArrowDown className="w-4 h-4" />
					</button>
				</div>

				{/* Answer Content */}
				<div className="flex-1 min-w-0">
					<div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
						{/* User Info */}
						<div className="flex items-center gap-2 sm:gap-3">
							<div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#281d80] rounded-full flex items-center justify-center text-white text-sm sm:text-base font-semibold">
								{answer.author_name
									? answer.author_name.charAt(0).toUpperCase()
									: "A"}
							</div>
							<div>
								<div className="flex items-center gap-2">
									<UserLink
										userId={answer.user_id}
										userName={answer.author_name}
										className="text-sm sm:text-base font-semibold text-gray-900"
									/>
									{isAccepted && (
										<span className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
											<FaCheckCircle className="text-green-600" />
											Accepted
										</span>
									)}
								</div>
								<p className="text-xs text-gray-500">
									{new Date(answer.created_at).toLocaleDateString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									})}
									{answer.updated_at !== answer.created_at && (
										<span className="ml-1 sm:ml-2 italic">(edited)</span>
									)}
								</p>
							</div>
						</div>

						{/* Controls */}
						<div className="flex flex-wrap items-center gap-2">
							{/* Question Author Controls - Accept Answer */}
							{isQuestionAuthor && (
								<button
									onClick={handleAcceptAnswer}
									disabled={isAccepting || isAccepted}
									className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
										isAccepted
											? "bg-green-100 text-green-700 border border-green-300 cursor-default"
											: "bg-green-600 text-white hover:bg-green-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
									}`}
									title={
										isAccepted
											? "This answer is already accepted"
											: "Accept this answer"
									}
								>
									{isAccepting ? (
										"Accepting..."
									) : isAccepted ? (
										<>
											<FaCheckCircle className="inline mr-1" />
											Accepted
										</>
									) : (
										<>
											<FaCheckCircle className="inline mr-1" />
											Accept Answer
										</>
									)}
								</button>
							)}

							{/* Answer Author Controls */}
							{isAuthor && !isDeleting && (
								<>
									<span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full whitespace-nowrap">
										Your answer
									</span>

									<button
										onClick={() => setIsEditing(true)}
										className="px-2 sm:px-3 py-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors cursor-pointer whitespace-nowrap"
										title="Edit answer"
									>
										Edit
									</button>

									<button
										onClick={handleDeleteClick}
										className="px-2 sm:px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap"
										title="Delete answer"
									>
										Delete
									</button>
								</>
							)}

							{/* Admin Controls — visible when admin is not the answer author */}
							{isAdmin && !isAuthor && !isDeleting && (
								<button
									onClick={handleDeleteClick}
									className="px-2 sm:px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap"
									title="Admin: Delete answer"
								>
									🛡️ Delete
								</button>
							)}

							{/* Show deleting indicator when deletion is in progress */}
							{isAuthor && isDeleting && (
								<span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full whitespace-nowrap italic">
									Deleting...
								</span>
							)}
						</div>
					</div>

					{/* READ-ONLY CONTENT DISPLAY */}
					<div className="answer-content-display">
						<Editor
							key={displayContent}
							tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@7/tinymce.min.js"
							initialValue={displayContent}
							disabled={true}
							init={{
								height: "auto",
								menubar: false,
								toolbar: false,
								statusbar: false,
								plugins: ["autoresize", "codesample"],
								content_style: `
									body {
										font-family: ui-sans-serif, system-ui, sans-serif;
										font-size: 14px;
										margin: 0;
										padding: 0;
										color: #374151;
									}
									p { margin-bottom: 1em; }
									pre {
										background: #f4f4f5;
										padding: 10px;
										border-radius: 5px;
										overflow-x: auto;
									}
								`,
							}}
						/>
					</div>

					{/* Comments Section */}
					<div className="mt-6 pt-4 border-t-2 border-gray-300">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-base font-bold text-gray-800">
								💬 Comments ({comments.length})
							</h3>
							{isLoggedIn && !showCommentForm && (
								<button
									onClick={() => setShowCommentForm(true)}
									className="px-3 py-1.5 text-sm font-semibold text-white bg-[#281d80] rounded-lg hover:bg-[#1f1566] transition-colors cursor-pointer shadow-sm hover:shadow-md"
								>
									+ Add Comment
								</button>
							)}
						</div>

						{/* Comments List */}
						{loadingComments ? (
							<div className="text-sm text-gray-500">Loading comments...</div>
						) : comments.length > 0 ? (
							<div className="space-y-2">
								{comments.map((comment) => (
									<Comment
										key={comment.id}
										comment={comment}
										onUpdate={handleCommentUpdate}
										onDelete={handleCommentDelete}
									/>
								))}
							</div>
						) : (
							!showCommentForm && (
								<p className="text-sm text-gray-500">No comments yet.</p>
							)
						)}

						{/* Comment Form */}
						{showCommentForm && (
							<CommentForm
								answerId={answer.id}
								token={token}
								onSuccess={handleCommentSuccess}
								onCancel={() => setShowCommentForm(false)}
							/>
						)}
					</div>
				</div>
			</div>

			{/* Delete Confirmation Dialog */}
			<ConfirmDialog
				isOpen={showDeleteConfirm}
				title="Delete Answer"
				message="Are you sure you want to delete this answer? This action cannot be undone."
				confirmText={isDeleting ? "Deleting..." : "Delete"}
				cancelText="Cancel"
				variant="danger"
				onConfirm={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
			/>
		</div>
	);
}

export default Answer;
