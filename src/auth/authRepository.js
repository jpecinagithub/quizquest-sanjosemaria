const queryAsync = (db, sql, params = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) return reject(err);
            return resolve(results);
        });
    });

export const createAuthRepository = (db) => ({
    async findUserAuthByEmail(email) {
        const sql = 'SELECT id, name, email, password, profile_pic, total_xp FROM users WHERE email = ? LIMIT 1';
        const rows = await queryAsync(db, sql, [email]);
        return rows[0] || null;
    },

    async findUserById(userId) {
        const sql = 'SELECT id, name, email, password, profile_pic, total_xp FROM users WHERE id = ? LIMIT 1';
        const rows = await queryAsync(db, sql, [userId]);
        return rows[0] || null;
    },

    async createUser({ name, email, password }) {
        const sql = 'INSERT INTO users (name, email, password, total_xp) VALUES (?, ?, ?, 0)';
        const result = await queryAsync(db, sql, [name, email, password]);
        return Number(result.insertId);
    },

    async createPasswordResetToken({ userId, token, ttlMinutes }) {
        const sql = `
            INSERT INTO password_resets (user_id, token, expires_at, used_at)
            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NULL)
        `;
        await queryAsync(db, sql, [userId, token, ttlMinutes]);
    },

    async findValidPasswordResetToken({ userId, token }) {
        const sql = `
            SELECT id
            FROM password_resets
            WHERE user_id = ?
              AND token = ?
              AND used_at IS NULL
              AND expires_at > NOW()
            ORDER BY id DESC
            LIMIT 1
        `;
        const rows = await queryAsync(db, sql, [userId, token]);
        return rows[0] || null;
    },

    async markPasswordResetTokenUsed(resetId) {
        await queryAsync(db, 'UPDATE password_resets SET used_at = NOW() WHERE id = ?', [resetId]);
    },

    async updateUserPassword({ userId, password }) {
        await queryAsync(db, 'UPDATE users SET password = ? WHERE id = ?', [password, userId]);
    },
});
