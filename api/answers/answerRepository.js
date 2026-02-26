import db, { getClient } from "../db.js";
import logger from "../utils/logger.js";

export const createAnswerDB = async ({ content, user_id, question_id }) => {
	const result = await db.query(
		`INSERT INTO answers(content, user_id, question_id)
        VALUES($1, $2, $3)
        RETURNING *`,
		[content, user_id, question_id],
	);
	return result.rows[0];
};

export const getAnswerByQuestionIdDB = async (questionId, userId = null) => {
	// Get answers with vote counts and is_accepted status
	const result = await db.query(
		`SELECT 
			a.id, 
			a.content, 
			a.user_id, 
			a.question_id, 
			a.created_at, 
			a.updated_at,
			a.is_accepted,
			u.name AS author_name,
			COALESCE(SUM(CASE WHEN v.vote_type = 'upvote' THEN 1 ELSE 0 END), 0)::int AS upvote_count,
			COALESCE(SUM(CASE WHEN v.vote_type = 'downvote' THEN 1 ELSE 0 END), 0)::int AS downvote_count
        FROM answers a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN votes v ON a.id = v.answer_id
        WHERE a.question_id = $1 AND a.deleted_at IS NULL
        GROUP BY a.id, a.content, a.user_id, a.question_id, a.created_at, a.updated_at, a.is_accepted, u.name
        ORDER BY a.is_accepted DESC, a.created_at ASC`,
		[questionId],
	);

	// If user is logged in, get their votes for these answers
	if (userId && result.rows.length > 0) {
		const answerIds = result.rows.map((row) => row.id);
		const userVotesResult = await db.query(
			`SELECT answer_id, vote_type FROM votes 
			 WHERE answer_id = ANY($1) AND user_id = $2`,
			[answerIds, userId],
		);

		const userVotes = {};
		userVotesResult.rows.forEach((row) => {
			userVotes[row.answer_id] = row.vote_type;
		});

		// Add user_vote to each answer
		result.rows.forEach((answer) => {
			answer.user_vote = userVotes[answer.id] || null;
		});
	}

	return result.rows;
};

export const updateAnswerDB = async (id, content) => {
	const result = await db.query(
		`UPDATE answers
        SET content = $1,
        updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
		[content, id],
	);
	return result.rows[0];
};

/**
 * Soft delete an answer (sets deleted_at timestamp)
 * @param {number} id - Answer ID
 * @returns {Promise<boolean>} True if deleted
 */
export const deleteAnswerDB = async (id) => {
	const result = await db.query(
		`UPDATE answers 
		 SET deleted_at = NOW() 
		 WHERE id = $1 AND deleted_at IS NULL
		 RETURNING id`,
		[id],
	);

	return result.rows.length > 0;
};

export const getAnswerByIdDB = async (id) => {
	const result = await db.query(
		`SELECT id, content, user_id, question_id, created_at, updated_at, is_accepted FROM answers WHERE id = $1 AND deleted_at IS NULL`,
		[id],
	);
	return result.rows[0];
};

/**
 * Get the currently accepted answer for a question (if any)
 * @param {number} questionId - Question ID
 * @returns {Promise<Object|null>} Accepted answer or null
 */
export const getAcceptedAnswerByQuestionIdDB = async (questionId) => {
	const result = await db.query(
		`SELECT id, user_id FROM answers 
		 WHERE question_id = $1 AND is_accepted = true AND deleted_at IS NULL
		 LIMIT 1`,
		[questionId],
	);
	return result.rows[0] || null;
};

export const acceptAnswerDB = async (answerId, questionId) => {
	// Start a transaction to:
	// 1. Unaccept any previously accepted answer for this question
	// 2. Accept the new answer
	// 3. Mark question as solved

	const client = await getClient();
	try {
		await client.query("BEGIN");

		// Unaccept all other answers for this question
		await client.query(
			`UPDATE answers 
			 SET is_accepted = false 
			 WHERE question_id = $1 AND id != $2 AND deleted_at IS NULL`,
			[questionId, answerId],
		);

		// Accept this answer
		const result = await client.query(
			`UPDATE answers 
			 SET is_accepted = true, updated_at = NOW()
			 WHERE id = $1 AND deleted_at IS NULL
			 RETURNING *`,
			[answerId],
		);

		// Mark question as solved
		await client.query(
			`UPDATE questions 
			 SET is_solved = true, status = 'solved', updated_at = NOW()
			 WHERE id = $1`,
			[questionId],
		);

		await client.query("COMMIT");
		return result.rows[0];
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
};

export const getAnswersByUserIdDB = async (userId) => {
	const result = await db.query(
		`SELECT
            a.id,
            a.content,
            a.user_id,
            a.question_id,
            a.created_at,
            a.updated_at,
            u.name AS author_name,
            u.email AS author_email
         FROM answers a
         JOIN users u ON a.user_id = u.id
         WHERE a.user_id = $1 AND a.deleted_at IS NULL
         ORDER BY a.created_at DESC`,
		[userId],
	);
	return result.rows;
};

export const getAnswersByUserIdWithQuestionsDB = async (
	userId,
	limit = null,
	page = null,
) => {
	// First get answers for the user (excluding deleted ones) with pagination
	let query = `SELECT
            a.id,
            a.content,
            a.user_id,
            a.question_id,
            a.created_at,
            a.updated_at,
            u.name AS author_name,
            u.email AS author_email
         FROM answers a
         JOIN users u ON a.user_id = u.id
         WHERE a.user_id = $1 AND a.deleted_at IS NULL
         ORDER BY a.created_at DESC`;

	const params = [userId];

	if (page && limit) {
		const offset = (page - 1) * limit;
		query += ` LIMIT $2 OFFSET $3`;
		params.push(limit, offset);
	} else if (limit) {
		query += ` LIMIT $2`;
		params.push(limit);
	}

	const answersResult = await db.query(query, params);
	const answers = answersResult.rows;

	// For each answer, get the question details
	for (const answer of answers) {
		try {
			// Get basic question info
			const questionResult = await db.query(
				`SELECT
                    q.id,
                    q.title,
                    q.slug,
                    q.created_at,
                    q.is_solved,
                    q.body,
                    q.content,
                    qu.name AS author_name,
                    qu.email AS author_email
                 FROM questions q
                 JOIN users qu ON q.user_id = qu.id
                 WHERE q.id = $1 AND q.deleted_at IS NULL`,
				[answer.question_id],
			);

			if (questionResult.rows.length > 0) {
				answer.question = questionResult.rows[0];

				// Get labels for the question
				const labelsResult = await db.query(
					`SELECT l.id, l.name
                     FROM labels l
                     JOIN question_labels ql ON l.id = ql.label_id
                     WHERE ql.question_id = $1`,
					[answer.question_id],
				);

				answer.question.labels = labelsResult.rows;
			}
		} catch (error) {
			logger.error(`Error fetching question ${answer.question_id}:`, error);
			answer.question = null;
		}
	}

	return answers;
};

export const getAnswersByUserIdCountDB = async (userId) => {
	const result = await db.query(
		`SELECT COUNT(*)::integer as count
         FROM answers a
         WHERE a.user_id = $1 AND a.deleted_at IS NULL`,
		[userId],
	);
	return result.rows[0].count;
};
