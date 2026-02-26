import pg from "pg";

import config from "./utils/config.js";
import logger from "./utils/logger.js";

/** @type {pg.Pool} */
let pool;

export const connectDb = async () => {
	// Configure connection pool with proper limits
	const poolConfig = {
		...config.dbConfig,
		max: 20, // Maximum number of clients in the pool
		idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
		connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
		allowExitOnIdle: false, // Don't close pool when idle
	};

	pool = new pg.Pool(poolConfig);

	pool.on("error", (err) => {
		logger.error("Unexpected error on idle client: %O", err);
	});

	pool.on("connect", () => {
		logger.debug("New client connected to database");
	});

	pool.on("remove", () => {
		logger.debug("Client removed from pool");
	});

	const client = await pool.connect();
	logger.info(
		"connected to %s (pool configured: max=%d)",
		client.database,
		poolConfig.max,
	);
	client.release();
};

export const disconnectDb = async () => {
	if (pool) {
		await pool.end();
	}
};

export const testConnection = async () => {
	await query("SELECT 1;");
};

function query(...args) {
	logger.debug("Postgres query: %O", args);
	return pool.query.apply(pool, args);
}

export const getClient = async () => {
	return await pool.connect();
};

export default { query };
