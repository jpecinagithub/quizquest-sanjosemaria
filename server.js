import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';
import dns from 'node:dns/promises';
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
const PASSWORD_RESET_TOKEN_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 30);
const appBaseUrl = process.env.APP_BASE_URL || '';
const ADMIN_USER_RULE = {
    id: 1,
    name: 'Jon',
};

const gmailUser = (process.env.GMAIL_USER || '').trim();
const gmailAppPassword = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

const createMailTransport = async () => {
    const resolvedIpv4 = await dns.resolve4('smtp.gmail.com');
    const smtpHostIpv4 = resolvedIpv4?.[0];
    if (!smtpHostIpv4) {
        throw new Error('No se pudo resolver smtp.gmail.com a IPv4');
    }

    return nodemailer.createTransport({
        host: smtpHostIpv4,
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: gmailUser,
            pass: gmailAppPassword,
        },
        tls: {
            servername: 'smtp.gmail.com',
        },
    });
};

const sendPasswordResetEmail = async (email, token) => {
    if (!gmailUser || !gmailAppPassword) {
        throw new Error('Credenciales de Gmail no configuradas');
    }

    const resetHint = appBaseUrl
        ? `Abre ${appBaseUrl} y usa el codigo en la pantalla de recuperacion.`
        : 'Abre la app y usa este codigo en la pantalla de recuperacion.';
    const mailOptions = {
        from: gmailUser,
        to: email,
        subject: 'QuizQuest - Recuperacion de contrasena',
        text: `Hemos recibido una solicitud para restablecer tu contrasena.\n\nCodigo de recuperacion: ${token}\n\nEste codigo caduca en ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutos.\n${resetHint}\n\nSi no solicitaste este cambio, ignora este mensaje.`,
    };

    const transport = await createMailTransport();
    await transport.sendMail(mailOptions);
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
    db.query(insertSql, [name, email, password], (err, result) => {
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

    const genericResponse = {
        success: true,
        message: 'Si el correo existe, recibiras un codigo de recuperacion.'
    };

    const selectSql = 'SELECT id, email FROM users WHERE email = ? LIMIT 1';
    db.query(selectSql, [email], async (err, results) => {
        if (err) return res.status(500).json(err);
        if (!results.length) return res.json(genericResponse);

        const userId = Number(results[0].id);
        const token = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
        const insertSql = `
            INSERT INTO password_resets (user_id, token, expires_at, used_at)
            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NULL)
        `;

        db.query(insertSql, [userId, token, PASSWORD_RESET_TOKEN_TTL_MINUTES], async (insertErr) => {
            if (insertErr) return res.status(500).json(insertErr);

            try {
                await sendPasswordResetEmail(email, token);
                return res.json(genericResponse);
            } catch (mailErr) {
                console.error('Error enviando correo de recuperacion:', mailErr);
                return res.status(500).json({ message: 'No se pudo enviar el correo de recuperacion.' });
            }
        });
    });
});

app.post('/api/auth/reset-password', (req, res) => {
    const { email, token, newPassword } = req.body || {};
    if (!email || !token || !newPassword) {
        return res.status(400).json({ message: 'email, token y newPassword son requeridos' });
    }
    if (String(newPassword).length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const selectUserSql = 'SELECT id FROM users WHERE email = ? LIMIT 1';
    db.query(selectUserSql, [email], (userErr, userRows) => {
        if (userErr) return res.status(500).json(userErr);
        if (!userRows.length) return res.status(400).json({ message: 'Codigo invalido o expirado' });

        const userId = Number(userRows[0].id);
        const selectTokenSql = `
            SELECT id
            FROM password_resets
            WHERE user_id = ?
              AND token = ?
              AND used_at IS NULL
              AND expires_at > NOW()
            ORDER BY id DESC
            LIMIT 1
        `;

        db.query(selectTokenSql, [userId, String(token).trim()], (tokenErr, tokenRows) => {
            if (tokenErr) return res.status(500).json(tokenErr);
            if (!tokenRows.length) return res.status(400).json({ message: 'Codigo invalido o expirado' });

            const resetId = Number(tokenRows[0].id);
            const updatePasswordSql = 'UPDATE users SET password = ? WHERE id = ?';
            db.query(updatePasswordSql, [String(newPassword), userId], (passErr) => {
                if (passErr) return res.status(500).json(passErr);

                db.query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [resetId], (markErr) => {
                    if (markErr) return res.status(500).json(markErr);
                    return res.json({ success: true, message: 'Contrasena restablecida correctamente.' });
                });
            });
        });
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor QuizQuest corriendo en puerto ${PORT}`);
});
