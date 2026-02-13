import { HttpError } from '../auth/authService.js';

export const createUserService = ({ userRepository, isAdminUser, isPasswordMatch }) => ({
    async getOwnProfile(requestedUserId, authUserId) {
        if (Number(requestedUserId) !== Number(authUserId)) {
            throw new HttpError(403, 'No autorizado para ver este usuario');
        }

        const user = await userRepository.findUserById(requestedUserId);
        if (!user) throw new HttpError(404, 'Usuario no encontrado');

        return {
            name: user.name,
            total_xp: user.total_xp,
            profile_pic: user.profile_pic,
            is_admin: isAdminUser(user),
        };
    },

    validatePasswordChange(currentPassword, newPassword) {
        if (!currentPassword || !newPassword) {
            throw new HttpError(400, 'currentPassword y newPassword son requeridos');
        }
        if (String(newPassword).length < 6) {
            throw new HttpError(400, 'La nueva contrasena debe tener al menos 6 caracteres');
        }
        if (currentPassword === newPassword) {
            throw new HttpError(400, 'La nueva contrasena debe ser distinta de la actual');
        }
    },

    async changePassword({ userId, currentPassword, newPassword }) {
        this.validatePasswordChange(currentPassword, newPassword);

        const user = await userRepository.findUserById(userId);
        if (!user) throw new HttpError(404, 'Usuario no encontrado');
        if (!isPasswordMatch(user.password, currentPassword)) {
            throw new HttpError(401, 'La contrasena actual no es correcta');
        }

        await userRepository.updatePassword(userId, newPassword);
        return { success: true, message: 'Contrasena actualizada correctamente' };
    },
});
