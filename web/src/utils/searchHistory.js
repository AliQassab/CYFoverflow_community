/**
 * Search history utility functions
 * Stores search history in localStorage
 */

const SEARCH_HISTORY_KEY = "cyfoverflow_search_history";
const MAX_HISTORY_ITEMS = 10;

/**
 * Get search history from localStorage
 * @returns {Array<string>} Array of search terms
 */
export const getSearchHistory = () => {
	try {
		const history = localStorage.getItem(SEARCH_HISTORY_KEY);
		return history ? JSON.parse(history) : [];
	} catch (error) {
		console.error("Error reading search history:", error);
		return [];
	}
};

/**
 * Add a search term to history
 * @param {string} searchTerm - Search term to add
 */
export const addToSearchHistory = (searchTerm) => {
	if (!searchTerm || !searchTerm.trim()) {
		return;
	}

	try {
		const history = getSearchHistory();
		const trimmedTerm = searchTerm.trim();

		// Remove if already exists
		const filteredHistory = history.filter((term) => term !== trimmedTerm);

		// Add to beginning
		const newHistory = [trimmedTerm, ...filteredHistory].slice(
			0,
			MAX_HISTORY_ITEMS,
		);

		localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
	} catch (error) {
		console.error("Error saving search history:", error);
	}
};

/**
 * Clear search history
 */
export const clearSearchHistory = () => {
	try {
		localStorage.removeItem(SEARCH_HISTORY_KEY);
	} catch (error) {
		console.error("Error clearing search history:", error);
	}
};

/**
 * Remove a specific term from search history
 * @param {string} searchTerm - Search term to remove
 */
export const removeFromSearchHistory = (searchTerm) => {
	try {
		const history = getSearchHistory();
		const filteredHistory = history.filter((term) => term !== searchTerm);
		localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filteredHistory));
	} catch (error) {
		console.error("Error removing from search history:", error);
	}
};
