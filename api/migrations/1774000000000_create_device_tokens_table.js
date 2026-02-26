/**
 * Create device_tokens table for push notifications
 *
 * Stores device tokens for FCM (Android), APNS (iOS), and web push notifications.
 * Allows users to receive push notifications on their devices.
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	pgm.createTable("device_tokens", {
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
		platform: {
			type: "varchar(50)",
			notNull: true,
			// Values: 'android', 'ios', 'web', 'desktop'
		},
		device_info: {
			type: "varchar(255)",
			notNull: false,
		},
		app_version: {
			type: "varchar(50)",
			notNull: false,
		},
		is_active: {
			type: "boolean",
			notNull: true,
			default: true,
		},
		last_used_at: {
			type: "timestamp",
			notNull: false,
		},
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
	});

	// Indexes for performance
	pgm.createIndex("device_tokens", "user_id", {
		name: "device_tokens_user_id_idx",
	});

	pgm.createIndex("device_tokens", "token", {
		name: "device_tokens_token_idx",
		unique: true,
	});

	pgm.createIndex("device_tokens", ["user_id", "platform"], {
		name: "device_tokens_user_platform_idx",
	});

	pgm.createIndex("device_tokens", ["user_id", "is_active"], {
		name: "device_tokens_user_active_idx",
		where: "is_active = true",
	});

	// Composite index for active token lookups
	pgm.createIndex("device_tokens", ["user_id", "platform", "is_active"], {
		name: "device_tokens_lookup_idx",
		where: "is_active = true",
	});

	// Trigger to automatically update updated_at timestamp
	pgm.createFunction(
		"update_device_tokens_updated_at",
		[],
		{
			returns: "trigger",
			language: "plpgsql",
			replace: true,
		},
		`
		BEGIN
			NEW.updated_at = NOW();
			RETURN NEW;
		END;
		`,
	);

	pgm.createTrigger("device_tokens", "device_tokens_updated_at_trigger", {
		when: "BEFORE",
		operation: ["UPDATE"],
		function: "update_device_tokens_updated_at",
		level: "ROW",
		ifNotExists: true,
	});
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	pgm.dropTrigger("device_tokens", "device_tokens_updated_at_trigger", {
		ifExists: true,
	});

	pgm.dropFunction("update_device_tokens_updated_at", [], {
		ifExists: true,
	});

	pgm.dropTable("device_tokens");
}
