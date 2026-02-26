/**
 * Create questions table (from scratch)
 *
 * This is what the questions table should look like if starting from scratch.
 * Includes: full-text search, denormalized counts, activity tracking, and proper constraints.
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	// Create enum for question status (more flexible than just is_solved)
	// Check if type exists first (idempotent)
	const typeExists = await pgm.db.query(`
		SELECT EXISTS (
			SELECT 1 FROM pg_type WHERE typname = 'question_status'
		)
	`);
	if (!typeExists.rows[0].exists) {
		pgm.createType("question_status", ["open", "solved", "closed", "archived"]);
	}

	// Create questions table with all columns
	pgm.createTable("questions", {
		id: { type: "serial", primaryKey: true },

		// Core content
		title: {
			type: "varchar(255)", // Constrained length instead of unlimited text
			notNull: true,
		},
		content: {
			type: "text",
			notNull: true,
		},
		slug: {
			type: "varchar(255)", // Constrained length
			notNull: true,
			unique: true,
		},

		// Relationships
		user_id: {
			type: "integer",
			notNull: true,
			references: "users(id)",
			onDelete: "CASCADE",
		},

		// Status and metadata
		status: {
			type: "question_status",
			notNull: true,
			default: "open",
		},
		is_solved: {
			type: "boolean",
			notNull: true,
			default: false,
		},

		// Template-specific fields (optional)
		template_type: { type: "varchar(50)", notNull: false },
		browser: { type: "varchar(100)", notNull: false },
		os: { type: "varchar(100)", notNull: false },
		documentation_link: { type: "text", notNull: false },

		// Denormalized counts (for performance)
		answer_count: {
			type: "integer",
			notNull: true,
			default: 0,
		},
		view_count: {
			type: "integer",
			notNull: true,
			default: 0,
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
		last_activity_at: {
			type: "timestamp",
			notNull: true,
			default: pgm.func("NOW()"),
		},

		// Soft delete support
		deleted_at: {
			type: "timestamp",
			notNull: false,
		},

		// Full-text search vector (for PostgreSQL full-text search)
		search_vector: {
			type: "tsvector",
			notNull: false,
		},
	});

	// Indexes for performance
	// Primary key index is created automatically

	// Unique constraint on slug (already in column definition, but explicit index is good)
	pgm.createIndex("questions", "slug", {
		name: "questions_slug_idx",
		unique: true,
	});

	// Foreign key index
	pgm.createIndex("questions", "user_id", {
		name: "questions_user_id_idx",
	});

	// Sorting indexes
	pgm.createIndex("questions", "created_at", {
		name: "questions_created_at_idx",
	});

	pgm.createIndex("questions", "last_activity_at", {
		name: "questions_last_activity_at_idx",
	});

	// Filtering indexes
	pgm.createIndex("questions", "status", {
		name: "questions_status_idx",
	});

	pgm.createIndex("questions", "is_solved", {
		name: "questions_is_solved_idx",
	});

	// Popularity/sorting indexes
	pgm.createIndex("questions", "answer_count", {
		name: "questions_answer_count_idx",
	});

	pgm.createIndex("questions", "view_count", {
		name: "questions_view_count_idx",
	});

	// Composite indexes for common query patterns
	pgm.createIndex("questions", ["user_id", "created_at"], {
		name: "questions_user_id_created_at_idx",
	});

	pgm.createIndex("questions", ["status", "created_at"], {
		name: "questions_status_created_at_idx",
	});

	pgm.createIndex("questions", ["status", "last_activity_at"], {
		name: "questions_status_last_activity_idx",
	});

	// Partial index for soft deletes (only index non-deleted questions)
	pgm.createIndex("questions", "deleted_at", {
		name: "questions_deleted_at_idx",
		where: "deleted_at IS NULL",
	});

	// GIN index for full-text search (very fast)
	pgm.createIndex("questions", "search_vector", {
		name: "questions_search_vector_idx",
		method: "GIN",
	});

	// Function to update search_vector automatically
	pgm.createFunction(
		"questions_search_vector_update",
		[],
		{
			returns: "trigger",
			language: "plpgsql",
			replace: true,
		},
		`
		BEGIN
			NEW.search_vector :=
				setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
				setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
			RETURN NEW;
		END;
		`,
	);

	// Trigger to automatically update search_vector on insert/update
	pgm.createTrigger("questions", "questions_search_vector_trigger", {
		when: "BEFORE",
		operation: ["INSERT", "UPDATE"],
		function: "questions_search_vector_update",
		level: "ROW",
	});

	// Function to update last_activity_at when answers/comments are added
	// (This would be called from application code or via triggers on answers/comments tables)
	pgm.createFunction(
		"update_question_last_activity",
		[{ type: "integer", name: "question_id_param" }],
		{
			returns: "void",
			language: "plpgsql",
			replace: true,
		},
		`
		BEGIN
			UPDATE questions
			SET last_activity_at = NOW()
			WHERE id = question_id_param;
		END;
		`,
	);

	// Trigger to automatically update updated_at timestamp
	pgm.createFunction(
		"update_questions_updated_at",
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

	pgm.createTrigger("questions", "questions_updated_at_trigger", {
		when: "BEFORE",
		operation: ["UPDATE"],
		function: "update_questions_updated_at",
		level: "ROW",
	});

	// Populate search_vector for any existing rows (if migrating)
	pgm.sql(`
		UPDATE questions
		SET search_vector =
			setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
			setweight(to_tsvector('english', COALESCE(content, '')), 'B')
		WHERE search_vector IS NULL;
	`);
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	// Drop triggers first
	pgm.dropTrigger("questions", "questions_search_vector_trigger", {
		ifExists: true,
	});
	pgm.dropTrigger("questions", "questions_updated_at_trigger", {
		ifExists: true,
	});

	// Drop functions
	pgm.dropFunction("questions_search_vector_update", [], {
		ifExists: true,
	});
	pgm.dropFunction("update_question_last_activity", [{ type: "integer" }], {
		ifExists: true,
	});
	pgm.dropFunction("update_questions_updated_at", [], {
		ifExists: true,
	});

	// Drop table (this will drop all indexes automatically)
	pgm.dropTable("questions");

	// Drop enum type
	pgm.dropType("question_status", {
		ifExists: true,
		cascade: true,
	});
}
