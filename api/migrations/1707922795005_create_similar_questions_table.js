/**
 * Create similar_questions table - For related/similar questions feature
 *
 * This table stores relationships between questions, supporting:
 * - Manual relationships (users marking questions as similar/duplicate)
 * - Algorithmic relationships (similarity scores from text matching)
 * - Duplicate relationships (one question marked as duplicate of another)
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	// Create enum for relationship type
	// Check if type exists first (idempotent)
	const typeExists = await pgm.db.query(`
		SELECT EXISTS (
			SELECT 1 FROM pg_type WHERE typname = 'question_relation_type'
		)
	`);
	if (!typeExists.rows[0].exists) {
		pgm.createType("question_relation_type", [
			"similar", // Similar topics/content
			"duplicate", // Exact duplicate question
			"related", // Related but not duplicate
		]);
	}

	pgm.createTable("similar_questions", {
		id: {
			type: "serial",
			primaryKey: true,
		},
		question_id: {
			type: "integer",
			notNull: true,
			references: "questions(id)",
			onDelete: "CASCADE",
		},
		related_question_id: {
			type: "integer",
			notNull: true,
			references: "questions(id)",
			onDelete: "CASCADE",
		},
		relation_type: {
			type: "question_relation_type",
			notNull: true,
			default: "similar",
		},
		// Similarity score (0.0 to 1.0) for algorithmic matches
		similarity_score: {
			type: "real",
			notNull: false,
		},
		// Who created this relationship (null for algorithmic)
		created_by_user_id: {
			type: "integer",
			notNull: false,
			references: "users(id)",
			onDelete: "SET NULL",
		},
		// Metadata
		is_active: {
			type: "boolean",
			notNull: true,
			default: true,
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

	// Constraint: question cannot be related to itself
	pgm.addConstraint(
		"similar_questions",
		"similar_questions_no_self_reference",
		{
			check: "question_id != related_question_id",
		},
	);

	// Unique constraint: prevent duplicate relationships
	// (same two questions can't have multiple relationships of same type)
	pgm.addConstraint("similar_questions", "similar_questions_unique_relation", {
		unique: ["question_id", "related_question_id", "relation_type"],
	});

	// Indexes
	// Primary key index is created automatically

	// Index for finding all similar questions for a given question
	pgm.createIndex("similar_questions", "question_id", {
		name: "similar_questions_question_id_idx",
	});

	// Index for reverse lookups (questions that are similar to this one)
	pgm.createIndex("similar_questions", "related_question_id", {
		name: "similar_questions_related_question_id_idx",
	});

	// Index for filtering by relation type
	pgm.createIndex("similar_questions", "relation_type", {
		name: "similar_questions_relation_type_idx",
	});

	// Index for filtering active relationships
	pgm.createIndex("similar_questions", "is_active", {
		name: "similar_questions_is_active_idx",
	});

	// Index for sorting by similarity score
	pgm.createIndex("similar_questions", "similarity_score", {
		name: "similar_questions_similarity_score_idx",
		where: "similarity_score IS NOT NULL",
	});

	// Composite indexes for common query patterns
	// Most common: active similar questions for a question, sorted by score
	pgm.createIndex(
		"similar_questions",
		["question_id", "is_active", "similarity_score"],
		{
			name: "similar_questions_question_active_score_idx",
			where: "is_active = true AND similarity_score IS NOT NULL",
		},
	);

	// Active similar questions sorted by type
	pgm.createIndex(
		"similar_questions",
		["question_id", "relation_type", "is_active"],
		{
			name: "similar_questions_question_type_active_idx",
			where: "is_active = true",
		},
	);

	// Trigger to automatically update updated_at timestamp
	pgm.createFunction(
		"update_similar_questions_updated_at",
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

	pgm.createTrigger(
		"similar_questions",
		"similar_questions_updated_at_trigger",
		{
			when: "BEFORE",
			operation: ["UPDATE"],
			function: "update_similar_questions_updated_at",
			level: "ROW",
		},
	);
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	pgm.dropTrigger("similar_questions", "similar_questions_updated_at_trigger", {
		ifExists: true,
	});

	pgm.dropFunction("update_similar_questions_updated_at", [], {
		ifExists: true,
	});

	pgm.dropTable("similar_questions");

	pgm.dropType("question_relation_type", {
		ifExists: true,
		cascade: true,
	});
}
