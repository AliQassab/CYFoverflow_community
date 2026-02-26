import db, { getClient } from "../db.js";
import { generateSlug, generateUniqueSlug } from "../utils/slug.js";

export const createQuestionDB = async (
	title,
	content,
	templateType,
	userId,
	browser = null,
	os = null,
	documentationLink = null,
	labelId,
) => {
	if (!content) {
		throw new Error("Content cannot be null or undefined in repository");
	}

	const baseSlug = generateSlug(title);
	const slug = await generateUniqueSlug(baseSlug, async (slugToCheck) => {
		const result = await db.query("SELECT id FROM questions WHERE slug = $1", [
			slugToCheck,
		]);
		return result.rows.length > 0;
	});

	const result = await db.query(
		`INSERT INTO questions (title, content, template_type, user_id, browser, os, documentation_link, slug) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
		[
			title,
			content,
			templateType,
			userId,
			browser,
			os,
			documentationLink,
			slug,
		],
	);

	const question = result.rows[0];
	if (labelId && labelId.length > 0) {
		for (const label of labelId) {
			try {
				await db.query(
					"INSERT INTO question_labels (question_id, label_id) VALUES($1, $2)",
					[question.id, label],
				);
			} catch (error) {
				if (error.code === "23503") {
					throw new Error(`Label with ID ${label} does not exist`);
				}
				throw error;
			}
		}
	}

	const labelResult = await db.query(
		"SELECT l.id, l.name FROM labels l JOIN question_labels ql ON l.id= ql.label_id WHERE ql.question_id = $1",
		[question.id],
	);
	question.labels = labelResult.rows;
	return question;
};

export const getAllQuestionsDB = async (limit = null, page = null) => {
	let query = `SELECT q.*, u.name as author_name,
         COALESCE(
             json_agg(
                 json_build_object('id', l.id, 'name', l.name)
             ) FILTER (WHERE l.id IS NOT NULL),
             '[]'::json
         ) as labels
         FROM questions q
         JOIN users u ON q.user_id = u.id
         LEFT JOIN question_labels ql ON q.id = ql.question_id
         LEFT JOIN labels l ON ql.label_id = l.id
         WHERE q.deleted_at IS NULL
         GROUP BY q.id, u.name
         ORDER BY q.created_at DESC`;

	const params = [];

	if (limit && page) {
		const offset = (page - 1) * limit;
		query += ` LIMIT $1 OFFSET $2`;
		params.push(limit, offset);
	} else if (limit) {
		query += ` LIMIT $1`;
		params.push(limit);
	}

	const result = await db.query(query, params);
	const questions = result.rows.map((row) => ({
		...row,
		labels: row.labels || [],
	}));

	return questions;
};

export const getTotalQuestionsCountDB = async () => {
	const result = await db.query(
		`SELECT COUNT(*) as total FROM questions WHERE deleted_at IS NULL`,
	);
	return parseInt(result.rows[0].total, 10);
};
export const getQuestionsByUserIdDB = async (
	userId,
	limit = null,
	page = null,
) => {
	let query = `SELECT q.*, u.name as author_name,
         COALESCE(
             json_agg(
                 json_build_object('id', l.id, 'name', l.name)
             ) FILTER (WHERE l.id IS NOT NULL),
             '[]'::json
         ) as labels
         FROM questions q
         JOIN users u ON q.user_id = u.id
         LEFT JOIN question_labels ql ON q.id = ql.question_id
         LEFT JOIN labels l ON ql.label_id = l.id
         WHERE q.user_id = $1 AND q.deleted_at IS NULL
         GROUP BY q.id, u.name
         ORDER BY q.created_at DESC`;

	const params = [userId];

	if (page && limit) {
		const offset = (page - 1) * limit;
		query += ` LIMIT $2 OFFSET $3`;
		params.push(limit, offset);
	} else if (limit) {
		query += ` LIMIT $2`;
		params.push(limit);
	}

	const result = await db.query(query, params);
	const questions = result.rows.map((row) => ({
		...row,
		labels: row.labels || [],
	}));

	return questions;
};

export const getQuestionsByUserIdCountDB = async (userId) => {
	const result = await db.query(
		`SELECT COUNT(*)::integer as count
         FROM questions q
         WHERE q.user_id = $1 AND q.deleted_at IS NULL`,
		[userId],
	);
	return result.rows[0].count;
};
export const getQuestionByIdDB = async (idOrSlug) => {
	const isPureNumeric = /^\d+$/.test(idOrSlug);

	let result;
	if (isPureNumeric) {
		result = await db.query(
			`SELECT q.*, u.name as author_name, u.email as author_email,
			 COALESCE(
				 json_agg(
					 json_build_object('id', l.id, 'name', l.name)
				 ) FILTER (WHERE l.id IS NOT NULL),
				 '[]'::json
			 ) as labels
			 FROM questions q
			 JOIN users u ON q.user_id = u.id
			 LEFT JOIN question_labels ql ON q.id = ql.question_id
			 LEFT JOIN labels l ON ql.label_id = l.id
			 WHERE q.id = $1 AND q.deleted_at IS NULL
			 GROUP BY q.id, u.name, u.email`,
			[idOrSlug],
		);
	} else {
		result = await db.query(
			`SELECT q.*, u.name as author_name, u.email as author_email,
			 COALESCE(
				 json_agg(
					 json_build_object('id', l.id, 'name', l.name)
				 ) FILTER (WHERE l.id IS NOT NULL),
				 '[]'::json
			 ) as labels
			 FROM questions q
			 JOIN users u ON q.user_id = u.id
			 LEFT JOIN question_labels ql ON q.id = ql.question_id
			 LEFT JOIN labels l ON ql.label_id = l.id
			 WHERE q.slug = $1 AND q.deleted_at IS NULL
			 GROUP BY q.id, u.name, u.email`,
			[idOrSlug],
		);
	}

	const question = result.rows[0];
	if (!question) {
		return null;
	}

	return {
		...question,
		labels: question.labels || [],
	};
};

/**
 * Soft delete a question (sets deleted_at timestamp)
 * Also soft deletes all associated answers (cascading soft delete)
 * @param {number} id - Question ID
 * @returns {Promise<boolean>} True if deleted
 */
export const deleteQuestionDB = async (id) => {
	// Start a transaction to ensure atomicity
	const client = await getClient();
	try {
		await client.query("BEGIN");

		// Soft delete all answers for this question
		await client.query(
			`UPDATE answers 
			 SET deleted_at = NOW() 
			 WHERE question_id = $1 AND deleted_at IS NULL`,
			[id],
		);

		// Soft delete the question
		const result = await client.query(
			`UPDATE questions 
			 SET deleted_at = NOW() 
			 WHERE id = $1 AND deleted_at IS NULL
			 RETURNING id`,
			[id],
		);

		await client.query("COMMIT");
		return result.rows.length > 0;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
};

export const updateQuestionDB = async (
	id,
	title,
	content,
	templateType,
	browser = null,
	os = null,
	documentationLink = null,
	labelId,
) => {
	const existingQuestion = await db.query(
		"SELECT title FROM questions WHERE id = $1",
		[id],
	);
	const titleChanged = existingQuestion.rows[0]?.title !== title;

	let slug = null;
	if (titleChanged) {
		const baseSlug = generateSlug(title);
		slug = await generateUniqueSlug(baseSlug, async (slugToCheck) => {
			const result = await db.query(
				"SELECT id FROM questions WHERE slug = $1 AND id != $2",
				[slugToCheck, id],
			);
			return result.rows.length > 0;
		});
	}

	const updateFields = titleChanged
		? `title = $1, content = $2, template_type = $3, browser = $4, os = $5, documentation_link = $6, slug = $7, updated_at = NOW()`
		: `title = $1, content = $2, template_type = $3, browser = $4, os = $5, documentation_link = $6, updated_at = NOW()`;

	const params = titleChanged
		? [title, content, templateType, browser, os, documentationLink, slug, id]
		: [title, content, templateType, browser, os, documentationLink, id];

	const result = await db.query(
		`UPDATE questions SET ${updateFields} WHERE id = $${params.length} RETURNING *`,
		params,
	);
	const question = result.rows[0];
	await db.query("DELETE FROM question_labels WHERE question_id = $1", [id]);

	for (const label of labelId) {
		await db.query(
			"INSERT INTO question_labels (question_id, label_id) VALUES ($1, $2)",
			[id, label],
		);
	}

	const labelResult = await db.query(
		`SELECT l.id, l.name
         FROM labels l
         JOIN question_labels ql ON l.id = ql.label_id
         WHERE ql.question_id = $1`,
		[question.id],
	);

	question.labels = labelResult.rows;

	return question;
};

export const getAllLabelsDB = async () => {
	const result = await db.query(`SELECT id, name FROM labels ORDER BY name`);
	return result.rows;
};

export const searchQuestionsByLabelsDB = async (labelId = []) => {
	const result = await db.query(
		`WITH filtered_question_ids AS (
            SELECT DISTINCT q.id
            FROM questions q
            JOIN question_labels ql ON q.id = ql.question_id
            WHERE ql.label_id = ANY($1::int[]) AND q.deleted_at IS NULL
        )
        SELECT q.*, u.name as author_name,
         COALESCE(
             json_agg(
                 json_build_object('id', l.id, 'name', l.name)
             ) FILTER (WHERE l.id IS NOT NULL),
             '[]'::json
         ) as labels
         FROM filtered_question_ids fqi
         JOIN questions q ON fqi.id = q.id
         JOIN users u ON q.user_id = u.id
         LEFT JOIN question_labels ql ON q.id = ql.question_id
         LEFT JOIN labels l ON ql.label_id = l.id
         GROUP BY q.id, u.name, q.title, q.content, q.slug, q.user_id, q.status, q.is_solved, 
                  q.template_type, q.browser, q.os, q.documentation_link, q.answer_count, 
                  q.view_count, q.created_at, q.updated_at, q.last_activity_at, q.deleted_at, 
                  q.search_vector
         ORDER BY q.created_at DESC`,
		[labelId],
	);

	const questions = result.rows.map((row) => ({
		...row,
		labels: row.labels || [],
	}));

	return questions;
};

export const searchQuestionsByTextDB = async (
	searchTerm,
	limit = null,
	page = null,
	options = {},
) => {
	const {
		solved = null,
		sortBy = "relevance",
		dateRange = null,
		labelIds = [],
	} = options;

	const searchPattern = `%${searchTerm}%`;
	let paramIndex = 1;
	const params = [searchPattern];

	// Determine if we need answer_count for sorting
	const needsAnswerCount = sortBy === "votes";

	let query = `SELECT q.*, u.name as author_name,
         COALESCE(
             json_agg(
                 json_build_object('id', l2.id, 'name', l2.name)
             ) FILTER (WHERE l2.id IS NOT NULL),
             '[]'::json
         ) as labels`;

	if (needsAnswerCount) {
		query += `,
         (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id AND a.deleted_at IS NULL) as answer_count`;
	}

	query += ` FROM questions q
         JOIN users u ON q.user_id = u.id
         LEFT JOIN question_labels ql ON q.id = ql.question_id
         LEFT JOIN labels l ON ql.label_id = l.id
         LEFT JOIN question_labels ql2 ON q.id = ql2.question_id
         LEFT JOIN labels l2 ON ql2.label_id = l2.id
         WHERE (q.title ILIKE $${paramIndex} 
            OR q.content ILIKE $${paramIndex}
            OR l.name ILIKE $${paramIndex})
            AND q.deleted_at IS NULL`;

	// Add solved status filter
	if (solved !== null) {
		paramIndex++;
		query += ` AND q.is_solved = $${paramIndex}`;
		params.push(solved);
	}

	// Add date range filter (no parameter needed, using SQL date functions)
	if (dateRange) {
		let dateFilter = "";
		switch (dateRange) {
			case "today":
				dateFilter = `q.created_at >= CURRENT_DATE`;
				break;
			case "week":
				dateFilter = `q.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
				break;
			case "month":
				dateFilter = `q.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
				break;
			case "year":
				dateFilter = `q.created_at >= CURRENT_DATE - INTERVAL '365 days'`;
				break;
			default:
				break;
		}
		if (dateFilter) {
			query += ` AND ${dateFilter}`;
		}
	}

	// Add label filter
	if (labelIds && labelIds.length > 0) {
		paramIndex++;
		query += ` AND q.id IN (
			SELECT DISTINCT ql3.question_id 
			FROM question_labels ql3 
			WHERE ql3.label_id = ANY($${paramIndex}::int[])
		)`;
		params.push(labelIds);
	}

	// PostgreSQL requires all selected columns to be in GROUP BY when using aggregates
	// List all columns from q.* explicitly to avoid JSON equality operator errors
	query += ` GROUP BY q.id, u.name, q.title, q.content, q.slug, q.user_id, q.status, q.is_solved, 
                  q.template_type, q.browser, q.os, q.documentation_link, q.answer_count, 
                  q.view_count, q.created_at, q.updated_at, q.last_activity_at, q.deleted_at`;

	// Add sorting
	switch (sortBy) {
		case "newest":
			query += ` ORDER BY q.created_at DESC`;
			break;
		case "oldest":
			query += ` ORDER BY q.created_at ASC`;
			break;
		case "votes":
			query += ` ORDER BY (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id AND a.deleted_at IS NULL) DESC, q.created_at DESC`;
			break;
		case "relevance":
		default:
			// Relevance: prioritize title matches, then content matches
			query += ` ORDER BY 
				CASE WHEN q.title ILIKE $1 THEN 1 ELSE 2 END,
				q.created_at DESC`;
			break;
	}

	if (limit && page) {
		paramIndex++;
		const offset = (page - 1) * limit;
		query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
		params.push(limit, offset);
	} else if (limit) {
		paramIndex++;
		query += ` LIMIT $${paramIndex}`;
		params.push(limit);
	}

	const result = await db.query(query, params);
	const questions = result.rows.map((row) => ({
		...row,
		labels: row.labels || [],
	}));

	return questions;
};

export const getSearchQuestionsCountDB = async (searchTerm, options = {}) => {
	const { solved = null, dateRange = null, labelIds = [] } = options;

	const searchPattern = `%${searchTerm}%`;
	let paramIndex = 1;
	const params = [searchPattern];

	let query = `SELECT COUNT(DISTINCT q.id) as total
         FROM questions q
         LEFT JOIN question_labels ql ON q.id = ql.question_id
         LEFT JOIN labels l ON ql.label_id = l.id
         WHERE (q.title ILIKE $${paramIndex} 
            OR q.content ILIKE $${paramIndex}
            OR l.name ILIKE $${paramIndex})
            AND q.deleted_at IS NULL`;

	// Add solved status filter
	if (solved !== null) {
		paramIndex++;
		query += ` AND q.is_solved = $${paramIndex}`;
		params.push(solved);
	}

	// Add date range filter (no parameter needed, using SQL date functions)
	if (dateRange) {
		let dateFilter = "";
		switch (dateRange) {
			case "today":
				dateFilter = `q.created_at >= CURRENT_DATE`;
				break;
			case "week":
				dateFilter = `q.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
				break;
			case "month":
				dateFilter = `q.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
				break;
			case "year":
				dateFilter = `q.created_at >= CURRENT_DATE - INTERVAL '365 days'`;
				break;
			default:
				break;
		}
		if (dateFilter) {
			query += ` AND ${dateFilter}`;
		}
	}

	// Add label filter
	if (labelIds && labelIds.length > 0) {
		paramIndex++;
		query += ` AND q.id IN (
			SELECT DISTINCT ql2.question_id 
			FROM question_labels ql2 
			WHERE ql2.label_id = ANY($${paramIndex}::int[])
		)`;
		params.push(labelIds);
	}

	const result = await db.query(query, params);
	return parseInt(result.rows[0].total, 10);
};

export const updateSolvedStatusDB = async (id, isSolved) => {
	const result = await db.query(
		`UPDATE questions
         SET is_solved = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
		[isSolved, id],
	);

	return result.rows[0];
};
