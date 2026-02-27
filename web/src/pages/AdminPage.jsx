import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

import { useAuth } from "../contexts/useAuth";
import {
	getAdminStats,
	getAdminUsers,
	adminSetUserActive,
	adminDeleteUser,
	getAdminContent,
	adminDeleteContent,
} from "../services/api";

function StatCard({ label, value, color = "text-[#281d80]" }) {
	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 flex flex-col gap-1">
			<span className="text-xs sm:text-sm text-gray-500 font-medium leading-tight">
				{label}
			</span>
			<span className={`text-2xl sm:text-3xl font-bold ${color}`}>
				{value ?? "—"}
			</span>
		</div>
	);
}

function ConfirmModal({ message, onConfirm, onCancel }) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
			<div className="bg-white rounded-xl shadow-xl p-5 sm:p-6 max-w-sm w-full">
				<p className="text-gray-800 font-medium mb-5 text-sm sm:text-base">
					{message}
				</p>
				<div className="flex gap-3 justify-end">
					<button
						onClick={onCancel}
						className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-sm font-medium"
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						className="px-4 py-2 rounded-lg bg-[#ed4d4e] text-white hover:bg-[#d43d3e] transition-colors cursor-pointer text-sm font-medium"
					>
						Confirm
					</button>
				</div>
			</div>
		</div>
	);
}

function PaginationBar({ page, totalPages, onPrev, onNext }) {
	return (
		<div className="px-4 sm:px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
			<span>
				Page {page} of {totalPages}
			</span>
			<div className="flex gap-2">
				<button
					onClick={onPrev}
					disabled={page === 1}
					className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors cursor-pointer disabled:cursor-default"
				>
					Prev
				</button>
				<button
					onClick={onNext}
					disabled={page === totalPages}
					className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors cursor-pointer disabled:cursor-default"
				>
					Next
				</button>
			</div>
		</div>
	);
}

