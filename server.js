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

const sanitizeUser = (userRow) => ({
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    profile_pic: userRow.profile_pic,
    total_xp: userRow.total_xp
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
    const sql = 'SELECT id, name, email, profile_pic, total_xp FROM users WHERE id = ? LIMIT 1';
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
    db.query('SELECT name, total_xp, profile_pic FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results[0]);
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
    const { userId, subjectId, score, xpEarned } = req.body;
    if (!userId || !subjectId || typeof score !== 'number' || typeof xpEarned !== 'number') {
        return res.status(400).json({ message: 'Body invalido para guardar resultado' });
    }
    if (Number(userId) !== req.auth.userId) {
        return res.status(403).json({ message: 'No autorizado para guardar resultados de otro usuario' });
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

        const insertResult = 'INSERT INTO quiz_results (user_id, subject_id, score, xp_earned) VALUES (?, ?, ?, ?)';
        db.query(insertResult, [userId, subjectId, score, xpEarned], (err) => {
            if (err) return res.status(500).json(err);

            // Actualizar XP total del usuario
            const updateUserXp = 'UPDATE users SET total_xp = total_xp + ? WHERE id = ?';
            db.query(updateUserXp, [xpEarned, userId], (err2) => {
                if (err2) return res.status(500).json(err2);
                res.json({ success: true, message: 'Resultado guardado y XP actualizado' });
            });
        });
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor QuizQuest corriendo en puerto ${PORT}`);
});
