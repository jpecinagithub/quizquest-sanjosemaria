export const queryAsync = (db, sql, params = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) return reject(err);
            return resolve(results);
        });
    });

export const beginTransactionAsync = (db) =>
    new Promise((resolve, reject) => {
        db.beginTransaction((err) => {
            if (err) return reject(err);
            return resolve();
        });
    });

export const commitAsync = (db) =>
    new Promise((resolve, reject) => {
        db.commit((err) => {
            if (err) return reject(err);
            return resolve();
        });
    });

export const rollbackAsync = (db) =>
    new Promise((resolve) => {
        db.rollback(() => resolve());
    });
