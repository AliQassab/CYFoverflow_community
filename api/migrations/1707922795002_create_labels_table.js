/**
 * Create labels table - IMPROVED VERSION (from scratch)
 *
 * This is what the labels table should look like if starting from scratch.
 * Includes: proper indexes, description field, color/slug support, and usage tracking.
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	pgm.createTable("labels", {
		id: {
			type: "serial",
			primaryKey: true,
		},
		name: {
			type: "varchar(100)", // Constrained length
			notNull: true,
			unique: true,
		},
		slug: {
			type: "varchar(100)", // URL-friendly version of name
			notNull: true,
			unique: true,
		},
		description: {
			type: "text",
			notNull: false,
		},
		color: {
			type: "varchar(7)", // Hex color code (#RRGGBB)
			notNull: false,
		},
		// Usage tracking (denormalized for performance)
		question_count: {
			type: "integer",
			notNull: true,
			default: 0,
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

	// Indexes
	// Primary key index is created automatically

	// Unique index on name
	pgm.createIndex("labels", "name", {
		name: "labels_name_idx",
		unique: true,
	});

	// Unique index on slug
	pgm.createIndex("labels", "slug", {
		name: "labels_slug_idx",
		unique: true,
	});

	// Index for filtering active labels
	pgm.createIndex("labels", "is_active", {
		name: "labels_is_active_idx",
	});

	// Index for sorting by popularity
	pgm.createIndex("labels", "question_count", {
		name: "labels_question_count_idx",
	});

	// Composite index for common query: active labels sorted by popularity
	pgm.createIndex("labels", ["is_active", "question_count"], {
		name: "labels_active_popular_idx",
		where: "is_active = true",
	});

	// Trigger to automatically update updated_at timestamp
	pgm.createFunction(
		"update_labels_updated_at",
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

	pgm.createTrigger("labels", "labels_updated_at_trigger", {
		when: "BEFORE",
		operation: ["UPDATE"],
		function: "update_labels_updated_at",
		level: "ROW",
	});

	// Insert default labels with slugs
	pgm.sql(`
		INSERT INTO labels (name, slug, color) VALUES
		('HTML', 'html', '#e34c26'),
		('CSS', 'css', '#1572b6'),
		('JavaScript', 'javascript', '#f7df1e'),
		('Java', 'java', '#ed8b00'),
		('React', 'react', '#61dafb'),
		('Python', 'python', '#3776ab'),
		('ITD', 'itd', '#6c757d'),
		('ITP', 'itp', '#6c757d'),
		('Piscine', 'piscine', '#6c757d'),
		('SDC', 'sdc', '#6c757d'),
		('Launch-Module', 'launch-module', '#6c757d')
		ON CONFLICT (name) DO NOTHING;
	`);
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	pgm.dropTrigger("labels", "labels_updated_at_trigger", {
		ifExists: true,
	});

	pgm.dropFunction("update_labels_updated_at", [], {
		ifExists: true,
	});

	pgm.dropTable("labels");
}
