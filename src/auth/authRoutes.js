import { Router } from 'express';
import { createAuthRepository } from './authRepository.js';
import { createAuthService, HttpError } from './authService.js';
import {
    validateForgotPasswordPayload,
    validateLoginPayload,
    validateRegisterPayload,
    validateResetPasswordPayload,
} from './authValidators.js';

const genericForgotPasswordResponse = {
    success: true,
    message: 'Si el correo existe, recibiras un codigo de recuperacion.',
};

export const createAuthRouter = ({
    db,
    createSession,
    sanitizeUser,
    isPasswordMatch,
    sendPasswordResetEmail,
    passwordResetTokenTtlMinutes,
    authRateLimit,
    authRequired,
    sessions,
}) => {
    const router = Router();
    const authRepository = createAuthRepository(db);
    const authService = createAuthService({
        authRepository,
        createSession,
        sanitizeUser,
        isPasswordMatch,
        passwordResetTokenTtlMinutes,
    });

    const handleError = (error, res) => {
        if (error instanceof HttpError) {
            return res.status(error.status).json({ message: error.message });
        }
        return res.status(500).json(error);
    };

    router.post('/login', authRateLimit, async (req, res) => {
        const validation = validateLoginPayload(req.body);
        if (!validation.ok) return res.status(validation.status).json({ message: validation.message });

        try {
            const response = await authService.login(validation.value);
            return res.json(response);
        } catch (error) {
            return handleError(error, res);
        }
    });

    router.post('/register', authRateLimit, async (req, res) => {
        const validation = validateRegisterPayload(req.body);
        if (!validation.ok) return res.status(validation.status).json({ message: validation.message });

        try {
            const response = await authService.register(validation.value);
            return res.status(201).json(response);
        } catch (error) {
            return handleError(error, res);
        }
    });

    router.post('/forgot-password', authRateLimit, async (req, res) => {
        const validation = validateForgotPasswordPayload(req.body);
        if (!validation.ok) return res.status(validation.status).json({ message: validation.message });

        try {
            const { emailToSend, token } = await authService.requestPasswordReset(validation.value.email);
            res.json(genericForgotPasswordResponse);
            if (!emailToSend || !token) return;

            sendPasswordResetEmail(emailToSend, token).catch((mailErr) => {
                console.error('Error enviando correo de recuperacion:', mailErr);
            });
        } catch (error) {
            return handleError(error, res);
        }
    });

    router.post('/reset-password', authRateLimit, async (req, res) => {
        const validation = validateResetPasswordPayload(req.body);
        if (!validation.ok) return res.status(validation.status).json({ message: validation.message });

        try {
            const response = await authService.resetPassword(validation.value);
            return res.json(response);
        } catch (error) {
            return handleError(error, res);
        }
    });

    router.post('/logout', authRequired, (req, res) => {
        sessions.delete(req.auth.token);
        res.json({ success: true });
    });

    router.get('/me', authRequired, async (req, res) => {
        try {
            const response = await authService.getCurrentUser(req.auth.userId);
            return res.json(response);
        } catch (error) {
            return handleError(error, res);
        }
    });

    return router;
};
