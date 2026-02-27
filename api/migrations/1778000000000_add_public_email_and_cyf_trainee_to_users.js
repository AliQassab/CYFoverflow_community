/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export const up = (pgm) => {
	pgm.addColumn("users", {
		public_email: {
			type: "VARCHAR(255)",
			notNull: false,
		},
		is_cyf_trainee: {
			type: "BOOLEAN",
			notNull: true,
			default: false,
		},
	});
};

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
export const down = (pgm) => {
	pgm.dropColumn("users", ["public_email", "is_cyf_trainee"]);
};
