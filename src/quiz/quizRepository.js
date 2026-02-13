import { queryAsync } from '../common/db.js';

export const createQuizRepository = (db) => ({
    getDailyAttemptsForSubject(userId, subjectId) {
        const sql = `
            SELECT COUNT(*) AS attemptsToday
            FROM quiz_results
            WHERE user_id = ?
              AND subject_id = ?
              AND DATE(completed_at) = CURDATE()
        `;
        return queryAsync(db, sql, [userId, subjectId]).then((rows) => Number(rows?.[0]?.attemptsToday || 0));
    },

    insertQuizResult(userId, subjectId, score, xpEarned) {
        const sql = 'INSERT INTO quiz_results (user_id, subject_id, score, xp_earned) VALUES (?, ?, ?, ?)';
        return queryAsync(db, sql, [userId, subjectId, score, xpEarned]);
    },

    updateUserXp(userId, xpEarned) {
        return queryAsync(db, 'UPDATE users SET total_xp = total_xp + ? WHERE id = ?', [xpEarned, userId]);
    },

    insertQuestion({ subjectId, text, options, correctAnswerIndex, explanation }) {
        const sql = `
            INSERT INTO questions (
                subject_id,
                question_text,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_option_index,
                explanation
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        return queryAsync(db, sql, [
            subjectId,
            text,
            options[0],
            options[1],
            options[2],
            options[3],
            correctAnswerIndex,
            explanation,
        ]);
    },
});
