import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import dotenv from 'dotenv';
import { createHash, randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/images', express.static(path.join(process.cwd(), 'public', 'images')));
const sessions = new Map();
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 8);
const DAILY_QUIZ_LIMIT = 2;
const ADMIN_USER_RULE = {
    id: 7,
    name: 'Jon',
    email: 'jpecina@gmail.com',
    passwordHash: 'sha256:8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
};

const isAdminUser = (userRow) => {
    if (!userRow) return false;
    const idMatches = Number(userRow.id) === ADMIN_USER_RULE.id;
    const nameMatches = String(userRow.name || '') === ADMIN_USER_RULE.name;
    const emailMatches = String(userRow.email || '').toLowerCase() === ADMIN_USER_RULE.email.toLowerCase();
    const passwordMatches = String(userRow.password || '') === ADMIN_USER_RULE.passwordHash;
    return idMatches && nameMatches && emailMatches && passwordMatches;
};

const sanitizeUser = (userRow) => ({
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    profile_pic: userRow.profile_pic,
    total_xp: userRow.total_xp,
    is_admin: isAdminUser(userRow),
});

const extractBearerToken = (authorizationHeader = '') => {
    if (!authorizationHeader.startsWith('Bearer ')) return null;
    return authorizationHeader.slice(7).trim() || null;
};

const hashPassword = (rawPassword) => `sha256:${createHash('sha256').update(rawPassword).digest('hex')}`;
const isPasswordMatch = (storedPassword, rawPassword) => {
    const legacyMatch = storedPassword === 'hashed_password_here' && rawPassword === '1234';
    return storedPassword === hashPassword(rawPassword) || storedPassword === rawPassword || legacyMatch;
};

const createSession = (userId) => {
    const token = randomUUID();
    sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
    return token;
};

const getSession = (token) => {
    const session = sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
        sessions.delete(token);
        return null;
    }
    return session;
};

const authRequired = (req, res, next) => {
    const token = extractBearerToken(req.headers.authorization);
    const session = token ? getSession(token) : null;
    if (!token || !session) {
        return res.status(401).json({ message: 'Sesion invalida o expirada' });
    }
    req.auth = {
        token,
        userId: session.userId,
    };
    next();
};

const adminRequired = (req, res, next) => {
    const userId = req?.auth?.userId;
    if (!userId) {
        return res.status(401).json({ message: 'Sesion invalida o expirada' });
    }

    const sql = 'SELECT id, name, email, password FROM users WHERE id = ? LIMIT 1';
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json(err);
        if (!results.length) return res.status(401).json({ message: 'Sesion invalida o expirada' });

        const user = results[0];
        if (!isAdminUser(user)) {
            return res.status(403).json({ message: 'No tienes permisos de administrador' });
        }

        next();
    });
};

const getDailyAttemptsForSubject = (userId, subjectId, callback) => {
    const sql = `
        SELECT COUNT(*) AS attemptsToday
        FROM quiz_results
        WHERE user_id = ?
          AND subject_id = ?
          AND DATE(completed_at) = CURDATE()
    `;
    db.query(sql, [userId, subjectId], (err, results) => {
        if (err) return callback(err);
        const attemptsToday = Number(results?.[0]?.attemptsToday || 0);
        return callback(null, attemptsToday);
    });
};

// Configuracion de la conexion a MySQL (Debes completar tus parametros en .env o aqui)
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'quizquest_db'
});

db.connect(err => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conectado exitosamente a la base de datos MySQL');
});

// Ensure optional column for subject images exists (compatible with MySQL versions without ADD COLUMN IF NOT EXISTS).
const ensureSubjectsImageUrlColumn = () => {
    const sqlCheck = `
        SELECT COUNT(*) AS columnExists
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'subjects'
          AND COLUMN_NAME = 'image_url'
    `;
    const schemaName = process.env.DB_NAME || 'quizquest_db';

    db.query(sqlCheck, [schemaName], (checkErr, results) => {
        if (checkErr) {
            console.error('No se pudo verificar la columna image_url en subjects:', checkErr.message);
            return;
        }

        const exists = Number(results?.[0]?.columnExists || 0) > 0;
        if (exists) return;

        db.query('ALTER TABLE subjects ADD COLUMN image_url VARCHAR(255) NULL', (alterErr) => {
            if (alterErr) {
                console.error('No se pudo crear la columna image_url en subjects:', alterErr.message);
            }
        });
    });
};

ensureSubjectsImageUrlColumn();

// --- ENDPOINTS ---

