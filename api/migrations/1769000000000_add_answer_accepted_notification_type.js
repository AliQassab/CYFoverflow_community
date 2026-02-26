/**
 * Add 'answer_accepted' to notification_type enum
 *
 * This migration adds the missing 'answer_accepted' notification type
 * that was implemented in the notification service but not added to the enum.
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	// Add 'answer_accepted' to the notification_type enum
	// PostgreSQL allows adding values to enums, but we need to check if it exists first
	const enumExists = await pgm.db.query(`
		SELECT EXISTS (
			SELECT 1 FROM pg_type WHERE typname = 'notification_type'
		)
	`);

	if (enumExists.rows[0].exists) {
		// Check if 'answer_accepted' already exists in the enum
		const valueExists = await pgm.db.query(`
			SELECT EXISTS (
				SELECT 1 FROM pg_enum
				WHERE enumlabel = 'answer_accepted'
				AND enumtypid = (
					SELECT oid FROM pg_type WHERE typname = 'notification_type'
				)
			)
		`);

		if (!valueExists.rows[0].exists) {
			// Add the new enum value
			// Note: PostgreSQL doesn't support IF NOT EXISTS for ADD VALUE
			// So we check first and only add if it doesn't exist
			try {
				pgm.sql(`
					ALTER TYPE notification_type ADD VALUE 'answer_accepted';
				`);
			} catch (error) {
				// If the value already exists (race condition), ignore the error
				if (!error.message.includes("already exists")) {
					throw error;
				}
			}
		}
	}
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down() {
	// Note: PostgreSQL does not support removing enum values directly
	// To remove, we would need to:
	// 1. Create a new enum without the value
	// 2. Alter the table to use the new enum
	// 3. Drop the old enum
	// This is complex and risky, so we'll leave it as a no-op
	// If needed, this should be done manually with proper data migration
}
