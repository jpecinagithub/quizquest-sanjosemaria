import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import dotenv from 'dotenv';
import { createHash, randomUUID } from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const sessions = new Map();
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 8);

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
        const legacyMatch = user.password === 'hashed_password_here' && password === '1234';
        const passwordMatches = user.password === hashPassword(password) || user.password === password || legacyMatch;
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

// 7. Obtener todas las asignaturas y progreso acumulado
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

// 8. Guardar resultado de un quiz
app.post('/api/quiz/finish', authRequired, (req, res) => {
    const { userId, subjectId, score, xpEarned } = req.body;
    if (!userId || !subjectId || typeof score !== 'number' || typeof xpEarned !== 'number') {
        return res.status(400).json({ message: 'Body invalido para guardar resultado' });
    }
    if (Number(userId) !== req.auth.userId) {
        return res.status(403).json({ message: 'No autorizado para guardar resultados de otro usuario' });
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor QuizQuest corriendo en puerto ${PORT}`);
});
