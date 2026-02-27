import { useState, useEffect } from "react";
import {
	FaEdit,
	FaCheck,
	FaTimes,
	FaQuestionCircle,
	FaComment,
	FaArrowUp,
	FaCheckCircle,
	FaTrophy,
	FaEnvelope,
	FaGraduationCap,
} from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";

import ImageUpload from "../components/ImageUpload";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../contexts/useAuth";
import { getUserProfile, updateUserProfile } from "../services/api";
import {
	capitalizeTitle,
	getFirstLinePreview,
} from "../utils/questionUtils.jsx";

function UserProfilePage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { isLoggedIn, user: currentUser, token, updateUser } = useAuth();
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [isEditing, setIsEditing] = useState(false);
	const [editAvatarUrl, setEditAvatarUrl] = useState("");
	const [editPublicEmail, setEditPublicEmail] = useState("");
	const [editIsCyfTrainee, setEditIsCyfTrainee] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [updateError, setUpdateError] = useState("");

	const isOwnProfile =
		isLoggedIn && currentUser && currentUser.id === parseInt(id, 10);

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				setLoading(true);
				setError("");
				const data = await getUserProfile(id);
				setProfile(data);
				setEditAvatarUrl(data.avatar_url || "");
				setEditPublicEmail(data.public_email || "");
				setEditIsCyfTrainee(data.is_cyf_trainee || false);
			} catch (_err) {
				setError(_err.message || "Failed to load user profile");
			} finally {
				setLoading(false);
			}
		};

		if (id) {
			fetchProfile();
		}
	}, [id]);

	const handleUpdateProfile = async () => {
		if (!token) {
			setUpdateError("Please log in to update your profile");
			return;
		}

		setIsUpdating(true);
		setUpdateError("");

		try {
			const updated = await updateUserProfile(
				id,
				{
					avatar_url: editAvatarUrl.trim() || null,
					public_email: editPublicEmail.trim() || null,
					is_cyf_trainee: editIsCyfTrainee,
				},
				token,
			);

			setProfile({ ...profile, ...updated });
			// Keep navbar avatar in sync
			if (updated.avatar_url !== undefined) {
				updateUser({ avatar_url: updated.avatar_url });
			}
			setIsEditing(false);
		} catch (_err) {
			setUpdateError(_err.message || "Failed to update profile");
		} finally {
			setIsUpdating(false);
		}
	};

	const handleCancelEdit = () => {
		setEditAvatarUrl(profile?.avatar_url || "");
		setEditPublicEmail(profile?.public_email || "");
		setEditIsCyfTrainee(profile?.is_cyf_trainee || false);
		setIsEditing(false);
		setUpdateError("");
	};

	const handleQuestionClick = (question) => {
		const identifier = question.slug || question.id;
		navigate(`/questions/${identifier}`);
	};

	const handleAnswerClick = (answer) => {
		const identifier = answer.question?.slug || answer.question_id;
		navigate(`/questions/${identifier}#answer-${answer.id}`);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[#efeef8]">
				<div className="container mx-auto px-4 py-8">
					<div className="text-center text-gray-600">Loading profile...</div>
				</div>
			</div>
		);
	}

	if (error || !profile) {
		return (
			<div className="min-h-screen bg-[#efeef8]">
				<div className="container mx-auto px-4 py-8">
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
						<p className="text-gray-600">{error || "User not found"}</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#efeef8]">
			<div className="container mx-auto px-4 py-6 md:py-8">
				<div className="flex flex-col lg:flex-row gap-6">
					<Sidebar />

					<main className="flex-1 min-w-0">
						{/* Profile Header */}
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8 mb-6">
							<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
								{/* Avatar */}
								<div className="relative shrink-0">
									{profile.avatar_url ? (
										<img
											src={profile.avatar_url}
											alt={profile.name}
											className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-[#281d80]"
										/>
									) : (
										<div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-[#281d80] flex items-center justify-center text-white text-2xl sm:text-3xl md:text-4xl font-bold border-4 border-[#281d80]">
											{profile.name?.charAt(0).toUpperCase() || "U"}
										</div>
									)}
								</div>

								{/* User Info */}
								<div className="flex-1 min-w-0">
									<div className="flex items-start justify-between gap-4 mb-2">
										<div>
											<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">
												{profile.name}
											</h1>
											<p className="text-sm text-gray-500">
												Member since{" "}
												{new Date(profile.created_at).toLocaleDateString(
													"en-US",
													{
														year: "numeric",
														month: "long",
													},
												)}
											</p>
										</div>
										{isOwnProfile && (
											<button
												onClick={() => setIsEditing(!isEditing)}
												className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#281d80] bg-white border-2 border-[#281d80] rounded-lg hover:bg-[#281d80] hover:text-white transition-colors cursor-pointer shrink-0"
											>
												<FaEdit className="w-4 h-4" />
												{isEditing ? "Cancel" : "Edit Profile"}
											</button>
										)}
									</div>

									{/* Badges (view mode) */}
									{!isEditing && (
										<div className="mt-3 flex flex-wrap gap-2">
											{profile.is_cyf_trainee && (
												<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-[#281d80] text-white">
													<FaGraduationCap className="w-3.5 h-3.5" />
													CYF Trainee
												</span>
											)}
											{profile.public_email && (
												<a
													href={`mailto:${profile.public_email}`}
													className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
												>
													<FaEnvelope className="w-3.5 h-3.5" />
													{profile.public_email}
												</a>
											)}
										</div>
									)}

									{/* Edit form */}
									{isEditing && (
										<div className="mt-4 space-y-4">
											{/* Profile image upload */}
											<div>
												<p className="block text-sm font-semibold text-gray-700 mb-2">
													Profile Photo
												</p>
												<ImageUpload
													onUpload={(file) => setEditAvatarUrl(file.file_url)}
													onRemove={() => setEditAvatarUrl("")}
													existingImageUrl={editAvatarUrl}
													token={token}
												/>
											</div>

											{/* Public email */}
											<div>
												<label
													htmlFor="public-email-input"
													className="block text-sm font-semibold text-gray-700 mb-2"
												>
													Public Email{" "}
													<span className="font-normal text-gray-500">
														(optional)
													</span>
												</label>
												<input
													id="public-email-input"
													type="email"
													value={editPublicEmail}
													onChange={(e) => setEditPublicEmail(e.target.value)}
													placeholder="your@email.com"
													className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#281d80] focus:border-transparent"
												/>
											</div>

											{/* CYF Trainee checkbox */}
											<div className="flex items-center gap-3">
												<input
													id="cyf-trainee-checkbox"
													type="checkbox"
													checked={editIsCyfTrainee}
													onChange={(e) =>
														setEditIsCyfTrainee(e.target.checked)
													}
													className="w-5 h-5 rounded border-gray-300 text-[#281d80] accent-[#281d80] cursor-pointer"
												/>
												<label
													htmlFor="cyf-trainee-checkbox"
													className="text-sm font-semibold text-gray-700 cursor-pointer"
												>
													Am / Was a CYF Trainee
												</label>
											</div>

											{updateError && (
												<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
													{updateError}
												</div>
											)}

											<div className="flex gap-2">
												<button
													onClick={handleUpdateProfile}
													disabled={isUpdating}
													className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#281d80] rounded-lg hover:bg-[#1f1566] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
												>
													<FaCheck className="w-4 h-4" />
													{isUpdating ? "Saving..." : "Save"}
												</button>
												<button
													onClick={handleCancelEdit}
													disabled={isUpdating}
													className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 cursor-pointer"
												>
													<FaTimes className="w-4 h-4" />
													Cancel
												</button>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Statistics */}
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
							<h2 className="text-xl font-bold text-gray-900 mb-4">
								Statistics
							</h2>
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
								{/* Reputation */}
								<div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200">
									<div className="flex items-center justify-center gap-2 text-yellow-600 mb-2">
										<FaTrophy className="w-5 h-5" />
									</div>
									<div className="text-2xl font-bold text-gray-900">
										{profile.reputation || 0}
									</div>
									<div className="text-sm text-gray-600">Reputation</div>
								</div>
								<div className="text-center p-4 bg-gray-50 rounded-lg">
									<div className="flex items-center justify-center gap-2 text-[#281d80] mb-2">
										<FaQuestionCircle className="w-5 h-5" />
									</div>
									<div className="text-2xl font-bold text-gray-900">
										{profile.stats?.questions_count || 0}
									</div>
									<div className="text-sm text-gray-600">
										{profile.stats?.questions_count === 1
											? "Question"
											: "Questions"}
									</div>
								</div>

								<div className="text-center p-4 bg-gray-50 rounded-lg">
									<div className="flex items-center justify-center gap-2 text-[#281d80] mb-2">
										<FaComment className="w-5 h-5" />
									</div>
									<div className="text-2xl font-bold text-gray-900">
										{profile.stats?.answers_count || 0}
									</div>
									<div className="text-sm text-gray-600">
										{profile.stats?.answers_count === 1 ? "Answer" : "Answers"}
									</div>
								</div>

								<div className="text-center p-4 bg-gray-50 rounded-lg">
									<div className="flex items-center justify-center gap-2 text-green-600 mb-2">
										<FaCheckCircle className="w-5 h-5" />
									</div>
									<div className="text-2xl font-bold text-gray-900">
										{profile.stats?.accepted_answers_count || 0}
									</div>
									<div className="text-sm text-gray-600">Accepted</div>
								</div>

								<div className="text-center p-4 bg-gray-50 rounded-lg">
									<div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
										<FaArrowUp className="w-5 h-5" />
									</div>
									<div className="text-2xl font-bold text-gray-900">
										{profile.stats?.net_votes || 0}
									</div>
									<div className="text-sm text-gray-600">Net Votes</div>
								</div>
							</div>
						</div>

						{/* Recent Questions */}
						{profile.recent_questions &&
							profile.recent_questions.length > 0 && (
								<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
									<h2 className="text-xl font-bold text-gray-900 mb-4">
										Recent Questions ({profile.stats?.questions_count || 0})
									</h2>
									<div className="space-y-3">
										{profile.recent_questions.map((question) => (
											<div
												key={question.id}
												onClick={() => handleQuestionClick(question)}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														handleQuestionClick(question);
													}
												}}
												role="button"
												tabIndex={0}
												className="p-4 border border-gray-200 rounded-lg hover:border-[#281d80] hover:shadow-md transition-all cursor-pointer"
											>
												<h3 className="font-semibold text-gray-900 mb-2 hover:text-[#281d80]">
													{capitalizeTitle(question.title)}
												</h3>
												<div className="flex items-center gap-4 text-sm text-gray-500">
													<span>
														{new Date(question.created_at).toLocaleDateString(
															"en-US",
															{
																year: "numeric",
																month: "short",
																day: "numeric",
															},
														)}
													</span>
													{question.answer_count > 0 && (
														<span>
															{question.answer_count}{" "}
															{question.answer_count === 1
																? "answer"
																: "answers"}
														</span>
													)}
													{question.is_solved && (
														<span className="text-green-600 font-semibold">
															Solved
														</span>
													)}
												</div>
											</div>
										))}
									</div>
								</div>
							)}

						{/* Recent Answers */}
						{profile.recent_answers && profile.recent_answers.length > 0 && (
							<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
								<h2 className="text-xl font-bold text-gray-900 mb-4">
									Recent Answers ({profile.stats?.answers_count || 0})
								</h2>
								<div className="space-y-3">
									{profile.recent_answers.map((answer) => (
										<div
											key={answer.id}
											onClick={() => handleAnswerClick(answer)}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													handleAnswerClick(answer);
												}
											}}
											role="button"
											tabIndex={0}
											className="p-4 border border-gray-200 rounded-lg hover:border-[#281d80] hover:shadow-md transition-all cursor-pointer"
										>
											{answer.question && (
												<h3 className="font-semibold text-gray-900 mb-2 hover:text-[#281d80]">
													{capitalizeTitle(answer.question.title)}
												</h3>
											)}
											<p className="text-sm text-gray-600 mb-2 line-clamp-2">
												{getFirstLinePreview(answer.content)}
											</p>
											<div className="text-xs text-gray-500">
												{new Date(answer.created_at).toLocaleDateString(
													"en-US",
													{
														year: "numeric",
														month: "short",
														day: "numeric",
													},
												)}
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</main>
				</div>
			</div>
		</div>
	);
}

export default UserProfilePage;
