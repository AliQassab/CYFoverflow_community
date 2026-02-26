import { Editor } from "@tinymce/tinymce-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/useAuth";
import { searchSimilarQuestions } from "../services/api";
import { getUserFriendlyError, isOnline } from "../utils/errorMessages";

import { TEMPLATES } from "./templates";

const AskQuestionPage = () => {
	const navigate = useNavigate();
	const { token, isLoggedIn } = useAuth();
	const { showError: showToastError, showSuccess } = useToast();

	const [activeTemplate, setActiveTemplate] = useState(null);

	const [initialContent, setInitialContent] = useState("");

	const [title, setTitle] = useState("");

	const [charCount, setCharCount] = useState(0);
	const [titleCharCount, setTitleCharCount] = useState(0);
	const MAX_TITLE_LENGTH = 100;
	const [error, setError] = useState(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const editorRef = useRef(null);

	const [labels, setLabels] = useState([]);
	const [selectedLabels, setSelectedLabels] = useState([]);
	const [similarQuestions, setSimilarQuestions] = useState([]);
	const [showSimilarQuestions, setShowSimilarQuestions] = useState(false);
	const [loadingSimilarQuestions, setLoadingSimilarQuestions] = useState(false);
	const searchTimeoutRef = useRef(null);

	const [templateFields, setTemplateFields] = useState({
		"bug-report": { browser: "", os: "" },
		"how-to": { documentationLink: "" },
	});

	useEffect(() => {
		if (activeTemplate) {
			fetchLabels();
		}
	}, [activeTemplate]);

	const fetchLabels = async () => {
		try {
			const response = await fetch("/api/questions/labels/all");
			if (response.ok) {
				const data = await response.json();
				setLabels(data);
			}
		} catch (err) {
			console.error("Error fetching labels:", err);
		}
	};

	const handleTemplateSelect = (template) => {
		setInitialContent(template.content);

		setActiveTemplate(template.id);

		setCharCount(0);
		setTitleCharCount(0);
		setError(null);
	};

	const handleBackToSelection = () => {
		if (
			window.confirm(
				"Going back will clear your current progress. Are you sure?",
			)
		) {
			setActiveTemplate(null);
			setInitialContent("");
			setTitle("");
			setTitleCharCount(0);
			setError(null);
			setSelectedLabels([]);
		}
	};

	const handleLabelToggle = (labelId) => {
		setSelectedLabels((prev) => {
			if (prev.includes(labelId)) {
				return prev.filter((id) => id !== labelId);
			} else {
				if (prev.length >= 3) {
					setError("You can select a maximum of 3 labels.");
					return prev;
				}
				setError(null);
				return [...prev, labelId];
			}
		});
	};

	// Debounced search for similar questions
	const searchForSimilarQuestionsRef = useRef(null);

	useEffect(() => {
		// Define the search function
		searchForSimilarQuestionsRef.current = (questionTitle, questionContent) => {
			// Clear previous timeout
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}

			// Don't search if title is too short
			if (!questionTitle || questionTitle.trim().length < 10) {
				setSimilarQuestions([]);
				return;
			}

			// Debounce: wait 1 second after user stops typing
			searchTimeoutRef.current = setTimeout(async () => {
				try {
					setLoadingSimilarQuestions(true);
					const results = await searchSimilarQuestions(
						questionTitle.trim(),
						questionContent || "",
						5,
					);

					setSimilarQuestions(results || []);
				} catch (error) {
					console.error("Error searching for similar questions:", error);
					setSimilarQuestions([]);
				} finally {
					setLoadingSimilarQuestions(false);
				}
			}, 1000); // 1 second delay
		};
	}, []);

	// Search when title changes
	useEffect(() => {
		if (
			title &&
			title.trim().length >= 10 &&
			editorRef.current &&
			searchForSimilarQuestionsRef.current
		) {
			const content = editorRef.current.getContent();
			searchForSimilarQuestionsRef.current(title, content);
		} else {
			setSimilarQuestions([]);
		}

		// Cleanup timeout on unmount
		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}
		};
	}, [title]);

	const handleEditorChange = (newContent, editor) => {
		const textLength = editor.getContent({ format: "text" }).trim().length;
		setCharCount(textLength);

		// Search for similar questions when content changes (debounced)
		if (
			title &&
			title.trim().length >= 10 &&
			searchForSimilarQuestionsRef.current
		) {
			searchForSimilarQuestionsRef.current(title, newContent);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);

		if (!isLoggedIn || !token) {
			setError("You must be logged in to post a question.");
			return;
		}

		if (!editorRef.current) {
			setError("Editor is not ready. Please wait a moment and try again.");
			return;
		}

		const plainText = editorRef.current.getContent({ format: "text" });
		const htmlContent = editorRef.current.getContent();

		if (!htmlContent || !htmlContent.trim()) {
			setError("Question content cannot be empty. Please provide details.");
			return;
		}

		if (!title.trim()) {
			setError("Please enter a title for your question.");
			return;
		}

		if (title.trim().length > MAX_TITLE_LENGTH) {
			setError(`Title must be ${MAX_TITLE_LENGTH} characters or less.`);
			return;
		}

		if (title.trim().length < 10) {
			setError("Title must be at least 10 characters long.");
			return;
		}

		const tempDiv = document.createElement("div");
		tempDiv.innerHTML = htmlContent;

		tempDiv.querySelectorAll("pre").forEach((el) => el.remove());
		tempDiv.querySelectorAll("code").forEach((el) => el.remove());
		tempDiv.querySelectorAll("h3").forEach((el) => el.remove());
		tempDiv.querySelectorAll("hr").forEach((el) => el.remove());

		const textOnly = tempDiv.textContent.trim();
		const hasMeaningfulText =
			textOnly.length > 20 &&
			!textOnly.match(
				/^(Problem Summary|What I've Already Tried|Describe|Explain|Provide|Any additional).*$/i,
			);

		if (!hasMeaningfulText) {
			setError(
				"Please provide a description explaining your question. Code blocks alone are not sufficient.",
			);
			return;
		}

		if (plainText.trim().length < 50) {
			setError("Your question body is too short. Please provide more detail.");
			return;
		}

		if (selectedLabels.length === 0) {
			setError("Please select at least one tag/label for your question.");
			return;
		}

		if (!isOnline()) {
			showToastError(
				"No internet connection. Please check your connection and try again.",
			);
			return;
		}

		setIsSubmitting(true);

		let metaData = {};
		if (activeTemplate && templateFields[activeTemplate]) {
			metaData = templateFields[activeTemplate];
		}

		const parser = new DOMParser();
		const doc = parser.parseFromString(htmlContent, "text/html");

		doc.querySelectorAll(".template-placeholder").forEach((el) => {
			el.classList.remove("template-placeholder");
			el.removeAttribute("data-placeholder");
		});

		const cleanContent = doc.body.innerHTML;

		if (!cleanContent || !cleanContent.trim()) {
			const errorMsg =
				"Question content cannot be empty. Please provide details.";
			setError(errorMsg);
			showToastError(errorMsg);
			setIsSubmitting(false);
			return;
		}

		const questionData = {
			title: title,
			content: cleanContent,
			templateType: activeTemplate || "general-question",
			browser: metaData.browser || null,
			os: metaData.os || null,
			documentationLink: metaData.documentationLink || null,
			labelId: selectedLabels,
		};

		try {
			const response = await fetch("/api/questions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(questionData),
			});

			const data = await response.json();

			if (!response.ok)
				throw new Error(data.message || "Something went wrong.");

			// Check if there are similar questions suggested
			if (data.similarQuestions && data.similarQuestions.length > 0) {
				setSimilarQuestions(data.similarQuestions);
				setShowSimilarQuestions(true);
				// Don't navigate yet - let user review similar questions
			} else {
				// No similar questions, navigate immediately
				showSuccess("Question posted successfully!");
				navigate("/");
			}
		} catch (err) {
			const friendlyError = getUserFriendlyError(
				err,
				"Failed to post question. Please try again.",
			);
			setError(friendlyError);
			showToastError(friendlyError);
		} finally {
			setIsSubmitting(false);
		}
	};

	// TEMPLATE SELECTION
	if (!activeTemplate) {
		return (
			<div className="min-h-screen flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
				<div className="max-w-5xl w-full space-y-6 sm:space-y-10 animate-fade-in">
					<div className="text-center">
						<h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 sm:mb-4">
							What kind of question do you have?
						</h2>
						<p className="text-base sm:text-lg text-gray-600">
							Select a template to help us help you faster.
						</p>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
						{TEMPLATES.map((template) => (
							<button
								key={template.id}
								onClick={() => handleTemplateSelect(template)}
								className={`
                  relative group flex flex-col items-start p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 ease-in-out
                  hover:shadow-xl sm:hover:shadow-2xl hover:-translate-y-1 sm:hover:-translate-y-2 text-left w-full h-full
                  ${template.color || "bg-white border-gray-200 hover:border-gray-400"}
                `}
							>
								<div className="text-3xl sm:text-4xl mb-3 sm:mb-4 transform group-hover:scale-110 transition-transform">
									{template.icon}
								</div>
								<h3
									className={`text-lg sm:text-xl font-bold mb-2 sm:mb-3 ${template.textColor || "text-gray-900"}`}
								>
									{template.title}
								</h3>
								<p className="text-sm sm:text-base text-gray-600 leading-relaxed">
									{template.description}
								</p>
								<div className="mt-auto pt-6 flex items-center text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-gray-900">
									Select Template &rarr;
								</div>
							</button>
						))}
					</div>

					<div className="text-center pt-8">
						<button
							onClick={() => navigate(-1)}
							className="text-gray-500 hover:text-gray-700 underline"
						>
							Cancel and go back
						</button>
					</div>
				</div>
			</div>
		);
	}

	// EDITOR FORM ---
	return (
		<div className="min-h-screen flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
			<div className="max-w-4xl w-full">
				{/* Back Button */}
				<button
					onClick={handleBackToSelection}
					className="mb-4 sm:mb-6 flex items-center text-xs sm:text-sm text-gray-500 hover:text-[#281d80] transition-colors group"
				>
					<span className="mr-2 group-hover:-translate-x-1 transition-transform">
						&larr;
					</span>
					Choose a different template
				</button>

				<div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 animate-fade-in">
					<div className="text-center border-b border-gray-100 pb-4 sm:pb-6">
						<h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
							Ask a public question
						</h2>
						<div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-600 mt-2">
							Using Template:{" "}
							<span className="font-bold ml-1">
								{TEMPLATES.find((t) => t.id === activeTemplate)?.title}
							</span>
						</div>
					</div>

					<form className="space-y-6" onSubmit={handleSubmit}>
						{error && (
							<div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-md text-sm">
								{error}
							</div>
						)}

						<div>
							<label
								htmlFor="questionTitle"
								className="block text-sm font-semibold text-gray-700 mb-2"
							>
								Question Title
							</label>
							<input
								id="questionTitle"
								type="text"
								disabled={isSubmitting}
								value={title}
								maxLength={MAX_TITLE_LENGTH}
								onChange={(e) => {
									setTitle(e.target.value);
									setTitleCharCount(e.target.value.length);
								}}
								className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#281d80] focus:ring-2 focus:ring-[#281d80]/20 transition-all"
								placeholder="e.g., How do I filter an array in JavaScript?"
							/>
							<div className="mt-1 flex justify-between items-center">
								<p className="text-xs text-gray-500">
									Be specific and descriptive
								</p>
								<p
									className={`text-xs ${
										titleCharCount > MAX_TITLE_LENGTH
											? "text-red-600"
											: titleCharCount > MAX_TITLE_LENGTH * 0.9
												? "text-orange-600"
												: "text-gray-500"
									}`}
								>
									{titleCharCount}/{MAX_TITLE_LENGTH}
								</p>
							</div>
						</div>

						<div>
							<label
								htmlFor="questionDetails"
								className="block text-sm font-semibold text-gray-700 mb-2"
							>
								Details
							</label>
							<div
								id="questionDetails"
								className="rounded-lg overflow-hidden border-2 border-gray-200 focus-within:border-[#281d80] focus-within:ring-2 focus-within:ring-[#281d80]/20 transition-all"
							>
								<Editor
									tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@7/tinymce.min.js"
									onInit={(evt, editor) => (editorRef.current = editor)}
									// CURSOR JUMP:
									// 1. key ensures a fresh instance is created when template changes
									// 2. initialValue sets data ONCE. We do NOT bind 'value' to 'content'.
									key={activeTemplate}
									initialValue={initialContent}
									disabled={isSubmitting}
									onEditorChange={handleEditorChange}
									init={{
										height: 400,
										menubar: false,
										statusbar: false,
										plugins: "codesample link lists",
										toolbar:
											"undo redo | blocks | bold italic | bullist numlist | link | codesample | customimage",
										setup: (editor) => {
											// Replace default image button with custom upload button
											editor.ui.registry.addButton("customimage", {
												icon: "image",
												tooltip: "Upload image",
												onAction: () => {
													const input = document.createElement("input");
													input.setAttribute("type", "file");
													input.setAttribute("accept", "image/*");

													input.onchange = async (e) => {
														const file = e.target.files?.[0];
														if (!file) return;

														let notificationId =
															editor.notificationManager.open({
																text: "Uploading image...",
																type: "info",
																timeout: 0,
															});

														const formData = new FormData();
														formData.append("file", file);

														try {
															const xhr = new XMLHttpRequest();

															xhr.upload.onprogress = (e) => {
																if (e.lengthComputable) {
																	const percentComplete = Math.round(
																		(e.loaded / e.total) * 100,
																	);
																	editor.notificationManager.close(
																		notificationId,
																	);
																	notificationId =
																		editor.notificationManager.open({
																			text: `Uploading image... ${percentComplete}%`,
																			type: "info",
																			timeout: 0,
																		});
																}
															};

															xhr.onreadystatechange = () => {
																if (xhr.readyState === 4) {
																	editor.notificationManager.close(
																		notificationId,
																	);

																	if (
																		xhr.status === 200 ||
																		xhr.status === 201
																	) {
																		try {
																			const json = JSON.parse(xhr.responseText);

																			if (json.success && json.file?.file_url) {
																				const imgTag = `<p><img src="${json.file.file_url}" alt="${file.name}" /></p>`;
																				editor.insertContent(imgTag);

																				editor.notificationManager.open({
																					text: "Image uploaded successfully",
																					type: "success",
																					timeout: 3000,
																				});
																			} else {
																				editor.notificationManager.open({
																					text: `Failed to upload image: ${json.message || "Invalid response"}`,
																					type: "error",
																					timeout: 3000,
																				});
																			}
																		} catch {
																			editor.notificationManager.open({
																				text: "Failed to parse server response",
																				type: "error",
																				timeout: 3000,
																			});
																		}
																	} else {
																		editor.notificationManager.open({
																			text: `Upload failed: ${xhr.status} ${xhr.statusText}`,
																			type: "error",
																			timeout: 3000,
																		});
																	}
																}
															};

															xhr.onerror = () => {
																editor.notificationManager.close(
																	notificationId,
																);
																editor.notificationManager.open({
																	text: "Upload failed - network error",
																	type: "error",
																	timeout: 3000,
																});
															};

															xhr.onabort = () => {
																editor.notificationManager.close(
																	notificationId,
																);
																editor.notificationManager.open({
																	text: "Upload cancelled",
																	type: "error",
																	timeout: 3000,
																});
															};

															xhr.ontimeout = () => {
																editor.notificationManager.close(
																	notificationId,
																);
																editor.notificationManager.open({
																	text: "Upload timeout - please try again",
																	type: "error",
																	timeout: 3000,
																});
															};

															xhr.open("POST", "/api/upload");
															xhr.setRequestHeader(
																"Authorization",
																`Bearer ${token}`,
															);
															xhr.timeout = 60000;
															xhr.send(formData);
														} catch (error) {
															editor.notificationManager.close(notificationId);
															editor.notificationManager.open({
																text: `Upload error: ${error.message}`,
																type: "error",
																timeout: 3000,
															});
														}
													};

													input.click();
												},
											});

											const togglePlaceholder = () => {
												const placeholders = editor.dom.select(
													".template-placeholder",
												);
												placeholders.forEach((node) => {
													const hasText = node.textContent.trim().length > 0;
													if (hasText) editor.dom.addClass(node, "has-text");
													else editor.dom.removeClass(node, "has-text");
												});
											};
											editor.on("init keyup change input", togglePlaceholder);
										},
										extended_valid_elements:
											"p[class|data-placeholder],li[class|data-placeholder],div[data-template]",
										content_style: `
                                    body { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 14px; }
                                    hr { border: none; border-top: 1px dashed #ccc; margin: 10px 0; }
                                    pre { background: #f4f4f5; padding: 10px; border-radius: 5px; }
                                    .template-placeholder { position: relative; }
                                    .template-placeholder:not(.has-text)::before {
                                        content: attr(data-placeholder);
                                        position: absolute; left: 0; top: 0;
                                        color: #9ca3af; font-style: italic; pointer-events: none;
                                    }
                                `,
									}}
								/>
							</div>
						</div>

						<div className="flex justify-end mt-2">
							<span
								className={`text-xs ${charCount < 50 ? "text-red-500" : "text-gray-500"}`}
							>
								{charCount} characters (min 50)
							</span>
						</div>

						{/* Labels Selection */}
						<fieldset>
							<legend className="block text-sm font-semibold text-gray-700 mb-2">
								Tags <span className="text-red-500">*</span> (Required - Select
								1 to 3)
							</legend>
							<div className="flex flex-wrap gap-2">
								{labels.map((label) => (
									<button
										key={label.id}
										type="button"
										onClick={() => handleLabelToggle(label.id)}
										disabled={isSubmitting}
										className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
											selectedLabels.includes(label.id)
												? "bg-[#281d80] text-white shadow-md"
												: "bg-gray-100 text-gray-700 hover:bg-gray-200"
										}`}
									>
										{label.name}
									</button>
								))}
							</div>
							<p className="mt-2 text-xs text-gray-500">
								{selectedLabels.length > 0
									? `${selectedLabels.length} of 3 labels selected`
									: "Please select at least one tag"}
							</p>
						</fieldset>

						{/* Template Specific Fields */}
						{activeTemplate === "bug-report" && (
							<div className="bg-blue-50 border-l-4 border-[#281d80] p-6 rounded-r-lg space-y-4 animate-fade-in-down">
								<h4 className="text-[#281d80] font-bold text-sm uppercase tracking-wide">
									🐛 Bug Report Details
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label
											htmlFor="browserVersion"
											className="block text-xs font-semibold text-gray-700 mb-1"
										>
											Browser Version
										</label>
										<input
											id="browserVersion"
											type="text"
											disabled={isSubmitting}
											value={templateFields["bug-report"].browser}
											onChange={(e) =>
												setTemplateFields((prev) => ({
													...prev,
													"bug-report": {
														...prev["bug-report"],
														browser: e.target.value,
													},
												}))
											}
											className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#281d80]"
										/>
									</div>
									<div>
										<label
											htmlFor="osVersion"
											className="block text-xs font-semibold text-gray-700 mb-1"
										>
											OS
										</label>
										<input
											id="osVersion"
											type="text"
											disabled={isSubmitting}
											value={templateFields["bug-report"].os}
											onChange={(e) =>
												setTemplateFields((prev) => ({
													...prev,
													"bug-report": {
														...prev["bug-report"],
														os: e.target.value,
													},
												}))
											}
											className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#281d80]"
										/>
									</div>
								</div>
							</div>
						)}

						{activeTemplate === "how-to" && (
							<div className="bg-green-50 border-l-4 border-green-600 p-6 rounded-r-lg space-y-4 animate-fade-in-down">
								<h4 className="text-green-800 font-bold text-sm uppercase tracking-wide">
									📘 Context
								</h4>
								<div>
									<label
										htmlFor="documentationLink"
										className="block text-xs font-semibold text-gray-700 mb-1"
									>
										Documentation Link
									</label>
									<input
										id="documentationLink"
										type="text"
										disabled={isSubmitting}
										value={templateFields["how-to"].documentationLink}
										onChange={(e) =>
											setTemplateFields((prev) => ({
												...prev,
												"how-to": {
													...prev["how-to"],
													documentationLink: e.target.value,
												},
											}))
										}
										className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-green-600"
									/>
								</div>
							</div>
						)}

						{/* Similar Questions Suggestions - Show BEFORE posting */}
						{similarQuestions.length > 0 && !showSimilarQuestions && (
							<div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
								<div className="flex items-start justify-between mb-3">
									<h4 className="text-blue-800 font-semibold text-sm flex items-center gap-2">
										<span>🔍</span>
										<span>
											Similar Questions Found ({similarQuestions.length})
										</span>
									</h4>
									<button
										type="button"
										onClick={() => setSimilarQuestions([])}
										className="text-blue-600 hover:text-blue-800 text-sm"
									>
										Dismiss
									</button>
								</div>
								<p className="text-blue-700 text-xs mb-3">
									We found questions that might be similar to yours. Check them
									out before posting:
								</p>
								<div className="space-y-2 max-h-60 overflow-y-auto">
									{similarQuestions.map((question) => (
										<div
											key={question.id}
											onClick={() => {
												const identifier = question.slug || question.id;
												navigate(`/questions/${identifier}`);
											}}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													const identifier = question.slug || question.id;
													navigate(`/questions/${identifier}`);
												}
											}}
											role="button"
											tabIndex={0}
											className="p-3 bg-white border border-blue-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer"
										>
											<h5 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
												{question.title}
											</h5>
											<div className="flex items-center gap-3 text-xs text-gray-500">
												{question.answer_count > 0 && (
													<span>
														{question.answer_count}{" "}
														{question.answer_count === 1 ? "answer" : "answers"}
													</span>
												)}
												{question.similarity_score && (
													<span className="font-medium text-blue-600">
														{Math.round(question.similarity_score * 100)}%
														similar
													</span>
												)}
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{loadingSimilarQuestions && (
							<div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
								<p className="text-sm text-gray-600 flex items-center gap-2">
									<span className="animate-spin">⏳</span>
									Searching for similar questions...
								</p>
							</div>
						)}

						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-[#281d80] hover:bg-[#1f1566] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#281d80] transition-all shadow-md hover:shadow-lg cursor-pointer disabled:cursor-not-allowed"
						>
							{isSubmitting ? "Posting..." : "Post Your Question"}
						</button>
					</form>

					{/* Similar Questions Modal */}
					{showSimilarQuestions && similarQuestions.length > 0 && (
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
							<div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
								<div className="p-6">
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-2xl font-bold text-gray-900">
											🔍 Similar Questions Found
										</h3>
										<button
											onClick={() => {
												setShowSimilarQuestions(false);
												navigate("/");
											}}
											className="text-gray-400 hover:text-gray-600 text-2xl"
										>
											×
										</button>
									</div>
									<p className="text-gray-600 mb-6">
										We found some questions that might be similar to yours.
										Check them out before posting:
									</p>
									<div className="space-y-4">
										{similarQuestions.map((question) => (
											<div
												key={question.id}
												onClick={() => {
													const identifier = question.slug || question.id;
													navigate(`/questions/${identifier}`);
												}}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														const identifier = question.slug || question.id;
														navigate(`/questions/${identifier}`);
													}
												}}
												role="button"
												tabIndex={0}
												className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#281d80] hover:shadow-md transition-all cursor-pointer"
											>
												<h4 className="font-semibold text-gray-900 mb-2 hover:text-[#281d80]">
													{question.title}
												</h4>
												<div className="flex items-center gap-4 text-sm text-gray-500">
													{question.answer_count > 0 && (
														<span>{question.answer_count} answers</span>
													)}
													{question.similarity_score && (
														<span className="font-medium">
															{Math.round(question.similarity_score * 100)}%
															similar
														</span>
													)}
												</div>
											</div>
										))}
									</div>
									<div className="mt-6 flex gap-4">
										<button
											onClick={() => {
												setShowSimilarQuestions(false);
												navigate("/");
											}}
											className="flex-1 bg-[#281d80] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1f1566] transition-colors cursor-pointer"
										>
											Continue Anyway
										</button>
										<button
											onClick={() => {
												setShowSimilarQuestions(false);
												if (similarQuestions.length > 0) {
													const identifier =
														similarQuestions[0].slug || similarQuestions[0].id;
													navigate(`/questions/${identifier}`);
												}
											}}
											className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors cursor-pointer"
										>
											View First Question
										</button>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default AskQuestionPage;
