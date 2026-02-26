/**
 * Add reputation column to users table
 *
 * Reputation points are awarded for:
 * - +10 for upvoted answer
 * - +15 for accepted answer
 * - +5 for upvoted question
 * - -2 for downvoted content (answer or question)
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	// Add reputation column with default value of 0
	pgm.addColumn("users", {
		reputation: {
			type: "integer",
			notNull: true,
			default: 0,
		},
	});

	// Create index for leaderboard queries
	pgm.createIndex("users", "reputation", {
		name: "users_reputation_idx",
		orderBy: { reputation: "DESC" },
	});
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	pgm.dropIndex("users", "users_reputation_idx", {
		ifExists: true,
	});
	pgm.dropColumn("users", "reputation");
}
