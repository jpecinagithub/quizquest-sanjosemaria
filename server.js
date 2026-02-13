import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import path from 'path';
import { createAuthRouter } from './src/auth/authRoutes.js';
import { createUserRouter } from './src/users/userRoutes.js';
import { createAdminSubjectsRouter, createPublicSubjectsRouter } from './src/subjects/subjectsRoutes.js';
import { createQuizRouter } from './src/quiz/quizRoutes.js';

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

app.use('/api/user', createUserRouter({
    db,
    authRequired,
    isAdminUser,
    isPasswordMatch,
}));

app.use('/api/subjects', createPublicSubjectsRouter({
    db,
    authRequired,
    parseSubjectId,
}));

app.use('/api/admin/subjects', createAdminSubjectsRouter({
    db,
    authRequired,
    adminRequired,
    parseSubjectId,
}));

app.use('/api/quiz', createQuizRouter({
    db,
    authRequired,
    parseSubjectId,
    dailyQuizLimit: DAILY_QUIZ_LIMIT,
}));

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
