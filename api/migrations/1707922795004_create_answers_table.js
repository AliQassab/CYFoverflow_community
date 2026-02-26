/**
 * Create answers table - IMPROVED VERSION (from scratch)
 *
 * This is what the answers table should look like if starting from scratch.
 * Includes: proper indexes, denormalized counts, soft deletes, and full-text search.
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	pgm.createTable("answers", {
		id: {
			type: "serial",
			primaryKey: true,
		},
		content: {
			type: "text",
			notNull: true,
		},
		user_id: {
			type: "integer",
			notNull: true,
			references: "users(id)",
			onDelete: "CASCADE",
		},
		question_id: {
			type: "integer",
			notNull: true,
			references: "questions(id)",
			onDelete: "CASCADE",
		},
		// Denormalized counts (for performance)
		upvote_count: {
			type: "integer",
			notNull: true,
			default: 0,
		},
		downvote_count: {
			type: "integer",
			notNull: true,
			default: 0,
		},
		comment_count: {
			type: "integer",
			notNull: true,
			default: 0,
		},
		// Status
		is_accepted: {
			type: "boolean",
			notNull: true,
			default: false,
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
		// Soft delete support
		deleted_at: {
			type: "timestamp",
			notNull: false,
		},
		// Full-text search vector
		search_vector: {
			type: "tsvector",
			notNull: false,
		},
	});

	// Indexes
	// Primary key index is created automatically

	// Foreign key indexes
	pgm.createIndex("answers", "user_id", {
		name: "answers_user_id_idx",
	});

	pgm.createIndex("answers", "question_id", {
		name: "answers_question_id_idx",
	});

	// Sorting indexes
	pgm.createIndex("answers", "created_at", {
		name: "answers_created_at_idx",
	});

	// Popularity indexes
	pgm.createIndex("answers", "upvote_count", {
		name: "answers_upvote_count_idx",
	});

	pgm.createIndex("answers", ["upvote_count", "downvote_count"], {
		name: "answers_vote_score_idx",
	});

	// Composite indexes for common query patterns
	pgm.createIndex("answers", ["question_id", "created_at"], {
		name: "answers_question_id_created_at_idx",
	});

	pgm.createIndex("answers", ["question_id", "upvote_count"], {
		name: "answers_question_popular_idx",
	});

	pgm.createIndex("answers", ["user_id", "created_at"], {
		name: "answers_user_id_created_at_idx",
	});

	pgm.createIndex("answers", ["question_id", "is_accepted"], {
		name: "answers_question_accepted_idx",
	});

	// Partial index for non-deleted answers
	pgm.createIndex("answers", "deleted_at", {
		name: "answers_deleted_at_idx",
		where: "deleted_at IS NULL",
	});

	// GIN index for full-text search
	pgm.createIndex("answers", "search_vector", {
		name: "answers_search_vector_idx",
		method: "GIN",
	});

	// Function to update search_vector automatically
	pgm.createFunction(
		"answers_search_vector_update",
		[],
		{
			returns: "trigger",
			language: "plpgsql",
			replace: true,
		},
		`
		BEGIN
			NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
			RETURN NEW;
		END;
		`,
	);

	// Trigger to automatically update search_vector on insert/update
	pgm.createTrigger("answers", "answers_search_vector_trigger", {
		when: "BEFORE",
		operation: ["INSERT", "UPDATE"],
		function: "answers_search_vector_update",
		level: "ROW",
	});

	// Trigger to automatically update updated_at timestamp
	pgm.createFunction(
		"update_answers_updated_at",
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

	pgm.createTrigger("answers", "answers_updated_at_trigger", {
		when: "BEFORE",
		operation: ["UPDATE"],
		function: "update_answers_updated_at",
		level: "ROW",
	});

	// Trigger to update question's answer_count and last_activity_at
	pgm.createFunction(
		"update_question_on_answer_change",
		[],
		{
			returns: "trigger",
			language: "plpgsql",
			replace: true,
		},
		`
		BEGIN
			IF TG_OP = 'INSERT' THEN
				UPDATE questions
				SET answer_count = answer_count + 1,
					last_activity_at = NOW()
				WHERE id = NEW.question_id;
				RETURN NEW;
			ELSIF TG_OP = 'DELETE' THEN
				UPDATE questions
				SET answer_count = GREATEST(answer_count - 1, 0),
					last_activity_at = NOW()
				WHERE id = OLD.question_id;
				RETURN OLD;
			END IF;
			RETURN NULL;
		END;
		`,
	);

	pgm.createTrigger("answers", "answers_update_question_trigger", {
		when: "AFTER",
		operation: ["INSERT", "DELETE"],
		function: "update_question_on_answer_change",
		level: "ROW",
	});

	// Populate search_vector for any existing rows
	pgm.sql(`
		UPDATE answers
		SET search_vector = to_tsvector('english', COALESCE(content, ''))
		WHERE search_vector IS NULL;
	`);
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	pgm.dropTrigger("answers", "answers_search_vector_trigger", {
		ifExists: true,
	});
	pgm.dropTrigger("answers", "answers_updated_at_trigger", {
		ifExists: true,
	});
	pgm.dropTrigger("answers", "answers_update_question_trigger", {
		ifExists: true,
	});

	pgm.dropFunction("answers_search_vector_update", [], {
		ifExists: true,
	});
	pgm.dropFunction("update_answers_updated_at", [], {
		ifExists: true,
	});
	pgm.dropFunction("update_question_on_answer_change", [], {
		ifExists: true,
	});

	pgm.dropTable("answers");
}