export default function AdminPage() {
	const { isLoggedIn, user, token } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const contentSectionRef = useRef(null);
	const scrolledToContent = useRef(false);

	const [stats, setStats] = useState(null);
	const [statsLoading, setStatsLoading] = useState(true);

	const [users, setUsers] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [usersLoading, setUsersLoading] = useState(true);

	const [confirm, setConfirm] = useState(null);
	const [actionError, setActionError] = useState("");

	const CONTENT_TABS = ["question", "answer", "comment"];
	const [contentTab, setContentTab] = useState(
		location.state?.restoreContentTab || "question",
	);
	const [contentItems, setContentItems] = useState([]);
	const [contentPage, setContentPage] = useState(
		location.state?.restoreContentPage || 1,
	);
	const [contentTotalPages, setContentTotalPages] = useState(1);
	const [contentLoading, setContentLoading] = useState(true);

	// Guard: redirect non-admins
	useEffect(() => {
		if (!isLoggedIn || !user?.is_admin) {
			navigate("/", { replace: true });
		}
	}, [isLoggedIn, user, navigate]);

	// Fetch stats
	useEffect(() => {
		if (!token) return;
		setStatsLoading(true);
		getAdminStats(token)
			.then(setStats)
			.catch(() => setStats(null))
			.finally(() => setStatsLoading(false));
	}, [token]);

	// Fetch users
	const fetchUsers = useCallback(() => {
		if (!token) return;
		setUsersLoading(true);
		getAdminUsers(token, { page, limit: 20, search })
			.then((data) => {
				setUsers(data.users);
				setTotal(data.total);
				setTotalPages(data.totalPages);
			})
			.catch(() => setUsers([]))
			.finally(() => setUsersLoading(false));
	}, [token, page, search]);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	// Fetch content
	const fetchContent = useCallback(() => {
		if (!token) return;
		setContentLoading(true);
		getAdminContent(token, { type: contentTab, page: contentPage, limit: 20 })
			.then((data) => {
				setContentItems(data.items);
				setContentTotalPages(data.totalPages);
			})
			.catch(() => setContentItems([]))
			.finally(() => setContentLoading(false));
	}, [token, contentTab, contentPage]);

	useEffect(() => {
		fetchContent();
	}, [fetchContent]);

	// Scroll to specific item (or section) when restoring admin position
	useEffect(() => {
		if (
			location.state?.restoreContentTab &&
			!scrolledToContent.current &&
			!contentLoading
		) {
			scrolledToContent.current = true;
			setTimeout(() => {
				const itemId = location.state?.restoreContentItemId;
				if (itemId) {
					const el = document.getElementById(`admin-item-${itemId}`);
					if (el) {
						el.scrollIntoView({ behavior: "smooth", block: "center" });
						return;
					}
				}
				contentSectionRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "start",
				});
			}, 150);
		}
	}, [
		contentLoading,
		location.state?.restoreContentTab,
		location.state?.restoreContentItemId,
	]);

	const handleContentTab = (tab) => {
		setContentTab(tab);
		setContentPage(1);
	};

	const handleDeleteContent = (item) => {
		const label =
			contentTab === "question"
				? `"${item.title || item.body?.slice(0, 60)}"`
				: `"${item.body?.slice(0, 60)}…"`;
		setConfirm({
			message: `Delete this ${contentTab}? ${label}`,
			onConfirm: async () => {
				setConfirm(null);
				setActionError("");
				try {
					await adminDeleteContent(token, contentTab, item.id);
					setContentItems((prev) => prev.filter((c) => c.id !== item.id));
					getAdminStats(token)
						.then(setStats)
						.catch(() => {});
				} catch {
					setActionError(`Failed to delete ${contentTab}.`);
				}
			},
		});
	};

	const handleSearch = (e) => {
		e.preventDefault();
		setPage(1);
		setSearch(searchInput.trim());
	};

	const handleBlock = (u) => {
		const action = u.is_active ? "block" : "unblock";
		setConfirm({
			message: `Are you sure you want to ${action} ${u.name}?`,
			onConfirm: async () => {
				setConfirm(null);
				setActionError("");
				try {
					const updated = await adminSetUserActive(token, u.id, !u.is_active);
					setUsers((prev) =>
						prev.map((usr) =>
							usr.id === u.id ? { ...usr, is_active: updated.is_active } : usr,
						),
					);
					getAdminStats(token)
						.then(setStats)
						.catch(() => {});
				} catch {
					setActionError("Failed to update user status.");
				}
			},
		});
	};

	const handleDelete = (u) => {
		setConfirm({
			message: `Permanently delete ${u.name}'s account? This cannot be undone.`,
			onConfirm: async () => {
				setConfirm(null);
				setActionError("");
				try {
					await adminDeleteUser(token, u.id);
					setUsers((prev) => prev.filter((usr) => usr.id !== u.id));
					setTotal((t) => t - 1);
					getAdminStats(token)
						.then(setStats)
						.catch(() => {});
				} catch {
					setActionError("Failed to delete user.");
				}
			},
		});
	};

	const buildContentUrl = (item, type) => {
		if (type === "question") {
			return `/questions/${item.slug || item.id}`;
		}
		if (type === "answer" && item.question_id && !item.question_unavailable) {
			const qId = item.question_slug || item.question_id;
			return `/questions/${qId}#answer-${item.id}`;
		}
		if (
			type === "comment" &&
			item.related_question_id &&
			!item.question_unavailable
		) {
			const qId = item.related_question_slug || item.related_question_id;
			return `/questions/${qId}#comment-${item.id}`;
		}
		return null;
	};

	if (!isLoggedIn || !user?.is_admin) return null;

	return (
		<div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
			<h1 className="text-xl sm:text-2xl font-bold text-[#281d80] mb-5 sm:mb-6">
				Admin Dashboard
			</h1>

			{/* Stats grid — 2 cols on mobile, 3 on sm, 6 on lg */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
				{statsLoading ? (
					<div className="col-span-full text-gray-400 text-sm">
						Loading stats…
					</div>
				) : stats ? (
					<>
						<StatCard label="Total Users" value={stats.total_users} />
						<StatCard
							label="Blocked"
							value={stats.blocked_users}
							color="text-[#ed4d4e]"
						/>
						<StatCard label="Questions" value={stats.total_questions} />
						<StatCard label="Answers" value={stats.total_answers} />
						<StatCard label="Comments" value={stats.total_comments} />
						<StatCard
							label="New This Week"
							value={stats.new_users_this_week}
							color="text-green-600"
						/>
					</>
				) : (
					<div className="col-span-full text-red-500 text-sm">
						Failed to load stats.
					</div>
				)}
			</div>

			{/* Users table */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200">
				{/* Header: title + search stacked on mobile, side-by-side on sm+ */}
				<div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex flex-col gap-3">
					<h2 className="text-base sm:text-lg font-semibold text-gray-800">
						Users{" "}
						{total > 0 && (
							<span className="text-sm text-gray-400 font-normal">
								({total} total)
							</span>
						)}
					</h2>
					<form onSubmit={handleSearch} className="flex gap-2 w-full">
						<input
							type="text"
							placeholder="Search by name or email…"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#281d80] flex-1 min-w-0"
						/>
						<button
							type="submit"
							className="bg-[#281d80] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#1f1566] transition-colors cursor-pointer shrink-0"
						>
							Search
						</button>
						{search && (
							<button
								type="button"
								onClick={() => {
									setSearchInput("");
									setSearch("");
									setPage(1);
								}}
								className="text-gray-500 hover:text-gray-700 text-sm underline cursor-pointer shrink-0"
							>
								Clear
							</button>
						)}
					</form>
				</div>

				{actionError && (
					<div className="px-4 sm:px-5 py-2 bg-red-50 text-red-600 text-sm">
						{actionError}
					</div>
				)}

				{usersLoading ? (
					<div className="px-4 sm:px-5 py-8 text-gray-400 text-sm">
						Loading users…
					</div>
				) : users.length === 0 ? (
					<div className="px-4 sm:px-5 py-8 text-gray-400 text-sm">
						No users found.
					</div>
				) : (
					<>
						{/* Desktop/tablet table — hidden on xs */}
						<div className="hidden sm:block overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
										<th className="px-4 sm:px-5 py-3 font-medium">User</th>
										<th className="px-4 sm:px-5 py-3 font-medium hidden md:table-cell">
											Joined
										</th>
										<th className="px-4 sm:px-5 py-3 font-medium hidden lg:table-cell">
											Q / A
										</th>
										<th className="px-4 sm:px-5 py-3 font-medium">Status</th>
										<th className="px-4 sm:px-5 py-3 font-medium text-right">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-50">
									{users.map((u) => (
										<tr
											key={u.id}
											className="hover:bg-gray-50 transition-colors"
										>
											<td className="px-4 sm:px-5 py-3">
												<div className="flex items-center gap-3">
													{u.avatar_url ? (
														<img
															src={u.avatar_url}
															alt={u.name}
															className="w-8 h-8 rounded-full object-cover flex-shrink-0"
														/>
													) : (
														<div className="w-8 h-8 rounded-full bg-[#281d80] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
															{u.name?.charAt(0).toUpperCase()}
														</div>
													)}
													<div className="min-w-0">
														<div className="font-medium text-gray-800 truncate max-w-[120px] md:max-w-none">
															{u.name}
														</div>
														<div className="text-xs text-gray-400 truncate max-w-[120px] md:max-w-[200px] lg:max-w-none">
															{u.email}
														</div>
													</div>
												</div>
											</td>
											<td className="px-4 sm:px-5 py-3 text-gray-500 hidden md:table-cell whitespace-nowrap text-xs">
												{new Date(u.created_at).toLocaleDateString()}
											</td>
											<td className="px-4 sm:px-5 py-3 text-gray-500 hidden lg:table-cell text-xs">
												{u.questions_count} / {u.answers_count}
											</td>
											<td className="px-4 sm:px-5 py-3">
												<span
													className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
														u.is_active
															? "bg-green-100 text-green-700"
															: "bg-red-100 text-red-700"
													}`}
												>
													{u.is_active ? "Active" : "Blocked"}
												</span>
											</td>
											<td className="px-4 sm:px-5 py-3 text-right">
												{u.id === user.id ? (
													<span className="text-xs text-gray-400 italic">
														You
													</span>
												) : (
													<div className="flex gap-1.5 justify-end flex-wrap">
														<button
															onClick={() => handleBlock(u)}
															className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
																u.is_active
																	? "border-orange-300 text-orange-600 hover:bg-orange-50"
																	: "border-green-300 text-green-600 hover:bg-green-50"
															}`}
														>
															{u.is_active ? "Block" : "Unblock"}
														</button>
														<button
															onClick={() => handleDelete(u)}
															className="text-xs font-medium px-2.5 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
														>
															Delete
														</button>
													</div>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Mobile card list — shown only on xs */}
						<ul className="sm:hidden divide-y divide-gray-100">
							{users.map((u) => (
								<li key={u.id} className="px-4 py-3">
									<div className="flex items-center gap-3 mb-2">
										{u.avatar_url ? (
											<img
												src={u.avatar_url}
												alt={u.name}
												className="w-9 h-9 rounded-full object-cover flex-shrink-0"
											/>
										) : (
											<div className="w-9 h-9 rounded-full bg-[#281d80] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
												{u.name?.charAt(0).toUpperCase()}
											</div>
										)}
										<div className="min-w-0 flex-1">
											<div className="font-medium text-gray-800 truncate text-sm">
												{u.name}
											</div>
											<div className="text-xs text-gray-400 truncate">
												{u.email}
											</div>
										</div>
										<span
											className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
												u.is_active
													? "bg-green-100 text-green-700"
													: "bg-red-100 text-red-700"
											}`}
										>
											{u.is_active ? "Active" : "Blocked"}
										</span>
									</div>
									{u.id !== user.id && (
										<div className="flex gap-2 mt-2">
											<button
												onClick={() => handleBlock(u)}
												className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-colors cursor-pointer ${
													u.is_active
														? "border-orange-300 text-orange-600 hover:bg-orange-50"
														: "border-green-300 text-green-600 hover:bg-green-50"
												}`}
											>
												{u.is_active ? "Block" : "Unblock"}
											</button>
											<button
												onClick={() => handleDelete(u)}
												className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
											>
												Delete
											</button>
										</div>
									)}
									{u.id === user.id && (
										<span className="text-xs text-gray-400 italic">You</span>
									)}
								</li>
							))}
						</ul>
					</>
				)}

				{totalPages > 1 && (
					<PaginationBar
						page={page}
						totalPages={totalPages}
						onPrev={() => setPage((p) => Math.max(1, p - 1))}
						onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
					/>
				)}
			</div>

			{/* Content Moderation */}
			<div
				ref={contentSectionRef}
				className="bg-white rounded-xl shadow-sm border border-gray-200 mt-6 sm:mt-8"
			>
				<div className="px-4 sm:px-5 py-4 border-b border-gray-100">
					<h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
						Content Moderation
					</h2>
					<div className="flex gap-1 flex-wrap">
						{CONTENT_TABS.map((tab) => (
							<button
								key={tab}
								onClick={() => handleContentTab(tab)}
								className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer capitalize ${
									contentTab === tab
										? "bg-[#281d80] text-white"
										: "text-gray-600 hover:bg-gray-100"
								}`}
							>
								{tab}s
							</button>
						))}
					</div>
				</div>

				{contentLoading ? (
					<div className="px-4 sm:px-5 py-8 text-gray-400 text-sm">
						Loading…
					</div>
				) : contentItems.length === 0 ? (
					<div className="px-4 sm:px-5 py-8 text-gray-400 text-sm">
						No {contentTab}s found.
					</div>
				) : (
					<ul className="divide-y divide-gray-50">
						{contentItems.map((item) => {
							const url = buildContentUrl(item, contentTab);
							return (
								<li
									key={item.id}
									id={`admin-item-${item.id}`}
									className="px-4 sm:px-5 py-4 flex gap-3 sm:gap-4 hover:bg-gray-50 transition-colors"
								>
									<div className="flex-1 min-w-0">
										{contentTab === "question" &&
											item.title &&
											(url ? (
												<Link
													to={url}
													state={{
														fromAdmin: true,
														adminContentTab: contentTab,
														adminContentPage: contentPage,
														adminContentItemId: item.id,
													}}
													className="font-medium text-[#281d80] hover:underline truncate mb-0.5 text-sm sm:text-base block"
												>
													{item.title}
												</Link>
											) : (
												<p className="font-medium text-gray-800 truncate mb-0.5 text-sm sm:text-base">
													{item.title}
												</p>
											))}
										<p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
											{item.body}
										</p>
										{contentTab === "answer" && item.question_title && (
											<p className="text-xs text-gray-400 mt-1">
												on:{" "}
												{url ? (
													<Link
														to={url}
														state={{
															fromAdmin: true,
															adminContentTab: contentTab,
															adminContentPage: contentPage,
															adminContentItemId: item.id,
														}}
														className="italic text-[#281d80] hover:underline"
													>
														{item.question_title}
													</Link>
												) : (
													<span className="italic">{item.question_title}</span>
												)}
											</p>
										)}
										{contentTab === "comment" && url && (
											<p className="text-xs text-gray-400 mt-1">
												<Link
													to={url}
													state={{
														fromAdmin: true,
														adminContentTab: contentTab,
														adminContentPage: contentPage,
														adminContentItemId: item.id,
													}}
													className="text-[#281d80] hover:underline"
												>
													View parent {item.answer_id ? "answer" : "question"} →
												</Link>
											</p>
										)}
										<p className="text-xs text-gray-400 mt-1">
											by{" "}
											<span className="font-medium">
												{item.author_name || "Unknown"}
											</span>
											{" · "}
											{new Date(item.created_at).toLocaleDateString()}
										</p>
									</div>
									<div className="flex flex-col gap-1.5 shrink-0 self-start">
										{url && (
											<Link
												to={url}
												state={{
													fromAdmin: true,
													adminContentTab: contentTab,
													adminContentPage: contentPage,
													adminContentItemId: item.id,
												}}
												className="text-xs font-medium px-2.5 py-1 rounded-lg border border-[#281d80] text-[#281d80] hover:bg-purple-50 transition-colors text-center"
											>
												View
											</Link>
										)}
										<button
											onClick={() => handleDeleteContent(item)}
											className="text-xs font-medium px-2.5 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
										>
											Delete
										</button>
									</div>
								</li>
							);
						})}
					</ul>
				)}

				{contentTotalPages > 1 && (
					<PaginationBar
						page={contentPage}
						totalPages={contentTotalPages}
						onPrev={() => setContentPage((p) => Math.max(1, p - 1))}
						onNext={() =>
							setContentPage((p) => Math.min(contentTotalPages, p + 1))
						}
					/>
				)}
			</div>

			{confirm && (
				<ConfirmModal
					message={confirm.message}
					onConfirm={confirm.onConfirm}
					onCancel={() => setConfirm(null)}
				/>
			)}
		</div>
	);
}
