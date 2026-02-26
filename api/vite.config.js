import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		deps: {
			interopDefault: false,
		},
		globals: true,
		environment: "node",
		fileParallelism: false,
		setupFiles: ["./setupTests.js"],
		env: {
			JWT_SECRET: "test-secret-for-ci-only",
		},
	},
});