// 1. Login basico
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ message: 'Email y password son requeridos' });
    }

    const sql = 'SELECT id, name, email, password, profile_pic, total_xp FROM users WHERE email = ? LIMIT 1';
    db.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json(err);
        if (!results.length) return res.status(401).json({ message: 'Credenciales invalidas' });

        const user = results[0];
        const passwordMatches = isPasswordMatch(user.password, password);
        if (!passwordMatches) return res.status(401).json({ message: 'Credenciales invalidas' });

        const token = createSession(user.id);
        res.json({ token, user: sanitizeUser(user) });
    });
});

// 2. Registro
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Nombre, email y password son requeridos' });
    }

    if (String(password).length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const insertSql = 'INSERT INTO users (name, email, password, total_xp) VALUES (?, ?, ?, 0)';
    db.query(insertSql, [name, email, hashPassword(password)], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Ese email ya esta registrado' });
            }
            return res.status(500).json(err);
        }

        const userId = result.insertId;
        const selectSql = 'SELECT id, name, email, profile_pic, total_xp FROM users WHERE id = ? LIMIT 1';
        db.query(selectSql, [userId], (err2, results) => {
            if (err2) return res.status(500).json(err2);
            if (!results.length) return res.status(500).json({ message: 'No se pudo crear el usuario' });

            const token = createSession(userId);
            res.status(201).json({ token, user: sanitizeUser(results[0]) });
        });
    });
});

// 3. Recuperar password (simulado)
app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email requerido' });
    return res.json({
        success: true,
        message: 'Si el correo existe, recibiras instrucciones para recuperar tu cuenta.'
    });
});

// 4. Logout
app.post('/api/auth/logout', authRequired, (req, res) => {
    sessions.delete(req.auth.token);
    res.json({ success: true });
});

// 5. Usuario autenticado actual
app.get('/api/auth/me', authRequired, (req, res) => {
    const userId = req.auth.userId;
    const sql = 'SELECT id, name, email, password, profile_pic, total_xp FROM users WHERE id = ? LIMIT 1';
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json(err);
        if (!results.length) return res.status(401).json({ message: 'Sesion invalida' });
        res.json({ user: sanitizeUser(results[0]) });
    });
});

// 6. Obtener perfil de usuario
app.get('/api/user/:id', authRequired, (req, res) => {
    const userId = req.params.id;
    if (Number(userId) !== req.auth.userId) {
        return res.status(403).json({ message: 'No autorizado para ver este usuario' });
    }
    db.query('SELECT id, name, email, password, total_xp, profile_pic FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json(err);
        if (!results.length) return res.status(404).json({ message: 'Usuario no encontrado' });
        const row = results[0];
        res.json({
            name: row.name,
            total_xp: row.total_xp,
            profile_pic: row.profile_pic,
            is_admin: isAdminUser(row),
        });
    });
});

