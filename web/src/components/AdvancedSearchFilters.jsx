import { useState } from "react";
import { FaFilter, FaTimes } from "react-icons/fa";

function AdvancedSearchFilters({ filters, onFiltersChange, labels = [] }) {
	const [isOpen, setIsOpen] = useState(false);

	const handleFilterChange = (key, value) => {
		onFiltersChange({
			...filters,
			[key]: value,
		});
	};

	const clearFilters = () => {
		onFiltersChange({
			solved: null,
			sortBy: "relevance",
			dateRange: null,
			labelIds: [],
		});
	};

	const hasActiveFilters =
		filters.solved !== null ||
		filters.sortBy !== "relevance" ||
		filters.dateRange !== null ||
		(filters.labelIds && filters.labelIds.length > 0);

	return (
		<div className="mb-4">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
					hasActiveFilters
						? "bg-[#281d80] text-white hover:bg-[#1f1566]"
						: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
				}`}
			>
				<FaFilter className="w-4 h-4" />
				<span>Filters</span>
				{hasActiveFilters && (
					<span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
						{[
							filters.solved !== null ? 1 : 0,
							filters.sortBy !== "relevance" ? 1 : 0,
							filters.dateRange !== null ? 1 : 0,
							filters.labelIds?.length || 0,
						].reduce((a, b) => a + b, 0)}
					</span>
				)}
			</button>

			{isOpen && (
				<div className="mt-3 bg-white border border-gray-200 rounded-lg shadow-lg p-4 md:p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-900">
							Advanced Filters
						</h3>
						<button
							type="button"
							onClick={() => setIsOpen(false)}
							className="text-gray-400 hover:text-gray-600"
							aria-label="Close filters"
						>
							<FaTimes className="w-5 h-5" />
						</button>
					</div>

					<div className="space-y-4">
						{/* Solved Status Filter */}
						<div>
							<label
								htmlFor="status-filter-group"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Status
							</label>
							<div id="status-filter-group" className="flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() => handleFilterChange("solved", null)}
									className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
										filters.solved === null
											? "bg-[#281d80] text-white"
											: "bg-gray-100 text-gray-700 hover:bg-gray-200"
									}`}
								>
									All
								</button>
								<button
									type="button"
									onClick={() => handleFilterChange("solved", true)}
									className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
										filters.solved === true
											? "bg-[#281d80] text-white"
											: "bg-gray-100 text-gray-700 hover:bg-gray-200"
									}`}
								>
									Solved
								</button>
								<button
									type="button"
									onClick={() => handleFilterChange("solved", false)}
									className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
										filters.solved === false
											? "bg-[#281d80] text-white"
											: "bg-gray-100 text-gray-700 hover:bg-gray-200"
									}`}
								>
									Unsolved
								</button>
							</div>
						</div>

						{/* Sort By */}
						<div>
							<label
								htmlFor="sort-by-select"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Sort By
							</label>
							<select
								id="sort-by-select"
								value={filters.sortBy || "relevance"}
								onChange={(e) => handleFilterChange("sortBy", e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#281d80] focus:border-transparent"
							>
								<option value="relevance">Relevance</option>
								<option value="newest">Newest First</option>
								<option value="oldest">Oldest First</option>
								<option value="votes">Most Votes</option>
							</select>
						</div>

						{/* Date Range */}
						<div>
							<label
								htmlFor="date-range-select"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Date Range
							</label>
							<select
								id="date-range-select"
								value={filters.dateRange || ""}
								onChange={(e) =>
									handleFilterChange("dateRange", e.target.value || null)
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#281d80] focus:border-transparent"
							>
								<option value="">All Time</option>
								<option value="today">Today</option>
								<option value="week">This Week</option>
								<option value="month">This Month</option>
								<option value="year">This Year</option>
							</select>
						</div>

						{/* Labels Filter */}
						{labels.length > 0 && (
							<div>
								<label
									htmlFor="labels-filter-group"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Tags/Labels
								</label>
								<div
									id="labels-filter-group"
									className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2"
								>
									<div className="flex flex-wrap gap-2">
										{labels.map((label) => (
											<button
												key={label.id}
												type="button"
												onClick={() => {
													const currentLabels = filters.labelIds || [];
													const newLabels = currentLabels.includes(label.id)
														? currentLabels.filter((id) => id !== label.id)
														: [...currentLabels, label.id];
													handleFilterChange("labelIds", newLabels);
												}}
												className={`px-3 py-1 text-xs rounded-full transition-colors ${
													(filters.labelIds || []).includes(label.id)
														? "bg-[#281d80] text-white"
														: "bg-gray-100 text-gray-700 hover:bg-gray-200"
												}`}
											>
												{label.name}
											</button>
										))}
									</div>
								</div>
							</div>
						)}

						{/* Clear Filters */}
						{hasActiveFilters && (
							<button
								type="button"
								onClick={clearFilters}
								className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
							>
								Clear All Filters
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

export default AdvancedSearchFilters;
