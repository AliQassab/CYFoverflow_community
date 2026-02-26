import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { getSimilarQuestions } from "../services/api";
import {
	capitalizeTitle,
	getFirstLinePreview,
} from "../utils/questionUtils.jsx";

function SimilarQuestions({ questionId, limit = 5 }) {
	const [similarQuestions, setSimilarQuestions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [hasFetched, setHasFetched] = useState(false);
	const navigate = useNavigate();
	const abortControllerRef = useRef(null);

	useEffect(() => {
		// Cleanup function to abort ongoing requests
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, []);

	useEffect(() => {
		// Reset state when questionId changes
		setHasFetched(false);
		setSimilarQuestions([]);
		setError(null);

		if (!questionId) {
			setLoading(false);
			return;
		}

		// Abort previous request if still pending
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		const fetchSimilarQuestions = async () => {
			// Create new abort controller for this request
			abortControllerRef.current = new AbortController();
			const signal = abortControllerRef.current.signal;

			try {
				setLoading(true);
				setError(null);

				if (!questionId) {
					setSimilarQuestions([]);
					setLoading(false);
					return;
				}

				const questions = await getSimilarQuestions(questionId, { limit });

				// Check if request was aborted
				if (signal.aborted) {
					return;
				}

				// Ensure we have an array
				if (Array.isArray(questions)) {
					setSimilarQuestions(questions);
					setHasFetched(true);
				} else {
					setSimilarQuestions([]);
					setHasFetched(true);
				}
			} catch (error) {
				// Don't set error if request was aborted
				if (signal.aborted) {
					return;
				}

				console.error(
					"SimilarQuestions: Error fetching similar questions:",
					error,
				);
				// Only show error if it's not a network error or 404 (which might be expected)
				if (
					error.message &&
					!error.message.includes("Failed to fetch") &&
					!error.message.includes("404")
				) {
					setError(error.message || "Failed to load similar questions");
				}
				setSimilarQuestions([]);
				setHasFetched(true);
			} finally {
				if (!signal.aborted) {
					setLoading(false);
				}
			}
		};

		fetchSimilarQuestions();
	}, [questionId, limit]);

	if (loading) {
		return (
			<div
				className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6"
				style={{ position: "relative", zIndex: 10 }}
				id="similar-questions-section"
			>
				<h3 className="text-lg font-semibold text-gray-900 mb-3">
					Similar Questions
				</h3>
				<div className="text-sm text-gray-500">Loading...</div>
			</div>
		);
	}

	// Show error state if there was an error
	if (error) {
		return (
			<div
				className="bg-white rounded-lg shadow-md border-2 border-red-300 p-4 md:p-6"
				style={{ position: "relative", zIndex: 10 }}
				id="similar-questions-section"
			>
				<h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
					<span>🔗</span>
					<span>Similar Questions</span>
				</h3>
				<p className="text-sm text-red-600 mb-2">Error: {error}</p>
				<p className="text-xs text-gray-400">Question ID: {questionId}</p>
			</div>
		);
	}

	// Show message if no similar questions found (only after fetch completed)
	if (hasFetched && similarQuestions.length === 0 && !error) {
		return (
			<div
				className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6"
				style={{ position: "relative", zIndex: 10 }}
				id="similar-questions-section"
			>
				<h3 className="text-lg font-semibold text-gray-900 mb-2">
					Similar Questions
				</h3>
				<p className="text-sm text-gray-500">No similar questions found yet.</p>
			</div>
		);
	}

	const handleQuestionClick = (e, question) => {
		e.preventDefault();
		e.stopPropagation();
		const identifier = question.slug || question.id;
		navigate(`/questions/${identifier}`);
	};

	return (
		<div
			className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6"
			style={{ position: "relative", zIndex: 10 }}
			id="similar-questions-section"
		>
			<h3 className="text-lg font-semibold text-gray-900 mb-4">
				Similar Questions
			</h3>
			<div className="space-y-3">
				{similarQuestions.map((question) => (
					<div
						key={question.id}
						onClick={(e) => handleQuestionClick(e, question)}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								handleQuestionClick(e, question);
							}
						}}
						role="button"
						tabIndex={0}
						className="p-3 rounded-lg border border-gray-200 hover:border-[#281d80] hover:shadow-md transition-all cursor-pointer group"
					>
						<div className="flex items-start justify-between gap-2">
							<div className="flex-1 min-w-0">
								<h4 className="font-medium text-gray-900 group-hover:text-[#281d80] transition-colors mb-1 line-clamp-2">
									{capitalizeTitle(question.title)}
								</h4>
								{question.content && (
									<p className="text-sm text-gray-600 line-clamp-2 mb-2">
										{getFirstLinePreview(question.content)}
									</p>
								)}
								<div className="flex items-center gap-4 text-xs text-gray-500">
									{question.answer_count > 0 && (
										<span className="flex items-center gap-1">
											<svg
												className="w-4 h-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
												/>
											</svg>
											{question.answer_count}{" "}
											{question.answer_count === 1 ? "answer" : "answers"}
										</span>
									)}
									{question.is_solved && (
										<span className="flex items-center gap-1 text-green-600">
											<svg
												className="w-4 h-4"
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
									{question.similarity_score && (
										<span className="text-gray-400">
											{Math.round(question.similarity_score * 100)}% similar
										</span>
									)}
								</div>
							</div>
							<svg
								className="w-5 h-5 text-gray-400 group-hover:text-[#281d80] transition-colors shrink-0 mt-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default SimilarQuestions;
