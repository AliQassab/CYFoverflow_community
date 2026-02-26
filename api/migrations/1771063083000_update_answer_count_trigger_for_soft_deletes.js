/**
 * Update the answer_count trigger to handle soft deletes (UPDATE operations)
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	// Update the trigger function to handle UPDATE operations for soft deletes
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
			ELSIF TG_OP = 'UPDATE' THEN
				-- Handle soft delete: deleted_at changes from NULL to a timestamp
				IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
					UPDATE questions
					SET answer_count = GREATEST(answer_count - 1, 0),
						last_activity_at = NOW()
					WHERE id = NEW.question_id;
				-- Handle restore: deleted_at changes from a timestamp to NULL
				ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
					UPDATE questions
					SET answer_count = answer_count + 1,
						last_activity_at = NOW()
					WHERE id = NEW.question_id;
				END IF;
				RETURN NEW;
			END IF;
			RETURN NULL;
		END;
		`,
	);

	// Update the trigger to include UPDATE operations
	pgm.dropTrigger("answers", "answers_update_question_trigger", {
		ifExists: true,
	});
	pgm.createTrigger("answers", "answers_update_question_trigger", {
		when: "AFTER",
		operation: ["INSERT", "UPDATE", "DELETE"],
		function: "update_question_on_answer_change",
		level: "ROW",
	});
}

/**
 * Revert the trigger to its original state (only INSERT and DELETE)
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	// Revert to original function (without UPDATE handling)
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

	// Revert trigger to only INSERT and DELETE
	pgm.dropTrigger("answers", "answers_update_question_trigger", {
		ifExists: true,
	});
	pgm.createTrigger("answers", "answers_update_question_trigger", {
		when: "AFTER",
		operation: ["INSERT", "DELETE"],
		function: "update_question_on_answer_change",
		level: "ROW",
	});
}