// 7.3 Endpoints de administracion de asignaturas
app.get('/api/admin/subjects', authRequired, adminRequired, (req, res) => {
    const sql = `
        SELECT id, name, description, image_url
        FROM subjects
        ORDER BY name
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        return res.json(results);
    });
});

app.post('/api/admin/subjects', authRequired, adminRequired, (req, res) => {
    const { id, name, description, image_url } = req.body || {};
    if (!id || !name) {
        return res.status(400).json({ message: 'id y name son obligatorios' });
    }

    const sql = `
        INSERT INTO subjects (id, name, description, image_url)
        VALUES (?, ?, ?, ?)
    `;
    db.query(
        sql,
        [String(id).trim(), String(name).trim(), description || null, image_url || null],
        (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Ya existe una asignatura con ese id' });
                }
                return res.status(500).json(err);
            }
            return res.status(201).json({ success: true, message: 'Asignatura creada' });
        }
    );
});

app.put('/api/admin/subjects/:id', authRequired, adminRequired, (req, res) => {
    const subjectId = req.params.id;
    const { name, description, image_url } = req.body || {};
    if (!subjectId) {
        return res.status(400).json({ message: 'id de asignatura requerido' });
    }
    if (!name) {
        return res.status(400).json({ message: 'name es obligatorio' });
    }

    const sql = `
        UPDATE subjects
        SET name = ?, description = ?, image_url = ?
        WHERE id = ?
    `;
    db.query(sql, [String(name).trim(), description || null, image_url || null, subjectId], (err, result) => {
        if (err) return res.status(500).json(err);
        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Asignatura no encontrada' });
        }
        return res.json({ success: true, message: 'Asignatura actualizada' });
    });
});

app.post('/api/admin/subjects/:id/image', authRequired, adminRequired, (req, res) => {
    const subjectId = req.params.id;
    const { imageData } = req.body || {};
    if (!subjectId) {
        return res.status(400).json({ message: 'id de asignatura requerido' });
    }
    if (!imageData || typeof imageData !== 'string') {
        return res.status(400).json({ message: 'imageData es requerido' });
    }

    const match = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i);
    if (!match) {
        return res.status(400).json({ message: 'Formato de imagen no valido. Usa PNG, JPG/JPEG o WEBP.' });
    }

    const format = match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
    const extByFormat = { png: 'png', jpeg: 'jpg', webp: 'webp' };
    const ext = extByFormat[format] || 'jpg';
    const base64Payload = match[2];
    const buffer = Buffer.from(base64Payload, 'base64');
    const maxSizeBytes = 300 * 1024;

    if (!buffer.length) {
        return res.status(400).json({ message: 'La imagen esta vacia' });
    }
    if (buffer.length > maxSizeBytes) {
        return res.status(400).json({ message: 'La imagen no debe superar 300KB' });
    }

    const subjectsImagesDir = path.join(process.cwd(), 'public', 'images', 'subjects');
    fs.mkdirSync(subjectsImagesDir, { recursive: true });

    const fileName = `subject-${subjectId}-${Date.now()}.${ext}`;
    const filePath = path.join(subjectsImagesDir, fileName);
    const publicPath = `/images/subjects/${fileName}`;
    const publicUrl = `${req.protocol}://${req.get('host')}${publicPath}`;

    try {
        fs.writeFileSync(filePath, buffer);
    } catch {
        return res.status(500).json({ message: 'No se pudo guardar la imagen' });
    }

    db.query('SELECT image_url FROM subjects WHERE id = ? LIMIT 1', [subjectId], (selectErr, results) => {
        if (selectErr) return res.status(500).json(selectErr);
        if (!results.length) return res.status(404).json({ message: 'Asignatura no encontrada' });

        const oldUrl = results[0]?.image_url;
        let oldPath = oldUrl;
        if (typeof oldPath === 'string' && oldPath.startsWith('http')) {
            try {
                oldPath = new URL(oldPath).pathname;
            } catch {
                oldPath = oldUrl;
            }
        }

        db.query('UPDATE subjects SET image_url = ? WHERE id = ?', [publicUrl, subjectId], (updateErr) => {
            if (updateErr) return res.status(500).json(updateErr);

            if (oldPath && typeof oldPath === 'string' && oldPath.startsWith('/images/subjects/')) {
                const oldFile = oldPath.replace('/images/subjects/', '');
                const oldFilePath = path.join(subjectsImagesDir, oldFile);
                if (fs.existsSync(oldFilePath)) {
                    try {
                        fs.unlinkSync(oldFilePath);
                    } catch {
                        // Ignore deletion issues for previous image.
                    }
                }
            }

            return res.json({ success: true, image_url: publicUrl });
        });
    });
});

app.delete('/api/admin/subjects/:id', authRequired, adminRequired, (req, res) => {
    const subjectId = req.params.id;
    if (!subjectId) {
        return res.status(400).json({ message: 'id de asignatura requerido' });
    }

    db.beginTransaction((txErr) => {
        if (txErr) return res.status(500).json(txErr);

        db.query('DELETE FROM quiz_results WHERE subject_id = ?', [subjectId], (resultErr) => {
            if (resultErr) {
                return db.rollback(() => res.status(500).json(resultErr));
            }

            db.query('DELETE FROM questions WHERE subject_id = ?', [subjectId], (questionsErr) => {
                if (questionsErr) {
                    return db.rollback(() => res.status(500).json(questionsErr));
                }

                db.query('DELETE FROM subjects WHERE id = ?', [subjectId], (subjectErr, deleteResult) => {
                    if (subjectErr) {
                        return db.rollback(() => res.status(500).json(subjectErr));
                    }
                    if (!deleteResult.affectedRows) {
                        return db.rollback(() => res.status(404).json({ message: 'Asignatura no encontrada' }));
                    }

                    db.commit((commitErr) => {
                        if (commitErr) {
                            return db.rollback(() => res.status(500).json(commitErr));
                        }
                        return res.json({ success: true, message: 'Asignatura eliminada' });
                    });
                });
            });
        });
    });
});

