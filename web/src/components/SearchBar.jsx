import { useState, useEffect, useRef } from "react";

import { getSearchHistory, addToSearchHistory } from "../utils/searchHistory";

function SearchBar({
	searchTerm = "",
	onSearch,
	placeholder = "Search questions and tags...",
	selectedLabel = null,
	showHistory = true,
}) {
	const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
	const [history, setHistory] = useState([]);
	const searchInputRef = useRef(null);
	const dropdownRef = useRef(null);

	useEffect(() => {
		if (showHistory) {
			setHistory(getSearchHistory());
		}
	}, [showHistory]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target) &&
				searchInputRef.current &&
				!searchInputRef.current.contains(event.target)
			) {
				setShowHistoryDropdown(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const handleChange = (e) => {
		const value = e.target.value;
		if (onSearch) {
			onSearch(value);
		}
		if (showHistory && value.trim()) {
			setShowHistoryDropdown(true);
		} else {
			setShowHistoryDropdown(false);
		}
	};

	const handleFocus = () => {
		if (showHistory && history.length > 0) {
			setShowHistoryDropdown(true);
		}
	};

	const handleClear = () => {
		if (onSearch) {
			onSearch("");
		}
		setShowHistoryDropdown(false);
	};

	const handleHistoryClick = (term) => {
		if (onSearch) {
			onSearch(term);
			addToSearchHistory(term);
		}
		setShowHistoryDropdown(false);
		if (searchInputRef.current) {
			searchInputRef.current.blur();
		}
	};

	const handleKeyDown = (e) => {
		if (e.key === "Enter" && searchTerm.trim()) {
			addToSearchHistory(searchTerm.trim());
			setShowHistoryDropdown(false);
		}
	};

	const dynamicPlaceholder = selectedLabel
		? `Search within "${selectedLabel.name}"...`
		: placeholder;

	const hasValue = searchTerm && searchTerm.trim().length > 0;

	const filteredHistory = showHistory
		? history.filter(
				(term) =>
					!searchTerm || term.toLowerCase().includes(searchTerm.toLowerCase()),
			)
		: [];

	return (
		<div className="flex-1 relative">
			<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
				<svg
					className="h-5 w-5 text-gray-400 transition-colors duration-200"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
			</div>
			<input
				ref={searchInputRef}
				type="text"
				placeholder={dynamicPlaceholder}
				value={searchTerm || ""}
				onChange={handleChange}
				onFocus={handleFocus}
				onKeyDown={handleKeyDown}
				className={`block w-full pl-11 ${hasValue ? "pr-10" : "pr-4"} py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#281d80]/50 focus:border-[#281d80] focus:bg-white hover:border-gray-300 hover:bg-white transition-all duration-200 shadow-sm`}
			/>
			{hasValue && (
				<button
					type="button"
					onClick={handleClear}
					className="absolute inset-y-0 right-0 pr-3 flex items-center z-10 text-gray-400 hover:text-gray-600 transition-colors duration-200 cursor-pointer"
					aria-label="Clear search"
				>
					<svg
						className="h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			)}
			{showHistory && showHistoryDropdown && filteredHistory.length > 0 && (
				<div
					ref={dropdownRef}
					className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
				>
					<div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
						Recent Searches
					</div>
					{filteredHistory.map((term, index) => (
						<button
							key={index}
							type="button"
							onClick={() => handleHistoryClick(term)}
							className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
						>
							{term}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

export default SearchBar;
