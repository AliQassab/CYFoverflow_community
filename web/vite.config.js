import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	build: {
		outDir: "../api/static",
	},
	server: {
		port: parseInt(process.env.PORT ?? "5173"),
		proxy: {
			"/api": "http://localhost:3100",
			"/healthz": "http://localhost:3100",
			"/uploads": "http://localhost:3100",
		},
	},
});
