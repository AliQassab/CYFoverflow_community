/**
 * Create comments table - IMPROVED VERSION (from scratch)
 *
 * This is what the comments table should look like if starting from scratch.
 * Supports comments on both questions AND answers from the beginning.
 * Includes: proper indexes, full-text search, and triggers to update counts.
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	pgm.createTable("comments", {
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
		// Support both questions and answers from the start
		question_id: {
			type: "integer",
			notNull: false,
			references: "questions(id)",
			onDelete: "CASCADE",
		},
		answer_id: {
			type: "integer",
			notNull: false,
			references: "answers(id)",
			onDelete: "CASCADE",
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

	// Constraint: exactly one of question_id or answer_id must be set
	pgm.addConstraint("comments", "comments_target_check", {
		check: `
			(question_id IS NOT NULL AND answer_id IS NULL) OR
			(question_id IS NULL AND answer_id IS NOT NULL)
		`,
	});

	// Indexes
	// Primary key index is created automatically

	// Foreign key indexes
	pgm.createIndex("comments", "user_id", {
		name: "comments_user_id_idx",
	});

	pgm.createIndex("comments", "question_id", {
		name: "comments_question_id_idx",
	});

	pgm.createIndex("comments", "answer_id", {
		name: "comments_answer_id_idx",
	});

	// Sorting indexes
	pgm.createIndex("comments", "created_at", {
		name: "comments_created_at_idx",
	});

	// Composite indexes for common query patterns
	pgm.createIndex("comments", ["question_id", "created_at"], {
		name: "comments_question_id_created_at_idx",
	});

	pgm.createIndex("comments", ["answer_id", "created_at"], {
		name: "comments_answer_id_created_at_idx",
	});

	pgm.createIndex("comments", ["user_id", "created_at"], {
		name: "comments_user_id_created_at_idx",
	});

	// Partial index for non-deleted comments
	pgm.createIndex("comments", "deleted_at", {
		name: "comments_deleted_at_idx",
		where: "deleted_at IS NULL",
	});

	// GIN index for full-text search
	pgm.createIndex("comments", "search_vector", {
		name: "comments_search_vector_idx",
		method: "GIN",
	});

	// Function to update search_vector automatically
	pgm.createFunction(
		"comments_search_vector_update",
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
	pgm.createTrigger("comments", "comments_search_vector_trigger", {
		when: "BEFORE",
		operation: ["INSERT", "UPDATE"],
		function: "comments_search_vector_update",
		level: "ROW",
	});

	// Trigger to automatically update updated_at timestamp
	pgm.createFunction(
		"update_comments_updated_at",
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

	pgm.createTrigger("comments", "comments_updated_at_trigger", {
		when: "BEFORE",
		operation: ["UPDATE"],
		function: "update_comments_updated_at",
		level: "ROW",
	});

	// Trigger to update answer's comment_count
	pgm.createFunction(
		"update_answer_comment_count",
		[],
		{
			returns: "trigger",
			language: "plpgsql",
			replace: true,
		},
		`
		BEGIN
			IF TG_OP = 'INSERT' AND NEW.answer_id IS NOT NULL THEN
				UPDATE answers SET comment_count = comment_count + 1 WHERE id = NEW.answer_id;
				RETURN NEW;
			ELSIF TG_OP = 'DELETE' AND OLD.answer_id IS NOT NULL THEN
				UPDATE answers SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.answer_id;
				RETURN OLD;
			END IF;
			RETURN NULL;
		END;
		`,
	);

	pgm.createTrigger("comments", "comments_update_answer_count_trigger", {
		when: "AFTER",
		operation: ["INSERT", "DELETE"],
		function: "update_answer_comment_count",
		level: "ROW",
	});

	// Trigger to update question's last_activity_at when comment is added
	pgm.createFunction(
		"update_question_activity_on_comment",
		[],
		{
			returns: "trigger",
			language: "plpgsql",
			replace: true,
		},
		`
		BEGIN
			IF TG_OP = 'INSERT' AND NEW.question_id IS NOT NULL THEN
				UPDATE questions SET last_activity_at = NOW() WHERE id = NEW.question_id;
				RETURN NEW;
			ELSIF TG_OP = 'INSERT' AND NEW.answer_id IS NOT NULL THEN
				-- Update question's last_activity_at when comment is added to answer
				UPDATE questions SET last_activity_at = NOW()
				WHERE id = (SELECT question_id FROM answers WHERE id = NEW.answer_id);
				RETURN NEW;
			END IF;
			RETURN NULL;
		END;
		`,
	);

	pgm.createTrigger("comments", "comments_update_question_activity_trigger", {
		when: "AFTER",
		operation: ["INSERT"],
		function: "update_question_activity_on_comment",
		level: "ROW",
	});

	// Populate search_vector for any existing rows
	pgm.sql(`
		UPDATE comments
		SET search_vector = to_tsvector('english', COALESCE(content, ''))
		WHERE search_vector IS NULL;
	`);

	// Add foreign key constraint from notifications.related_comment_id to comments.id
	// This is done here because notifications table is created before comments table
	const notificationsTableExists = await pgm.db.query(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'notifications'
		)
	`);

	if (notificationsTableExists.rows[0].exists) {
		// Check if the constraint already exists (idempotent)
		const constraintExists = await pgm.db.query(`
			SELECT EXISTS (
				SELECT 1 FROM information_schema.table_constraints
				WHERE constraint_schema = 'public'
				AND table_name = 'notifications'
				AND constraint_name = 'notifications_related_comment_id_fkey'
			)
		`);

		if (!constraintExists.rows[0].exists) {
			pgm.addConstraint(
				"notifications",
				"notifications_related_comment_id_fkey",
				{
					foreignKeys: {
						columns: "related_comment_id",
						references: "comments(id)",
						onDelete: "CASCADE",
					},
				},
			);
		}
	}
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	pgm.dropTrigger("comments", "comments_search_vector_trigger", {
		ifExists: true,
	});
	pgm.dropTrigger("comments", "comments_updated_at_trigger", {
		ifExists: true,
	});
	pgm.dropTrigger("comments", "comments_update_answer_count_trigger", {
		ifExists: true,
	});
	pgm.dropTrigger("comments", "comments_update_question_activity_trigger", {
		ifExists: true,
	});

	pgm.dropFunction("comments_search_vector_update", [], {
		ifExists: true,
	});
	pgm.dropFunction("update_comments_updated_at", [], {
		ifExists: true,
	});
	pgm.dropFunction("update_answer_comment_count", [], {
		ifExists: true,
	});
	pgm.dropFunction("update_question_activity_on_comment", [], {
		ifExists: true,
	});

	// Drop foreign key constraint from notifications table
	pgm.dropConstraint("notifications", "notifications_related_comment_id_fkey", {
		ifExists: true,
	});

	pgm.dropTable("comments");
}
