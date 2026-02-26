/**
 * Create refresh_tokens table for token refresh system
 *
 * Refresh tokens allow users to stay logged in without re-entering credentials.
 * They are long-lived tokens that can be exchanged for new access tokens.
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	pgm.createTable("refresh_tokens", {
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
			type: "varchar(500)",
			notNull: true,
			unique: true,
		},
		device_info: {
			type: "varchar(255)",
			notNull: false,
		},
		ip_address: {
			type: "varchar(45)", // IPv6 max length
			notNull: false,
		},
		expires_at: {
			type: "timestamp",
			notNull: true,
		},
		revoked: {
			type: "boolean",
			notNull: true,
			default: false,
		},
		revoked_at: {
			type: "timestamp",
			notNull: false,
		},
		created_at: {
			type: "timestamp",
			notNull: true,
			default: pgm.func("NOW()"),
		},
	});

	// Indexes for performance
	pgm.createIndex("refresh_tokens", "user_id", {
		name: "refresh_tokens_user_id_idx",
	});

	pgm.createIndex("refresh_tokens", "token", {
		name: "refresh_tokens_token_idx",
		unique: true,
	});

	pgm.createIndex("refresh_tokens", "expires_at", {
		name: "refresh_tokens_expires_at_idx",
	});

	pgm.createIndex("refresh_tokens", ["user_id", "revoked"], {
		name: "refresh_tokens_user_revoked_idx",
	});

	// Composite index for active token lookups
	pgm.createIndex("refresh_tokens", ["token", "revoked", "expires_at"], {
		name: "refresh_tokens_lookup_idx",
		where: "revoked = false",
	});
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	pgm.dropTable("refresh_tokens");
}
