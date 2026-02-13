import { queryAsync } from '../common/db.js';

export const createUserRepository = (db) => ({
    findUserById(userId) {
        return queryAsync(db, 'SELECT id, name, email, password, total_xp, profile_pic FROM users WHERE id = ? LIMIT 1', [userId])
            .then((rows) => rows[0] || null);
    },

    updateProfilePic(userId, profilePicUrl) {
        return queryAsync(db, 'UPDATE users SET profile_pic = ? WHERE id = ?', [profilePicUrl, userId]);
    },

    updatePassword(userId, newPassword) {
        return queryAsync(db, 'UPDATE users SET password = ? WHERE id = ?', [newPassword, userId]);
    },
});
