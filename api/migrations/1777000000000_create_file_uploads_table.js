/**
 * Create file_uploads table
 * Stores metadata for uploaded files (images, code snippets, etc.)
 */

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function up(pgm) {
	pgm.createTable("file_uploads", {
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
		original_filename: {
			type: "varchar(255)",
			notNull: true,
		},
		stored_filename: {
			type: "varchar(255)",
			notNull: true,
			unique: true,
		},
		file_path: {
			type: "text",
			notNull: true,
		},
		file_url: {
			type: "text",
			notNull: true,
		},
		mime_type: {
			type: "varchar(100)",
			notNull: true,
		},
		file_size: {
			type: "bigint",
			notNull: true,
		},
		file_type: {
			type: "varchar(50)",
			notNull: true,
			default: "image",
		},
		width: {
			type: "integer",
			notNull: false,
		},
		height: {
			type: "integer",
			notNull: false,
		},
		thumbnail_path: {
			type: "text",
			notNull: false,
		},
		thumbnail_url: {
			type: "text",
			notNull: false,
		},
		created_at: {
			type: "timestamp",
			notNull: true,
			default: pgm.func("NOW()"),
		},
		deleted_at: {
			type: "timestamp",
			notNull: false,
		},
	});

	// Indexes
	pgm.createIndex("file_uploads", "user_id", {
		name: "file_uploads_user_id_idx",
	});
	pgm.createIndex("file_uploads", "stored_filename", {
		name: "file_uploads_stored_filename_idx",
		unique: true,
	});
	pgm.createIndex("file_uploads", "file_type", {
		name: "file_uploads_file_type_idx",
	});
	pgm.createIndex("file_uploads", "created_at", {
		name: "file_uploads_created_at_idx",
	});
	pgm.createIndex("file_uploads", "deleted_at", {
		name: "file_uploads_deleted_at_idx",
		where: "deleted_at IS NULL",
	});
}

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export async function down(pgm) {
	pgm.dropTable("file_uploads");
}
