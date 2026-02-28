import db, { getClient } from "../db.js";
import logger from "../utils/logger.js";

export const getStatsDB = async () => {
	try {
		const result = await db.query(`
			SELECT
				(SELECT COUNT(*)::integer FROM users WHERE deleted_at IS NULL) AS total_users,
				(SELECT COUNT(*)::integer FROM users WHERE deleted_at IS NULL AND is_active = false) AS blocked_users,
				(SELECT COUNT(*)::integer FROM questions WHERE deleted_at IS NULL) AS total_questions,
				(SELECT COUNT(*)::integer FROM answers WHERE deleted_at IS NULL) AS total_answers,
				(SELECT COUNT(*)::integer FROM comments WHERE deleted_at IS NULL) AS total_comments,
				(SELECT COUNT(*)::integer FROM users WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '7 days') AS new_users_this_week
		`);
		return result.rows[0];
	} catch (error) {
		logger.error("Error getting admin stats:", error);
		throw error;
	}
};

export const getAllUsersDB = async ({ page = 1, limit = 20, search = "" }) => {
	try {
		const offset = (page - 1) * limit;
		const searchParam = search ? `%${search}%` : null;

		const countResult = await db.query(
			`SELECT COUNT(*)::integer AS total
			 FROM users
			 WHERE deleted_at IS NULL
			 AND ($1::text IS NULL OR name ILIKE $1 OR email ILIKE $1)`,
			[searchParam],
		);

		const result = await db.query(
			`SELECT
				u.id, u.name, u.email, u.avatar_url,
				COALESCE(u.is_active, true) AS is_active,
				u.is_email_verified, u.is_cyf_trainee,
				COALESCE(u.reputation, 0) AS reputation,
				u.created_at, u.last_login_at,
				(SELECT COUNT(*)::integer FROM questions q WHERE q.user_id = u.id AND q.deleted_at IS NULL) AS questions_count,
				(SELECT COUNT(*)::integer FROM answers a WHERE a.user_id = u.id AND a.deleted_at IS NULL) AS answers_count
			 FROM users u
			 WHERE u.deleted_at IS NULL
			 AND ($1::text IS NULL OR u.name ILIKE $1 OR u.email ILIKE $1)
			 ORDER BY u.created_at DESC
			 LIMIT $2 OFFSET $3`,
			[searchParam, limit, offset],
		);

		const total = countResult.rows[0].total;
		return {
			users: result.rows,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	} catch (error) {
		logger.error("Error getting all users:", error);
		throw error;
	}
};

export const setUserActiveDB = async (userId, isActive) => {
	try {
		const result = await db.query(
			`UPDATE users
			 SET is_active = $1, updated_at = NOW()
			 WHERE id = $2 AND deleted_at IS NULL
			 RETURNING id, name, email, is_active`,
			[isActive, userId],
		);
		return result.rows[0] || null;
	} catch (error) {
		logger.error("Error updating user active status:", error);
		throw error;
	}
};

export const deleteUserDB = async (userId) => {
	try {
		const result = await db.query(
			`UPDATE users
			 SET deleted_at = NOW(), updated_at = NOW()
			 WHERE id = $1 AND deleted_at IS NULL
			 RETURNING id`,
			[userId],
		);
		return result.rows[0] || null;
	} catch (error) {
		logger.error("Error deleting user:", error);
		throw error;
	}
};

export const getRecentContentDB = async ({ type, page = 1, limit = 20 }) => {
	const offset = (page - 1) * limit;

	try {
		let countResult, result;

		if (type === "question") {
			countResult = await db.query(
				`SELECT COUNT(*)::integer AS total FROM questions WHERE deleted_at IS NULL`,
			);
			result = await db.query(
				`SELECT q.id, q.title, q.slug, LEFT(q.content, 200) AS body, q.created_at,
				        u.id AS user_id, u.name AS author_name
				 FROM questions q
				 LEFT JOIN users u ON u.id = q.user_id
				 WHERE q.deleted_at IS NULL
				 ORDER BY q.created_at DESC
				 LIMIT $1 OFFSET $2`,
				[limit, offset],
			);
		} else if (type === "answer") {
			countResult = await db.query(
				`SELECT COUNT(*)::integer AS total FROM answers WHERE deleted_at IS NULL`,
			);
			result = await db.query(
				`SELECT a.id, LEFT(a.content, 200) AS body, a.created_at,
				        u.id AS user_id, u.name AS author_name,
				        q.id AS question_id, q.title AS question_title, q.slug AS question_slug,
				        (q.id IS NULL OR q.deleted_at IS NOT NULL) AS question_unavailable
				 FROM answers a
				 LEFT JOIN users u ON u.id = a.user_id
				 LEFT JOIN questions q ON q.id = a.question_id
				 WHERE a.deleted_at IS NULL
				 ORDER BY a.created_at DESC
				 LIMIT $1 OFFSET $2`,
				[limit, offset],
			);
		} else if (type === "comment") {
			countResult = await db.query(
				`SELECT COUNT(*)::integer AS total FROM comments WHERE deleted_at IS NULL`,
			);
			result = await db.query(
				`SELECT c.id, LEFT(c.content, 200) AS body, c.created_at,
				        u.id AS user_id, u.name AS author_name,
				        c.question_id, c.answer_id,
				        COALESCE(c.question_id, a.question_id) AS related_question_id,
				        rq.slug AS related_question_slug,
				        (rq.id IS NULL OR rq.deleted_at IS NOT NULL) AS question_unavailable
				 FROM comments c
				 LEFT JOIN users u ON u.id = c.user_id
				 LEFT JOIN answers a ON a.id = c.answer_id
				 LEFT JOIN questions rq ON rq.id = COALESCE(c.question_id, a.question_id)
				 WHERE c.deleted_at IS NULL
				 ORDER BY c.created_at DESC
				 LIMIT $1 OFFSET $2`,
				[limit, offset],
			);
		} else {
			throw new Error("Invalid content type");
		}

		const total = countResult.rows[0].total;
		return {
			items: result.rows,
			total,
			page,
			totalPages: Math.ceil(total / limit),
		};
	} catch (error) {
		logger.error(`Error getting recent ${type}s:`, error);
		throw error;
	}
};

export const deleteContentDB = async (type, id) => {
	const tableMap = {
		question: "questions",
		answer: "answers",
		comment: "comments",
	};
	const table = tableMap[type];
	if (!table) throw new Error("Invalid content type");

	// Answers need special handling: if the deleted answer was accepted,
	// reset the question's solved status.
	if (type === "answer") {
		const client = await getClient();
		try {
			await client.query("BEGIN");

			const result = await client.query(
				`UPDATE answers
				 SET deleted_at = NOW()
				 WHERE id = $1 AND deleted_at IS NULL
				 RETURNING id, is_accepted, question_id`,
				[id],
			);

			if (result.rows.length === 0) {
				await client.query("ROLLBACK");
				return null;
			}

			const { is_accepted, question_id } = result.rows[0];

			if (is_accepted) {
				await client.query(
					`UPDATE questions
					 SET is_solved = false, status = 'open', updated_at = NOW()
					 WHERE id = $1`,
					[question_id],
				);
			}

			await client.query("COMMIT");
			return result.rows[0];
		} catch (error) {
			await client.query("ROLLBACK");
			logger.error("Error deleting answer:", error);
			throw error;
		} finally {
			client.release();
		}
	}

	try {
		const result = await db.query(
			`UPDATE ${table} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
			[id],
		);
		return result.rows[0] || null;
	} catch (error) {
		logger.error(`Error deleting ${type}:`, error);
		throw error;
	}
};
