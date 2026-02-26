/**
 * Create password_reset_tokens table
 * Stores password reset tokens for forgot password functionality
 */

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	pgm.createTable("password_reset_tokens", {
		id: {
			type: "serial",
			primaryKey: true,
		},
		user_id: {
			type: "integer",
			notNull: true,
			references: "users(id)",
			onDelete: "CASCADE",
		},
		token: {
			type: "varchar(255)",
			notNull: true,
			unique: true,
		},
		expires_at: {
			type: "timestamp",
			notNull: true,
		},
		used_at: {
			type: "timestamp",
			notNull: false,
		},
		created_at: {
			type: "timestamp",
			notNull: true,
			default: pgm.func("NOW()"),
		},
	});

	// Indexes
	pgm.createIndex("password_reset_tokens", "token", {
		name: "password_reset_tokens_token_idx",
		unique: true,
	});
	pgm.createIndex("password_reset_tokens", "user_id", {
		name: "password_reset_tokens_user_id_idx",
	});
	pgm.createIndex("password_reset_tokens", "expires_at", {
		name: "password_reset_tokens_expires_at_idx",
	});

	// Clean up expired tokens automatically (via application logic or scheduled job)
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	pgm.dropTable("password_reset_tokens");
}
