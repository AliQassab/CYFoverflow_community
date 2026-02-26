/**
 * Add account lockout fields to users table
 * Prevents brute force attacks by locking accounts after failed login attempts
 */

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	// Add failed_attempts column
	pgm.addColumn("users", {
		failed_attempts: {
			type: "integer",
			notNull: true,
			default: 0,
		},
		locked_until: {
			type: "timestamp",
			notNull: false,
		},
	});

	// Add index for checking locked accounts
	pgm.createIndex("users", "locked_until", {
		name: "users_locked_until_idx",
		where: "locked_until IS NOT NULL",
	});
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	pgm.dropIndex("users", "users_locked_until_idx");
	pgm.dropColumn("users", ["failed_attempts", "locked_until"]);
}