// 7.1 Subir foto de perfil (base64) y guardar ruta en users.profile_pic
app.post('/api/user/profile-pic', authRequired, (req, res) => {
    const { imageData } = req.body || {};
    if (!imageData || typeof imageData !== 'string') {
        return res.status(400).json({ message: 'imageData es requerido' });
    }

    const match = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i);
    if (!match) {
        return res.status(400).json({ message: 'Formato de imagen no valido. Usa PNG, JPG/JPEG o WEBP.' });
    }

    const format = match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
    const extByFormat = { png: 'png', jpeg: 'jpg', webp: 'webp' };
    const ext = extByFormat[format] || 'jpg';
    const base64Payload = match[2];
    const buffer = Buffer.from(base64Payload, 'base64');
    const maxSizeBytes = 100 * 1024;

    if (!buffer.length) {
        return res.status(400).json({ message: 'La imagen esta vacia' });
    }

    if (buffer.length > maxSizeBytes) {
        return res.status(400).json({ message: 'La imagen supera 100KB' });
    }

    const userId = req.auth.userId;
    const userImagesDir = path.join(process.cwd(), 'public', 'images', 'users');
    fs.mkdirSync(userImagesDir, { recursive: true });

    const fileName = `user-${userId}-${Date.now()}.${ext}`;
    const filePath = path.join(userImagesDir, fileName);
    const publicPath = `/images/users/${fileName}`;
    const publicUrl = `${req.protocol}://${req.get('host')}${publicPath}`;

    try {
        fs.writeFileSync(filePath, buffer);
    } catch (error) {
        return res.status(500).json({ message: 'No se pudo guardar la imagen' });
    }

    db.query('SELECT profile_pic FROM users WHERE id = ? LIMIT 1', [userId], (selectErr, results) => {
        if (selectErr) {
            return res.status(500).json(selectErr);
        }

        const oldPic = results?.[0]?.profile_pic;
        let oldPicPath = oldPic;
        if (typeof oldPicPath === 'string' && oldPicPath.startsWith('http')) {
            try {
                oldPicPath = new URL(oldPicPath).pathname;
            } catch {
                oldPicPath = oldPic;
            }
        }
        const updateSql = 'UPDATE users SET profile_pic = ? WHERE id = ?';
        db.query(updateSql, [publicUrl, userId], (updateErr) => {
            if (updateErr) {
                return res.status(500).json(updateErr);
            }

            if (oldPicPath && typeof oldPicPath === 'string' && oldPicPath.startsWith('/images/users/')) {
                const oldFileName = oldPicPath.replace('/images/users/', '');
                const oldFilePath = path.join(userImagesDir, oldFileName);
                if (fs.existsSync(oldFilePath)) {
                    try {
                        fs.unlinkSync(oldFilePath);
                    } catch {
                        // No bloquea respuesta si no se puede borrar el archivo anterior.
                    }
                }
            }

            return res.json({ success: true, profile_pic: publicUrl });
        });
    });
});

// 7.2 Cambiar contrasena de usuario autenticado
app.post('/api/user/change-password', authRequired, (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'currentPassword y newPassword son requeridos' });
    }

    if (String(newPassword).length < 6) {
        return res.status(400).json({ message: 'La nueva contrasena debe tener al menos 6 caracteres' });
    }

    if (currentPassword === newPassword) {
        return res.status(400).json({ message: 'La nueva contrasena debe ser distinta de la actual' });
    }

    const userId = req.auth.userId;
    const selectSql = 'SELECT password FROM users WHERE id = ? LIMIT 1';
    db.query(selectSql, [userId], (selectErr, results) => {
        if (selectErr) return res.status(500).json(selectErr);
        if (!results.length) return res.status(404).json({ message: 'Usuario no encontrado' });

        const user = results[0];
        if (!isPasswordMatch(user.password, currentPassword)) {
            return res.status(401).json({ message: 'La contrasena actual no es correcta' });
        }

        const updateSql = 'UPDATE users SET password = ? WHERE id = ?';
        db.query(updateSql, [hashPassword(newPassword), userId], (updateErr) => {
            if (updateErr) return res.status(500).json(updateErr);
            return res.json({ success: true, message: 'Contrasena actualizada correctamente' });
        });
    });
});

