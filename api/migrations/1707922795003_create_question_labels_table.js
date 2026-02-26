/**
 * Create question_labels junction table - IMPROVED VERSION (from scratch)
 *
 * This is what the question_labels table should look like if starting from scratch.
 * Includes: proper indexes, created_at tracking, and composite indexes for common queries.
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	pgm.createTable("question_labels", {
		question_id: {
			type: "integer",
			notNull: true,
			references: "questions(id)",
			onDelete: "CASCADE",
		},
		label_id: {
			type: "integer",
			notNull: true,
			references: "labels(id)",
			onDelete: "CASCADE",
		},
		created_at: {
			type: "timestamp",
			notNull: true,
			default: pgm.func("NOW()"),
		},
	});

	// Composite primary key
	pgm.addConstraint("question_labels", "pk_question_labels", {
		primaryKey: ["question_id", "label_id"],
	});

	// Indexes for performance
	// Primary key index is created automatically

	// Index for filtering questions by label
	pgm.createIndex("question_labels", "label_id", {
		name: "question_labels_label_id_idx",
	});

	// Index for getting all labels for a question
	pgm.createIndex("question_labels", "question_id", {
		name: "question_labels_question_id_idx",
	});

	// Composite index for reverse lookups (questions by label, sorted by creation)
	pgm.createIndex("question_labels", ["label_id", "question_id"], {
		name: "question_labels_label_question_idx",
	});

	// Composite index for getting labels for a question (already covered by PK, but explicit is good)
	pgm.createIndex("question_labels", ["question_id", "label_id"], {
		name: "question_labels_question_label_idx",
	});
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	pgm.dropTable("question_labels");
}
