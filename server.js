import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { createAuthRouter } from './src/auth/authRoutes.js';

dotenv.config();

const normalizeOrigin = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
        return new URL(raw).origin;
    } catch {
        return raw.replace(/\/+$/, '');
    }
};

const appBaseUrl = String(process.env.APP_BASE_URL || '').trim();
const corsOriginsFromEnv = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';
const allowedCorsOrigins = Array.from(
    new Set([
        ...corsOriginsFromEnv,
        normalizeOrigin(appBaseUrl),
    ].filter(Boolean))
);
let warnedCorsFallback = false;

const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser clients (curl/postman/server-to-server).
        if (!origin) return callback(null, true);
        const normalizedRequestOrigin = normalizeOrigin(origin);
        if (allowedCorsOrigins.includes(normalizedRequestOrigin)) return callback(null, true);
        // Fallback to avoid hard outage when CORS env is missing.
        if (allowedCorsOrigins.length === 0) {
            if (!warnedCorsFallback) {
                warnedCorsFallback = true;
                console.warn('CORS_ORIGIN no configurado; se permite cualquier origen temporalmente.');
            }
            return callback(null, true);
        }
        return callback(new Error('CORS_ORIGIN_DENIED'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use('/images', express.static(path.join(process.cwd(), 'public', 'images')));
const sessions = new Map();
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 8);
const DAILY_QUIZ_LIMIT = 2;
const PASSWORD_RESET_TOKEN_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 30);
const AUTH_RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 1000 * 60 * 15);
const AUTH_RATE_LIMIT_MAX_REQUESTS = Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 10);
const ADMIN_USER_RULE = {
    id: 1,
    name: 'Jon',
};

const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
const mailFrom = (process.env.MAIL_FROM || 'onboarding@resend.dev').trim();

const sendPasswordResetEmail = async (email, token) => {
    if (!resendApiKey) {
        throw new Error('RESEND_API_KEY no configurada');
    }

    const resetHint = appBaseUrl
        ? `Abre ${appBaseUrl} y usa el codigo en la pantalla de recuperacion.`
        : 'Abre la app y usa este codigo en la pantalla de recuperacion.';
    const payload = {
        from: mailFrom,
        to: [email],
        subject: 'QuizQuest - Recuperacion de contrasena',
        text: `Hemos recibido una solicitud para restablecer tu contrasena.\n\nCodigo de recuperacion: ${token}\n\nEste codigo caduca en ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutos.\n${resetHint}\n\nSi no solicitaste este cambio, ignora este mensaje.`,
    };

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Resend fallo (${response.status}): ${responseText}`);
    }
};

const isAdminUser = (userRow) => {
    if (!userRow) return false;
    const idMatches = Number(userRow.id) === ADMIN_USER_RULE.id;
    const nameMatches = String(userRow.name || '') === ADMIN_USER_RULE.name;
    return idMatches && nameMatches;
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

const isPasswordMatch = (storedPassword, rawPassword) => storedPassword === rawPassword;
const authRateBuckets = new Map();

const getRequestIp = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
};

const authRateLimit = (req, res, next) => {
    const ip = getRequestIp(req);
    const routeKey = `${req.method}:${req.path}`;
    const bucketKey = `${ip}:${routeKey}`;
    const now = Date.now();

    const bucket = authRateBuckets.get(bucketKey);
    if (!bucket || now > bucket.resetAt) {
        authRateBuckets.set(bucketKey, { count: 1, resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS });
        return next();
    }

    bucket.count += 1;
    if (bucket.count > AUTH_RATE_LIMIT_MAX_REQUESTS) {
        const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
        res.set('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
            message: 'Demasiadas solicitudes de autenticacion. Intenta de nuevo en unos minutos.',
        });
    }

    return next();
};

setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of authRateBuckets.entries()) {
        if (now > bucket.resetAt) {
            authRateBuckets.delete(key);
        }
    }
}, Math.max(30000, AUTH_RATE_LIMIT_WINDOW_MS)).unref();

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

// Configuracion de la conexion a MySQL.
// Si existe DB_URL (Railway), se parsea y se permite sobreescribir la BD con DB_NAME.
const createDbConnection = () => {
    if (process.env.DB_URL) {
        try {
            const parsedUrl = new URL(process.env.DB_URL);
            const dbNameFromUrl = parsedUrl.pathname.replace(/^\//, '');
            return mysql.createConnection({
                host: parsedUrl.hostname,
                port: Number(parsedUrl.port || process.env.DB_PORT || 3306),
                user: decodeURIComponent(parsedUrl.username),
                password: decodeURIComponent(parsedUrl.password),
                database: process.env.DB_NAME || dbNameFromUrl || 'quizquest_db',
            });
        } catch (error) {
            console.error('DB_URL invalida, se intenta conexion por variables sueltas:', error.message);
        }
    }

    return mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '1234',
        database: process.env.DB_NAME || 'quizquest_db',
        port: Number(process.env.DB_PORT || 3306),
    });
};

const parseSubjectId = (value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
};

const db = createDbConnection();


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

const ensureSubjectsActivoColumn = () => {
    const sqlCheck = `
        SELECT COUNT(*) AS columnExists
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'subjects'
          AND COLUMN_NAME = 'activo'
    `;
    const schemaName = process.env.DB_NAME || 'quizquest_db';

    db.query(sqlCheck, [schemaName], (checkErr, results) => {
        if (checkErr) {
            console.error('No se pudo verificar la columna activo en subjects:', checkErr.message);
            return;
        }

        const exists = Number(results?.[0]?.columnExists || 0) > 0;
        if (exists) return;

        db.query('ALTER TABLE subjects ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1', (alterErr) => {
            if (alterErr) {
                console.error('No se pudo crear la columna activo en subjects:', alterErr.message);
            }
        });
    });
};

ensureSubjectsActivoColumn();

const ensurePasswordResetsTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS password_resets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(128) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            INDEX idx_password_resets_user (user_id),
            INDEX idx_password_resets_token (token)
        )
    `;

    db.query(sql, (err) => {
        if (err) {
            console.error('No se pudo crear/verificar la tabla password_resets:', err.message);
        }
    });
};

