import { queryAsync } from '../common/db.js';

export const createSubjectsRepository = (db) => ({
    listAdminSubjects() {
        const sql = `
            SELECT id, name, description, image_url, activo
            FROM subjects
            ORDER BY name
        `;
        return queryAsync(db, sql);
    },

    createSubject({ name, description, imageUrl, activo }) {
        const sql = `
            INSERT INTO subjects (name, description, image_url, activo)
            VALUES (?, ?, ?, ?)
        `;
        return queryAsync(db, sql, [name, description, imageUrl, activo]);
    },

    updateSubject({ subjectId, name, description, imageUrl, activo }) {
        const sql = `
            UPDATE subjects
            SET name = ?, description = ?, image_url = COALESCE(?, image_url), activo = ?
            WHERE id = ?
        `;
        return queryAsync(db, sql, [name, description, imageUrl, activo, subjectId]);
    },

    findSubjectById(subjectId) {
        return queryAsync(db, 'SELECT id, image_url FROM subjects WHERE id = ? LIMIT 1', [subjectId])
            .then((rows) => rows[0] || null);
    },

    updateSubjectImage(subjectId, imageUrl) {
        return queryAsync(db, 'UPDATE subjects SET image_url = ? WHERE id = ?', [imageUrl, subjectId]);
    },

    deactivateSubject(subjectId) {
        return queryAsync(db, 'UPDATE subjects SET activo = 0 WHERE id = ? AND activo <> 0', [subjectId]);
    },

    listActiveSubjectsWithProgress(userId) {
        const sql = `
            SELECT s.*,
            (SELECT MAX(score) FROM quiz_results WHERE subject_id = s.id AND user_id = ?) as best_score,
            (SELECT COUNT(*) FROM quiz_results WHERE subject_id = s.id AND user_id = ?) as attempts
            FROM subjects s
            WHERE s.activo = 1
        `;
        return queryAsync(db, sql, [userId, userId]);
    },
});
