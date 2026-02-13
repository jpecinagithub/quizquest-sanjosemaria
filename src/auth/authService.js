import { randomUUID } from 'crypto';

export class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
    }
}

export const createAuthService = ({
    authRepository,
    createSession,
    sanitizeUser,
    isPasswordMatch,
    passwordResetTokenTtlMinutes,
}) => ({
    async login({ email, password }) {
        const user = await authRepository.findUserAuthByEmail(email);
        if (!user || !isPasswordMatch(user.password, password)) {
            throw new HttpError(401, 'Credenciales invalidas');
        }

        const token = createSession(user.id);
        return { token, user: sanitizeUser(user) };
    },

    async register({ name, email, password }) {
        try {
            const userId = await authRepository.createUser({ name, email, password });
            const user = await authRepository.findUserById(userId);
            if (!user) throw new HttpError(500, 'No se pudo crear el usuario');

            const token = createSession(userId);
            return { token, user: sanitizeUser(user) };
        } catch (error) {
            if (error?.code === 'ER_DUP_ENTRY') {
                throw new HttpError(409, 'Ese email ya esta registrado');
            }
            throw error;
        }
    },

    async getCurrentUser(userId) {
        const user = await authRepository.findUserById(userId);
        if (!user) throw new HttpError(401, 'Sesion invalida');
        return { user: sanitizeUser(user) };
    },

    async requestPasswordReset(email) {
        const user = await authRepository.findUserAuthByEmail(email);
        if (!user) {
            return { emailToSend: null, token: null };
        }

        const token = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
        await authRepository.createPasswordResetToken({
            userId: Number(user.id),
            token,
            ttlMinutes: passwordResetTokenTtlMinutes,
        });

        return { emailToSend: user.email, token };
    },

    async resetPassword({ email, token, newPassword }) {
        const user = await authRepository.findUserAuthByEmail(email);
        if (!user) throw new HttpError(400, 'Codigo invalido o expirado');

        const resetToken = await authRepository.findValidPasswordResetToken({
            userId: Number(user.id),
            token: String(token).trim(),
        });
        if (!resetToken) throw new HttpError(400, 'Codigo invalido o expirado');

        await authRepository.updateUserPassword({ userId: Number(user.id), password: String(newPassword) });
        await authRepository.markPasswordResetTokenUsed(Number(resetToken.id));

        return { success: true, message: 'Contrasena restablecida correctamente.' };
    },
});
