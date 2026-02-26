/**
 * Create votes table - IMPROVED VERSION (from scratch)
 *
 * This is what the votes table should look like if starting from scratch.
 * Includes: proper indexes, enum type, and triggers to update answer vote counts.
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	// Create enum for vote type (more type-safe than varchar with check)
	// Check if type exists first (idempotent)
	const typeExists = await pgm.db.query(`
		SELECT EXISTS (
			SELECT 1 FROM pg_type WHERE typname = 'vote_type'
		)
	`);
	if (!typeExists.rows[0].exists) {
		pgm.createType("vote_type", ["upvote", "downvote"]);
	}

	pgm.createTable("votes", {
		id: {
			type: "serial",
			primaryKey: true,
		},
		answer_id: {
			type: "integer",
			notNull: true,
			references: "answers(id)",
			onDelete: "CASCADE",
		},
		user_id: {
			type: "integer",
			notNull: true,
			references: "users(id)",
			onDelete: "CASCADE",
		},
		vote_type: {
			type: "vote_type",
			notNull: true,
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

	// Unique constraint to prevent duplicate votes (one vote per user per answer)
	pgm.addConstraint("votes", "votes_user_answer_unique", {
		unique: ["user_id", "answer_id"],
	});

	// Indexes
	// Primary key index is created automatically

	// Index for filtering votes by answer
	pgm.createIndex("votes", "answer_id", {
		name: "votes_answer_id_idx",
	});

	// Index for filtering votes by user
	pgm.createIndex("votes", "user_id", {
		name: "votes_user_id_idx",
	});

	// Index for filtering by vote type
	pgm.createIndex("votes", "vote_type", {
		name: "votes_vote_type_idx",
	});

	// Composite indexes for common queries
	pgm.createIndex("votes", ["answer_id", "vote_type"], {
		name: "votes_answer_type_idx",
	});

	pgm.createIndex("votes", ["user_id", "answer_id"], {
		name: "votes_user_answer_idx",
		unique: true, // Same as constraint, but explicit index is good
	});

	// Trigger to automatically update updated_at timestamp
	pgm.createFunction(
		"update_votes_updated_at",
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

	pgm.createTrigger("votes", "votes_updated_at_trigger", {
		when: "BEFORE",
		operation: ["UPDATE"],
		function: "update_votes_updated_at",
		level: "ROW",
	});

	// Trigger to update answer's vote counts
	pgm.createFunction(
		"update_answer_vote_counts",
		[],
		{
			returns: "trigger",
			language: "plpgsql",
			replace: true,
		},
		`
		BEGIN
			IF TG_OP = 'INSERT' THEN
				IF NEW.vote_type = 'upvote' THEN
					UPDATE answers SET upvote_count = upvote_count + 1 WHERE id = NEW.answer_id;
				ELSIF NEW.vote_type = 'downvote' THEN
					UPDATE answers SET downvote_count = downvote_count + 1 WHERE id = NEW.answer_id;
				END IF;
				RETURN NEW;
			ELSIF TG_OP = 'UPDATE' THEN
				-- Handle vote type change
				IF OLD.vote_type = 'upvote' AND NEW.vote_type = 'downvote' THEN
					UPDATE answers SET upvote_count = GREATEST(upvote_count - 1, 0), downvote_count = downvote_count + 1 WHERE id = NEW.answer_id;
				ELSIF OLD.vote_type = 'downvote' AND NEW.vote_type = 'upvote' THEN
					UPDATE answers SET downvote_count = GREATEST(downvote_count - 1, 0), upvote_count = upvote_count + 1 WHERE id = NEW.answer_id;
				END IF;
				RETURN NEW;
			ELSIF TG_OP = 'DELETE' THEN
				IF OLD.vote_type = 'upvote' THEN
					UPDATE answers SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.answer_id;
				ELSIF OLD.vote_type = 'downvote' THEN
					UPDATE answers SET downvote_count = GREATEST(downvote_count - 1, 0) WHERE id = OLD.answer_id;
				END IF;
				RETURN OLD;
			END IF;
			RETURN NULL;
		END;
		`,
	);

	pgm.createTrigger("votes", "votes_update_answer_counts_trigger", {
		when: "AFTER",
		operation: ["INSERT", "UPDATE", "DELETE"],
		function: "update_answer_vote_counts",
		level: "ROW",
	});
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	pgm.dropTrigger("votes", "votes_updated_at_trigger", {
		ifExists: true,
	});
	pgm.dropTrigger("votes", "votes_update_answer_counts_trigger", {
		ifExists: true,
	});

	pgm.dropFunction("update_votes_updated_at", [], {
		ifExists: true,
	});
	pgm.dropFunction("update_answer_vote_counts", [], {
		ifExists: true,
	});

	pgm.dropTable("votes");

	pgm.dropType("vote_type", {
		ifExists: true,
		cascade: true,
	});
}
