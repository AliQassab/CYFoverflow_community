import { Editor } from "@tinymce/tinymce-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { FaEdit, FaTrash, FaCheckCircle, FaArrowLeft } from "react-icons/fa";
import { useParams, useNavigate, useLocation } from "react-router-dom";

import Answer from "../components/Answer";
import AnswerForm from "../components/AnswerForm";
import Comment from "../components/Comment";
import CommentForm from "../components/CommentForm";
import ConfirmDialog from "../components/ConfirmDialog";
import LabelBadge from "../components/LabelBadge";
import Sidebar from "../components/Sidebar";
import SimilarQuestions from "../components/SimilarQuestions";
import UserLink from "../components/UserLink";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/useAuth";
import {
	getCommentsByQuestionId,
	adminDeleteContent,
	getAdminQuestion,
	getAdminAnswers,
} from "../services/api";
import { getUserFriendlyError, isOnline } from "../utils/errorMessages";
import { capitalizeTitle } from "../utils/questionUtils.jsx";

function QuestionDetailPage() {
	const { id: identifier } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const { isLoggedIn, token, user } = useAuth();
	const { showError: showToastError, showSuccess } = useToast();
	const [question, setQuestion] = useState(null);
	const [answers, setAnswers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [showAnswerForm, setShowAnswerForm] = useState(false);
	const [questionComments, setQuestionComments] = useState([]);
	const [showQuestionCommentForm, setShowQuestionCommentForm] = useState(false);
	const [loadingQuestionComments, setLoadingQuestionComments] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isDeletedQuestion, setIsDeletedQuestion] = useState(false);
	const editorRef = useRef(null);
	const answerFormRef = useRef(null);

	const fromAdmin = location.state?.fromAdmin;

	const fetchQuestion = useCallback(async () => {
		try {
			setLoading(true);
			setError("");

			if (!isOnline()) {
				throw new Error("No internet connection");
			}

			let data;

			if (fromAdmin && token) {
				// When coming from admin, use the admin endpoint so deleted questions
				// are still visible instead of returning a 404.
				data = await getAdminQuestion(token, identifier);
			} else {
				const response = await fetch(`/api/questions/${identifier}`);
				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.message || "Failed to fetch question");
				}
				data = await response.json();
			}

			setQuestion(data);
			setIsDeletedQuestion(!!data.deleted_at);
		} catch (err) {
			const friendlyError = getUserFriendlyError(
				err,
				"Failed to load question. Please try again later.",
			);
			setError(friendlyError);
			showToastError(friendlyError);
		} finally {
			setLoading(false);
		}
	}, [identifier, fromAdmin, token, showToastError]);

	const fetchAnswers = useCallback(async () => {
		try {
			const questionId = question?.id || identifier;
			let data;

			if (fromAdmin && token) {
				// Admin endpoint returns all answers including soft-deleted ones
				data = await getAdminAnswers(token, questionId);
			} else {
				const response = await fetch(`/api/answers/${questionId}`);
				if (!response.ok) throw new Error("Failed to fetch answers");
				data = await response.json();
			}

			setAnswers(data || []);
		} catch {
			setAnswers([]);
		}
	}, [question?.id, identifier, fromAdmin, token]);

	const fetchQuestionComments = useCallback(async () => {
		if (!question?.id) return;
		setLoadingQuestionComments(true);
		try {
			const comments = await getCommentsByQuestionId(question.id);
			setQuestionComments(comments || []);
		} catch {
			// Silently fail - comments are non-critical
			setQuestionComments([]);
		} finally {
			setLoadingQuestionComments(false);
		}
	}, [question?.id]);

	useEffect(() => {
		fetchQuestion();
	}, [fetchQuestion]);

	useEffect(() => {
		if (question?.id) {
			fetchAnswers();
			fetchQuestionComments();
		}
	}, [question?.id, fetchAnswers, fetchQuestionComments]);

	const isInitialLoad = useRef(true);
	const previousQuestionId = useRef(null);

	useEffect(() => {
		if (question?.id !== previousQuestionId.current) {
			isInitialLoad.current = true;
			previousQuestionId.current = question?.id;
		}

		if (location.hash && !loading) {
			const hashId = location.hash.replace("#", "");

			// Handle answer hash
			if (hashId.startsWith("answer-") && answers.length > 0) {
				const answerElement = document.getElementById(hashId);
				if (answerElement) {
					setTimeout(() => {
						answerElement.scrollIntoView({
							behavior: "smooth",
							block: "start",
						});
					}, 100);
					return;
				}
			}

			// Handle comment hash - try to find comment element
			// Comments can be on questions or answers, so we check periodically
			if (hashId.startsWith("comment-")) {
				const scrollToComment = () => {
					const commentElement = document.getElementById(hashId);
					if (commentElement) {
						setTimeout(() => {
							commentElement.scrollIntoView({
								behavior: "smooth",
								block: "start",
							});
						}, 100);
						return true;
					}
					return false;
				};

				// Try immediately
				if (scrollToComment()) {
					return;
				}

				// If not found, wait a bit and retry (comments might still be loading)
				// Retry up to 5 times with increasing delays
				let retries = 0;
				const maxRetries = 5;
				const retryInterval = setInterval(() => {
					retries++;
					if (scrollToComment() || retries >= maxRetries) {
						clearInterval(retryInterval);
					}
				}, 300);

				// Cleanup interval on unmount or hash change
				return () => clearInterval(retryInterval);
			}
		} else if (
			!location.hash &&
			!loading &&
			question &&
			isInitialLoad.current
		) {
			window.scrollTo({ top: 0, behavior: "instant" });
			isInitialLoad.current = false;
		}
	}, [
		location.hash,
		answers.length,
		questionComments.length,
		loading,
		question,
	]);

	useEffect(() => {
		if (isLoggedIn && !loading && question) {
			const searchParams = new URLSearchParams(location.search);
			if (searchParams.get("answer") === "true") {
				setShowAnswerForm(true);
				const newUrl = window.location.pathname + (location.hash || "");
				window.history.replaceState({}, "", newUrl);
				setTimeout(() => {
					answerFormRef.current?.scrollIntoView({
						behavior: "smooth",
						block: "start",
					});
				}, 300);
			}
		}
	}, [isLoggedIn, loading, question, location.search, location.hash]);

	const handleAnswerClick = () => {
		if (!isLoggedIn) {
			const returnTo = question?.slug
				? `/questions/${question.slug}?answer=true`
				: `/questions/${identifier}?answer=true`;
			navigate("/login", {
				state: {
					message: "Please log in to answer questions",
					returnTo,
				},
			});
			return;
		}
		setShowAnswerForm(true);
		setTimeout(() => {
			answerFormRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}, 100);
	};

	const handleAnswerSuccess = () => {
		setShowAnswerForm(false);
		fetchQuestion();
		fetchAnswers();
	};

	const handleAnswerDelete = (deletedAnswerId) => {
		// Optimistically remove the answer from the UI immediately
		setAnswers((prevAnswers) => {
			return prevAnswers.filter((a) => a.id !== deletedAnswerId);
		});

		// Mark that an answer was deleted so MyResponsesPage can refresh
		// Use sessionStorage so it persists across navigation
		const timestamp = Date.now().toString();
		sessionStorage.setItem("answerDeleted", "true");
		sessionStorage.setItem("answerDeletedTimestamp", timestamp);

		// Dispatch custom events to trigger notification refresh
		window.dispatchEvent(new CustomEvent("answerDeleted"));
		window.dispatchEvent(new CustomEvent("notificationsChanged"));

		// Then refresh from server to ensure consistency (with a small delay to let optimistic update render)
		setTimeout(() => {
			fetchQuestion();
			fetchAnswers();
		}, 100);
	};

	const handleAnswerCancel = () => {
		setShowAnswerForm(false);
	};

	const handleQuestionCommentSuccess = async () => {
		// Refresh question comments after adding a new one
		await fetchQuestionComments();
		setShowQuestionCommentForm(false);
	};

	const handleQuestionCommentUpdate = async () => {
		// Refresh question comments after update
		await fetchQuestionComments();
	};

	const handleQuestionCommentDelete = async () => {
		// Refresh question comments after delete
		await fetchQuestionComments();
	};

	const handleMarkSolved = async (isSolved) => {
		if (!isLoggedIn || !token) return;

		try {
			const questionId = question?.id || identifier;
			const response = await fetch(`/api/questions/${questionId}/solve`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ isSolved }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to update solved status");
			}

			const updatedQuestion = await response.json();
			setQuestion(updatedQuestion);
			showSuccess(
				isSolved ? "Question marked as solved" : "Question marked as unsolved",
			);
		} catch (err) {
			const friendlyError = getUserFriendlyError(
				err,
				"Failed to update solved status",
			);
			showToastError(friendlyError);
		}
	};

	const isQuestionAuthor =
		isLoggedIn && user && question && user.id === question.user_id;

	const isAdmin = isLoggedIn && user?.is_admin;

	const handleDeleteClick = () => {
		setShowDeleteConfirm(true);
	};

	const handleDeleteConfirm = async () => {
		if (!isLoggedIn || !token) {
			setError("You must be logged in to delete questions.");
			setShowDeleteConfirm(false);
			return;
		}

		setIsDeleting(true);
		setError("");

		try {
			const questionId = question?.id || identifier;

			// Admin deleting someone else's question uses admin endpoint
			if (isAdmin && !isQuestionAuthor) {
				await adminDeleteContent(token, "question", questionId);
				window.dispatchEvent(new CustomEvent("notificationsChanged"));
				showSuccess("Question deleted successfully");
				navigate("/admin", {
					state: {
						restoreContentTab: location.state?.adminContentTab,
						restoreContentPage: location.state?.adminContentPage,
						restoreContentItemId: location.state?.adminContentItemId,
					},
				});
				return;
			}

			const response = await fetch(`/api/questions/${questionId}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to delete question");
			}

			// Dispatch custom event to trigger notification refresh
			window.dispatchEvent(new CustomEvent("notificationsChanged"));

			// Preserve page number when navigating back after deletion
			if (location.state?.fromAdmin) {
				navigate("/admin", {
					state: {
						restoreContentTab: location.state?.adminContentTab,
						restoreContentPage: location.state?.adminContentPage,
						restoreContentItemId: location.state?.adminContentItemId,
					},
				});
			} else if (location.state?.fromMyResponses) {
				navigate("/my-responses");
			} else if (location.state?.fromMyQuestions) {
				navigate("/my-questions");
			} else if (location.state?.returnPage) {
				// Preserve page number when going back to home
				const returnPage = location.state.returnPage;
				const returnPath = location.state.returnPath || "/";
				const returnSearch = location.state.returnSearch || "";

				// Build URL with page parameter
				const searchParams = new URLSearchParams(returnSearch);
				if (returnPage > 1) {
					searchParams.set("page", returnPage.toString());
				}

				const queryString = searchParams.toString();
				const backUrl = queryString
					? `${returnPath}?${queryString}`
					: returnPath;
				navigate(backUrl);
			} else {
				// No state - go to home page 1
				navigate("/");
			}
			showSuccess("Question deleted successfully");
		} catch (err) {
			const friendlyError = getUserFriendlyError(
				err,
				"Failed to delete question. Please try again.",
			);
			setError(friendlyError);
			showToastError(friendlyError);
			setIsDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	const handleDeleteCancel = () => {
		setShowDeleteConfirm(false);
	};

	const handleEdit = () => {
		const editIdentifier = question?.slug || question?.id || identifier;
		navigate(`/questions/${editIdentifier}/edit`, {
			state: { questionData: question },
		});
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[#efeef8]">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="flex gap-8">
						<Sidebar />
						<main className="flex-1">
							<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
								<div className="text-center py-8">
									<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#281d80] mx-auto"></div>
									<p className="mt-4 text-gray-600">Loading question...</p>
								</div>
							</div>
						</main>
					</div>
				</div>
			</div>
		);
	}

	if (error || !question) {
		const handleErrorBack = () => {
			if (fromAdmin) {
				navigate("/admin", {
					state: {
						restoreContentTab: location.state?.adminContentTab,
						restoreContentPage: location.state?.adminContentPage,
						restoreContentItemId: location.state?.adminContentItemId,
					},
				});
			} else {
				navigate("/");
			}
		};

		return (
			<div className="min-h-screen bg-gray-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="flex gap-8">
						<Sidebar />
						<main className="flex-1">
							<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
								<div className="text-center py-8">
									<p className="text-red-600 mb-2">
										{fromAdmin
											? "This question has already been deleted by another moderator."
											: error || "Question not found"}
									</p>
									{error && fromAdmin && (
										<p className="text-gray-500 text-sm mb-4">{error}</p>
									)}
									<button
										onClick={handleErrorBack}
										className="bg-[#281d80] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#1f1566] transition-all duration-200 cursor-pointer"
									>
										{fromAdmin ? "Back to Admin Dashboard" : "Go Back Home"}
									</button>
								</div>
							</div>
						</main>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
				<div className="flex flex-col md:flex-row gap-4 md:gap-8">
					<Sidebar />

					<main className="flex-1 min-w-0">
						<div className="mb-3 md:mb-4">
							<button
								onClick={() => {
									if (location.state?.fromAdmin) {
										navigate("/admin", {
											state: {
												restoreContentTab: location.state?.adminContentTab,
												restoreContentPage: location.state?.adminContentPage,
												restoreContentItemId:
													location.state?.adminContentItemId,
											},
										});
									} else if (location.state?.fromMyResponses) {
										navigate("/my-responses");
									} else if (location.state?.fromMyQuestions) {
										navigate("/my-questions");
									} else if (location.state?.returnPage) {
										// Preserve page number when going back to home
										const returnPage = location.state.returnPage;
										const returnPath = location.state.returnPath || "/";
										const returnSearch = location.state.returnSearch || "";

										// Build URL with page parameter
										const searchParams = new URLSearchParams(returnSearch);
										if (returnPage > 1) {
											searchParams.set("page", returnPage.toString());
										}

										const queryString = searchParams.toString();
										const backUrl = queryString
											? `${returnPath}?${queryString}`
											: returnPath;
										navigate(backUrl);
									} else {
										// No state (direct URL access) - use browser back or go to home
										if (window.history.length > 1) {
											navigate(-1);
										} else {
											navigate("/");
										}
									}
								}}
								className="flex items-center gap-2 text-sm sm:text-base text-gray-600 hover:text-[#281d80] transition-colors duration-200 cursor-pointer"
							>
								<FaArrowLeft className="w-4 h-4" />
								<span className="font-medium">
									{location.state?.fromAdmin
										? "Back to Admin Dashboard"
										: location.state?.fromMyResponses
											? "Back to My Responses"
											: location.state?.fromMyQuestions
												? "Back to My Questions"
												: "Back to Home"}
								</span>
							</button>
						</div>
						{isDeletedQuestion && (
							<div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-300 text-red-700">
								<FaTrash className="w-4 h-4 shrink-0" />
								<div>
									<span className="font-semibold">
										This question has been deleted.
									</span>
									<span className="ml-2 text-sm text-red-600">
										You are viewing it as an admin. It is no longer visible to
										regular users.
									</span>
								</div>
							</div>
						)}

						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
							<div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-3 md:mb-4">
								<div className="flex-1 min-w-0">
									<div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
										<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 wrap-break-word">
											{capitalizeTitle(question.title)}
										</h1>
										{question.is_solved && (
											<span className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap">
												<svg
													className="w-3 h-3 sm:w-4 sm:h-4"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path
														fillRule="evenodd"
														d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
														clipRule="evenodd"
													/>
												</svg>
												Solved
											</span>
										)}
										{question.answer_count > 0 && (
											<span className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-green-100 text-green-800 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap">
												<svg
													className="w-3 h-3 sm:w-4 sm:h-4"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path
														fillRule="evenodd"
														d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
														clipRule="evenodd"
													/>
												</svg>
												{question.answer_count}{" "}
												{question.answer_count === 1 ? "Answer" : "Answers"}
											</span>
										)}
									</div>
								</div>
								<div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">
									{!isDeletedQuestion && isQuestionAuthor && (
										<>
											<button
												onClick={handleEdit}
												className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer bg-gray-100 text-gray-700 hover:bg-gray-200"
												title="Edit question"
												aria-label="Edit question"
											>
												<FaEdit className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
											</button>
											<button
												onClick={handleDeleteClick}
												disabled={isDeleting}
												className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
												title="Delete question"
												aria-label="Delete question"
											>
												<FaTrash className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
											</button>
											<button
												onClick={() => handleMarkSolved(!question.is_solved)}
												className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer ${
													question.is_solved
														? "bg-gray-200 text-gray-700 hover:bg-gray-300"
														: "bg-blue-600 text-white hover:bg-blue-700"
												}`}
												title={
													question.is_solved
														? "Mark as unsolved"
														: "Mark as solved"
												}
												aria-label={
													question.is_solved
														? "Mark as unsolved"
														: "Mark as solved"
												}
											>
												<FaCheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
											</button>
										</>
									)}
									{!isDeletedQuestion && isAdmin && !isQuestionAuthor && (
										<button
											onClick={handleDeleteClick}
											disabled={isDeleting}
											className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm cursor-pointer bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
											title="Admin: Delete this question"
										>
											<FaTrash className="w-3 h-3" />
											🛡️ Delete
										</button>
									)}
									{!isDeletedQuestion && !isQuestionAuthor && (
										<button
											onClick={handleAnswerClick}
											className="bg-[#281d80] text-white px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-2.5 rounded-lg text-xs sm:text-sm md:text-base font-semibold hover:bg-[#1f1566] transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer whitespace-nowrap"
										>
											Answer
										</button>
									)}
								</div>
							</div>

							<div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 md:gap-4 text-xs sm:text-sm text-gray-600 mb-4 md:mb-6 flex-wrap">
								<span className="whitespace-nowrap">
									Asked by{" "}
									<UserLink
										userId={question.user_id}
										userName={question.author_name}
										className="font-semibold"
									/>
								</span>
								<span className="hidden sm:inline">•</span>
								<span className="break-words sm:whitespace-normal">
									{new Date(question.created_at).toLocaleDateString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									})}
									{question.updated_at !== question.created_at && (
										<span className="ml-1 sm:ml-2 italic text-gray-500">
											(edited)
										</span>
									)}
								</span>
								{question.labels && question.labels.length > 0 && (
									<>
										<span className="hidden sm:inline">•</span>
										<div className="flex gap-2 flex-wrap">
											{question.labels.map((label) => (
												<LabelBadge
													key={label.id}
													label={label}
													onClick={(l) => {
														navigate("/", { state: { labelId: l.id } });
													}}
												/>
											))}
										</div>
									</>
								)}
							</div>

							<div className="question-content-display">
								<Editor
									tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@7/tinymce.min.js"
									onInit={(evt, editor) => (editorRef.current = editor)}
									initialValue={question.content || question.body}
									disabled={true}
									init={{
										readonly: true,
										menubar: false,
										toolbar: false,
										statusbar: false,
										plugins: "codesample",
										content_style: `
											body {
												font-family: ui-sans-serif, system-ui, sans-serif;
												font-size: 14px;
												margin: 0;
												padding: 0;
												overflow: visible;
											}
											hr { border: none; border-top: 1px dashed #ccc; margin: 10px 0; }
											pre {
												background: #f4f4f5;
												padding: 10px;
												border-radius: 5px;
												max-height: 400px;
												overflow-y: auto;
												overflow-x: auto;
												margin: 1em 0;
											}
											pre code {
												display: block;
												white-space: pre;
											}
											h3 { font-size: 1.2em; font-weight: 600; margin-top: 1em; margin-bottom: 0.5em; }
										`,
									}}
								/>
							</div>

							{question.browser && (
								<div className="mt-4 pt-4 border-t border-gray-200">
									<p className="text-sm text-gray-600">
										<strong>Browser:</strong> {question.browser}
									</p>
								</div>
							)}

							{question.os && (
								<div className="mt-2">
									<p className="text-sm text-gray-600">
										<strong>OS:</strong> {question.os}
									</p>
								</div>
							)}

							{question.documentation_link && (
								<div className="mt-2">
									<p className="text-sm text-gray-600">
										<strong>Documentation:</strong>{" "}
										<a
											href={question.documentation_link}
											target="_blank"
											rel="noopener noreferrer"
											className="text-[#281d80] hover:underline cursor-pointer"
										>
											{question.documentation_link}
										</a>
									</p>
								</div>
							)}

							{/* Question Comments Section */}
							<div className="mt-6 pt-4 border-t-2 border-gray-300">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-base font-bold text-gray-800">
										💬 Comments ({questionComments.length})
									</h3>
									{isLoggedIn && !showQuestionCommentForm && (
										<button
											onClick={() => setShowQuestionCommentForm(true)}
											className="px-3 py-1.5 text-sm font-semibold text-white bg-[#281d80] rounded-lg hover:bg-[#1f1566] transition-colors cursor-pointer shadow-sm hover:shadow-md"
										>
											+ Add Comment
										</button>
									)}
								</div>

								{/* Comments List */}
								{loadingQuestionComments ? (
									<div className="text-sm text-gray-500">
										Loading comments...
									</div>
								) : questionComments.length > 0 ? (
									<div className="space-y-2">
										{questionComments.map((comment) => (
											<Comment
												key={comment.id}
												comment={comment}
												onUpdate={handleQuestionCommentUpdate}
												onDelete={handleQuestionCommentDelete}
											/>
										))}
									</div>
								) : (
									!showQuestionCommentForm && (
										<p className="text-sm text-gray-500">No comments yet.</p>
									)
								)}

								{/* Comment Form */}
								{showQuestionCommentForm && (
									<CommentForm
										questionId={question.id}
										token={token}
										onSuccess={handleQuestionCommentSuccess}
										onCancel={() => setShowQuestionCommentForm(false)}
									/>
								)}
							</div>
						</div>

						{showAnswerForm && (
							<div ref={answerFormRef}>
								<AnswerForm
									questionId={question?.id || identifier}
									token={token}
									onSuccess={handleAnswerSuccess}
									onCancel={handleAnswerCancel}
								/>
							</div>
						)}

						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
							<h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
								Answers ({question.answer_count ?? answers.length})
							</h2>
							{answers.length === 0 ? (
								<p className="text-gray-600">
									No answers yet. Be the first to answer!
								</p>
							) : (
								<div className="space-y-4">
									{answers.map((answer) => (
										<Answer
											key={answer.id}
											answer={answer}
											questionAuthorId={question?.user_id}
											onDelete={handleAnswerDelete}
											onUpdate={fetchAnswers}
											onAccept={() => {
												fetchQuestion();
												fetchAnswers();
											}}
										/>
									))}
								</div>
							)}
						</div>

						{/* Similar Questions Section */}
						{question?.id && (
							<div className="mt-4 md:mt-6" id="similar-questions-wrapper">
								<SimilarQuestions
									key={question.id}
									questionId={question.id}
									limit={5}
								/>
							</div>
						)}
					</main>
				</div>
			</div>

			{/* Delete Confirmation Dialog */}
			<ConfirmDialog
				isOpen={showDeleteConfirm}
				title="Delete Question"
				message="Are you sure you want to delete this question? This will also delete all associated answers. This action cannot be undone."
				confirmText={isDeleting ? "Deleting..." : "Delete"}
				cancelText="Cancel"
				variant="danger"
				onConfirm={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
			/>
		</div>
	);
}

export default QuestionDetailPage;
