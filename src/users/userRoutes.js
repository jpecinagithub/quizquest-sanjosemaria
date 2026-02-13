import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { HttpError } from '../auth/authService.js';
import { createUserRepository } from './userRepository.js';
import { createUserService } from './userService.js';

const imageDataPattern = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i;

export const createUserRouter = ({
    db,
    authRequired,
    isAdminUser,
    isPasswordMatch,
}) => {
    const router = Router();
    const userRepository = createUserRepository(db);
    const userService = createUserService({ userRepository, isAdminUser, isPasswordMatch });

    const handleError = (error, res) => {
        if (error instanceof HttpError) {
            return res.status(error.status).json({ message: error.message });
        }
        return res.status(500).json(error);
    };

    router.get('/:id', authRequired, async (req, res) => {
        try {
            const profile = await userService.getOwnProfile(req.params.id, req.auth.userId);
            return res.json(profile);
        } catch (error) {
            return handleError(error, res);
        }
    });

    router.post('/profile-pic', authRequired, async (req, res) => {
        const { imageData } = req.body || {};
        if (!imageData || typeof imageData !== 'string') {
            return res.status(400).json({ message: 'imageData es requerido' });
        }

        const match = imageData.match(imageDataPattern);
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
        } catch {
            return res.status(500).json({ message: 'No se pudo guardar la imagen' });
        }

        try {
            const user = await userRepository.findUserById(userId);
            if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

            await userRepository.updateProfilePic(userId, publicUrl);

            let oldPicPath = user.profile_pic;
            if (typeof oldPicPath === 'string' && oldPicPath.startsWith('http')) {
                try {
                    oldPicPath = new URL(oldPicPath).pathname;
                } catch {
                    oldPicPath = user.profile_pic;
                }
            }
            if (oldPicPath && typeof oldPicPath === 'string' && oldPicPath.startsWith('/images/users/')) {
                const oldFileName = oldPicPath.replace('/images/users/', '');
                const oldFilePath = path.join(userImagesDir, oldFileName);
                if (fs.existsSync(oldFilePath)) {
                    try {
                        fs.unlinkSync(oldFilePath);
                    } catch {
                        // Ignore old file deletion issues.
                    }
                }
            }

            return res.json({ success: true, profile_pic: publicUrl });
        } catch (error) {
            return handleError(error, res);
        }
    });

    router.post('/change-password', authRequired, async (req, res) => {
        const { currentPassword, newPassword } = req.body || {};

        try {
            const response = await userService.changePassword({
                userId: req.auth.userId,
                currentPassword,
                newPassword,
            });
            return res.json(response);
        } catch (error) {
            return handleError(error, res);
        }
    });

    return router;
};
