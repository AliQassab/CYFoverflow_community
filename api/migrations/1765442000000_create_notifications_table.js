/**
 * Create notifications table - IMPROVED VERSION (from scratch)
 *
 * This is what the notifications table should look like if starting from scratch.
 * Includes: enum types, proper indexes, and composite indexes for common queries.
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	// Create enum for notification type
	// Check if type exists first (idempotent)
	const typeExists = await pgm.db.query(`
		SELECT EXISTS (
			SELECT 1 FROM pg_type WHERE typname = 'notification_type'
		)
	`);
	if (!typeExists.rows[0].exists) {
		pgm.createType("notification_type", [
			"question_added", // New question asked
			"answer_added", // Answer added to question
			"comment_added", // Comment added
		]);
	}

	pgm.createTable("notifications", {
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
		type: {
			type: "notification_type",
			notNull: true,
		},
		message: {
			type: "text",
			notNull: true,
		},
		// Related entities (optional, depending on notification type)
		related_question_id: {
			type: "integer",
			notNull: false,
			references: "questions(id)",
			onDelete: "CASCADE",
		},
		related_answer_id: {
			type: "integer",
			notNull: false,
			references: "answers(id)",
			onDelete: "CASCADE",
		},
		related_comment_id: {
			type: "integer",
			notNull: false,
			// Foreign key constraint will be added in a later migration after comments table exists
		},
		// Status
		read: {
			type: "boolean",
			notNull: true,
			default: false,
		},
		read_at: {
			type: "timestamp",
			notNull: false,
		},
		// Timestamps
		created_at: {
			type: "timestamp",
			notNull: true,
			default: pgm.func("NOW()"),
		},
	});

	// Indexes
	// Primary key index is created automatically

	// Index for filtering notifications by user
	pgm.createIndex("notifications", "user_id", {
		name: "notifications_user_id_idx",
	});

	// Index for filtering unread notifications
	pgm.createIndex("notifications", "read", {
		name: "notifications_read_idx",
	});

	// Index for filtering by type
	pgm.createIndex("notifications", "type", {
		name: "notifications_type_idx",
	});

	// Sorting index
	pgm.createIndex("notifications", "created_at", {
		name: "notifications_created_at_idx",
	});

	// Composite indexes for common query patterns
	// Most common: unread notifications for user, sorted by date
	pgm.createIndex("notifications", ["user_id", "read", "created_at"], {
		name: "notifications_user_read_created_idx",
	});

	// All notifications for user, sorted by date
	pgm.createIndex("notifications", ["user_id", "created_at"], {
		name: "notifications_user_created_idx",
	});

	// Unread notifications by type
	pgm.createIndex("notifications", ["user_id", "type", "read"], {
		name: "notifications_user_type_read_idx",
		where: "read = false",
	});

	// Indexes for related entities (for cleanup/deletion)
	pgm.createIndex("notifications", "related_question_id", {
		name: "notifications_question_id_idx",
	});

	pgm.createIndex("notifications", "related_answer_id", {
		name: "notifications_answer_id_idx",
	});
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	pgm.dropTable("notifications");

	pgm.dropType("notification_type", {
		ifExists: true,
		cascade: true,
	});
}