// 8. Obtener todas las asignaturas y progreso acumulado
app.get('/api/subjects', authRequired, (req, res) => {
    const sql = `
        SELECT s.*, 
        (SELECT MAX(score) FROM quiz_results WHERE subject_id = s.id AND user_id = ?) as best_score,
        (SELECT COUNT(*) FROM quiz_results WHERE subject_id = s.id AND user_id = ?) as attempts
        FROM subjects s
    `;
    db.query(sql, [req.auth.userId, req.auth.userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 9. Verificar si el usuario puede iniciar quiz hoy en una asignatura
app.get('/api/quiz/can-start/:subjectId', authRequired, (req, res) => {
    const subjectId = req.params.subjectId;
    if (!subjectId) {
        return res.status(400).json({ message: 'subjectId es requerido' });
    }

    getDailyAttemptsForSubject(req.auth.userId, subjectId, (err, attemptsToday) => {
        if (err) return res.status(500).json(err);
        const allowed = attemptsToday < DAILY_QUIZ_LIMIT;
        return res.json({
            allowed,
            attemptsToday,
            dailyLimit: DAILY_QUIZ_LIMIT,
            remaining: Math.max(0, DAILY_QUIZ_LIMIT - attemptsToday),
        });
    });
});

// 10. Guardar resultado de un quiz
app.post('/api/quiz/finish', authRequired, (req, res) => {
    const { userId, subjectId, score, xpEarned, questions } = req.body;
    if (!userId || !subjectId || typeof score !== 'number' || typeof xpEarned !== 'number') {
        return res.status(400).json({ message: 'Body invalido para guardar resultado' });
    }
    if (Number(userId) !== req.auth.userId) {
        return res.status(403).json({ message: 'No autorizado para guardar resultados de otro usuario' });
    }
    if (questions !== undefined && !Array.isArray(questions)) {
        return res.status(400).json({ message: 'questions debe ser un array' });
    }

    getDailyAttemptsForSubject(userId, subjectId, (limitErr, attemptsToday) => {
        if (limitErr) return res.status(500).json(limitErr);
        if (attemptsToday >= DAILY_QUIZ_LIMIT) {
            return res.status(429).json({
                message: 'Has superado el numero de test diarios para esta asignatura.',
                attemptsToday,
                dailyLimit: DAILY_QUIZ_LIMIT,
            });
        }

        const sanitizedQuestions = (questions || []).map((question) => ({
            text: typeof question?.text === 'string' ? question.text.trim() : '',
            options: Array.isArray(question?.options) ? question.options.slice(0, 4).map((option) => String(option ?? '')) : [],
            correctAnswerIndex: Number(question?.correctAnswerIndex),
            explanation: typeof question?.explanation === 'string' ? question.explanation : null,
        }));

        const hasInvalidQuestion = sanitizedQuestions.some((question) => (
            !question.text ||
            question.options.length !== 4 ||
            question.options.some((option) => option.trim().length === 0) ||
            !Number.isInteger(question.correctAnswerIndex) ||
            question.correctAnswerIndex < 0 ||
            question.correctAnswerIndex > 3
        ));

        if (hasInvalidQuestion) {
            return res.status(400).json({ message: 'Formato de questions invalido. Cada pregunta debe tener texto, 4 opciones y correctAnswerIndex entre 0 y 3.' });
        }

        db.beginTransaction((txErr) => {
            if (txErr) return res.status(500).json(txErr);

            let settled = false;
            const rollbackWith = (errorPayload) => {
                if (settled) return;
                settled = true;
                db.rollback(() => res.status(500).json(errorPayload));
            };

            const insertResult = 'INSERT INTO quiz_results (user_id, subject_id, score, xp_earned) VALUES (?, ?, ?, ?)';
            db.query(insertResult, [userId, subjectId, score, xpEarned], (insertErr) => {
                if (insertErr) return rollbackWith(insertErr);

                const updateUserXp = 'UPDATE users SET total_xp = total_xp + ? WHERE id = ?';
                db.query(updateUserXp, [xpEarned, userId], (updateErr) => {
                    if (updateErr) return rollbackWith(updateErr);

                    if (!sanitizedQuestions.length) {
                        return db.commit((commitErr) => {
                            if (commitErr) return rollbackWith(commitErr);
                            if (settled) return;
                            settled = true;
                            return res.json({ success: true, message: 'Resultado guardado y XP actualizado' });
                        });
                    }

                    const insertQuestionSql = `
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

                    let pending = sanitizedQuestions.length;
                    for (const question of sanitizedQuestions) {
                        const params = [
                            subjectId,
                            question.text,
                            question.options[0],
                            question.options[1],
                            question.options[2],
                            question.options[3],
                            question.correctAnswerIndex,
                            question.explanation,
                        ];

                        db.query(insertQuestionSql, params, (questionErr) => {
                            if (questionErr) return rollbackWith(questionErr);

                            pending -= 1;
                            if (pending === 0) {
                                db.commit((commitErr) => {
                                    if (commitErr) return rollbackWith(commitErr);
                                    if (settled) return;
                                    settled = true;
                                    return res.json({
                                        success: true,
                                        message: 'Resultado guardado, XP actualizado y preguntas registradas',
                                    });
                                });
                            }
                        });
                    }
                });
            });
        });
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor QuizQuest corriendo en puerto ${PORT}`);
});