ensurePasswordResetsTable();

// --- ENDPOINTS ---

app.use('/api/auth', createAuthRouter({
    db,
    createSession,
    sanitizeUser,
    isPasswordMatch,
    sendPasswordResetEmail,
    passwordResetTokenTtlMinutes: PASSWORD_RESET_TOKEN_TTL_MINUTES,
    authRateLimit,
    authRequired,
    sessions,
}));

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
        SELECT id, name, description, image_url, activo
        FROM subjects
        ORDER BY name
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        return res.json(results);
    });
});

app.post('/api/admin/subjects', authRequired, adminRequired, (req, res) => {
    const { name, description, image_url, activo } = req.body || {};
    if (!name) {
        return res.status(400).json({ message: 'name es obligatorio' });
    }

    const sql = `
        INSERT INTO subjects (name, description, image_url, activo)
        VALUES (?, ?, ?, ?)
    `;
    db.query(
        sql,
        [String(name).trim(), description || null, image_url || null, activo === false ? 0 : 1],
        (err, result) => {
            if (err) {
                return res.status(500).json(err);
            }
            return res.status(201).json({ success: true, message: 'Asignatura creada', id: Number(result.insertId) });
        }
    );
});

app.put('/api/admin/subjects/:id', authRequired, adminRequired, (req, res) => {
    const subjectId = parseSubjectId(req.params.id);
    const { name, description, image_url, activo } = req.body || {};
    if (!subjectId) {
        return res.status(400).json({ message: 'id de asignatura invalido' });
    }
    if (!name) {
        return res.status(400).json({ message: 'name es obligatorio' });
    }

    const sql = `
        UPDATE subjects
        SET name = ?, description = ?, image_url = COALESCE(?, image_url), activo = ?
        WHERE id = ?
    `;
    db.query(
        sql,
        [String(name).trim(), description || null, image_url || null, activo === false ? 0 : 1, subjectId],
        (err, result) => {
        if (err) return res.status(500).json(err);
        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Asignatura no encontrada' });
        }
        return res.json({ success: true, message: 'Asignatura actualizada' });
        }
    );
});

app.post('/api/admin/subjects/:id/image', authRequired, adminRequired, (req, res) => {
    const subjectId = parseSubjectId(req.params.id);
    const { imageData } = req.body || {};
    if (!subjectId) {
        return res.status(400).json({ message: 'id de asignatura invalido' });
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
    const subjectId = parseSubjectId(req.params.id);
    if (!subjectId) {
        return res.status(400).json({ message: 'id de asignatura invalido' });
    }

    db.query('UPDATE subjects SET activo = 0 WHERE id = ? AND activo <> 0', [subjectId], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows > 0) {
            return res.json({ success: true, message: 'Asignatura desactivada' });
        }
        db.query('SELECT id FROM subjects WHERE id = ? LIMIT 1', [subjectId], (checkErr, rows) => {
            if (checkErr) return res.status(500).json(checkErr);
            if (!rows.length) {
                return res.status(404).json({ message: 'Asignatura no encontrada' });
            }
            return res.json({ success: true, message: 'Asignatura ya estaba desactivada' });
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
        db.query(updateSql, [newPassword, userId], (updateErr) => {
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
        WHERE s.activo = 1
    `;
    db.query(sql, [req.auth.userId, req.auth.userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 9. Verificar si el usuario puede iniciar quiz hoy en una asignatura
app.get('/api/quiz/can-start/:subjectId', authRequired, (req, res) => {
    const subjectId = parseSubjectId(req.params.subjectId);
    if (!subjectId) {
        return res.status(400).json({ message: 'subjectId invalido' });
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
    const normalizedSubjectId = parseSubjectId(subjectId);
    if (!userId || !normalizedSubjectId || typeof score !== 'number' || typeof xpEarned !== 'number') {
        return res.status(400).json({ message: 'Body invalido para guardar resultado' });
    }
    if (Number(userId) !== req.auth.userId) {
        return res.status(403).json({ message: 'No autorizado para guardar resultados de otro usuario' });
    }
    if (questions !== undefined && !Array.isArray(questions)) {
        return res.status(400).json({ message: 'questions debe ser un array' });
    }

    getDailyAttemptsForSubject(userId, normalizedSubjectId, (limitErr, attemptsToday) => {
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
            db.query(insertResult, [userId, normalizedSubjectId, score, xpEarned], (insertErr) => {
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
                            normalizedSubjectId,
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

app.use((error, req, res, next) => {
    if (error?.message === 'CORS_ORIGIN_DENIED') {
        return res.status(403).json({ message: 'Origen no permitido por CORS' });
    }
    return next(error);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor QuizQuest corriendo en puerto ${PORT}`);
});
