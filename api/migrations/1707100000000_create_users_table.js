/**
 * Create users table - IMPROVED VERSION (from scratch)
 *
 * This is what the users table should look like if starting from scratch.
 * Includes: proper indexes, updated_at tracking, soft deletes, and email normalization.
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	pgm.createTable("users", {
		id: {
			type: "serial",
			primaryKey: true,
		},
		name: {
			type: "varchar(255)",
			notNull: true,
		},
		email: {
			type: "varchar(255)",
			notNull: true,
			unique: true,
		},
		hashed_password: {
			type: "varchar(255)", // bcrypt hashes are 60 chars, but leaving room for other algorithms
			notNull: true,
		},
		// Profile fields (optional)
		bio: {
			type: "text",
			notNull: false,
		},
		avatar_url: {
			type: "varchar(500)",
			notNull: false,
		},
		// Account status
		is_active: {
			type: "boolean",
			notNull: true,
			default: true,
		},
		is_email_verified: {
			type: "boolean",
			notNull: true,
			default: false,
		},
		email_verified_at: {
			type: "timestamp",
			notNull: false,
		},
		// Timestamps
		created_at: {
			type: "timestamp",
			notNull: true,
			default: pgm.func("NOW()"),
		},
		updated_at: {
			type: "timestamp",
			notNull: true,
			default: pgm.func("NOW()"),
		},
		last_login_at: {
			type: "timestamp",
			notNull: false,
		},
		// Soft delete support
		deleted_at: {
			type: "timestamp",
			notNull: false,
		},
	});

	// Indexes
	// Primary key index is created automatically

	// Unique index on email (already in column definition, but explicit is good)
	pgm.createIndex("users", "email", {
		name: "users_email_idx",
		unique: true,
	});

	// Index for filtering active users
	pgm.createIndex("users", "is_active", {
		name: "users_is_active_idx",
	});

	// Partial index for non-deleted users (common query pattern)
	pgm.createIndex("users", "deleted_at", {
		name: "users_deleted_at_idx",
		where: "deleted_at IS NULL",
	});

	// Composite index for common query: active, non-deleted users
	pgm.createIndex("users", ["is_active", "deleted_at"], {
		name: "users_active_not_deleted_idx",
		where: "is_active = true AND deleted_at IS NULL",
	});

	// Trigger to automatically update updated_at timestamp
	// Use CREATE OR REPLACE to make it idempotent
	pgm.createFunction(
		"update_users_updated_at",
		[],
		{
			returns: "trigger",
			language: "plpgsql",
			replace: true, // Changed to true to allow replacing existing function
		},
		`
		BEGIN
			NEW.updated_at = NOW();
			RETURN NEW;
		END;
		`,
	);

	pgm.createTrigger("users", "users_updated_at_trigger", {
		when: "BEFORE",
		operation: ["UPDATE"],
		function: "update_users_updated_at",
		level: "ROW",
		ifNotExists: true, // Add ifNotExists to prevent errors
	});
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	pgm.dropTrigger("users", "users_updated_at_trigger", {
		ifExists: true,
	});

	pgm.dropFunction("update_users_updated_at", [], {
		ifExists: true,
	});

	pgm.dropTable("users");
}
