import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { HttpError } from '../auth/authService.js';
import { createSubjectsRepository } from './subjectsRepository.js';
import { createSubjectsService } from './subjectsService.js';

const imageDataPattern = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i;

const createDeps = ({ db, parseSubjectId }) => {
    const subjectsRepository = createSubjectsRepository(db);
    const subjectsService = createSubjectsService({ subjectsRepository, parseSubjectId });
    return { subjectsRepository, subjectsService };
};

const handleError = (error, res) => {
    if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message });
    }
    return res.status(500).json(error);
};

export const createPublicSubjectsRouter = ({
    db,
    authRequired,
    parseSubjectId,
}) => {
    const router = Router();
    const { subjectsService } = createDeps({ db, parseSubjectId });

    router.get('/', authRequired, async (req, res) => {
        try {
            const data = await subjectsService.listActiveSubjectsWithProgress(req.auth.userId);
            return res.json(data);
        } catch (error) {
            return handleError(error, res);
        }
    });

    return router;
};

export const createAdminSubjectsRouter = ({
    db,
    authRequired,
    adminRequired,
    parseSubjectId,
}) => {
    const router = Router();
    const { subjectsRepository, subjectsService } = createDeps({ db, parseSubjectId });

    router.get('/', authRequired, adminRequired, async (req, res) => {
        try {
            const data = await subjectsService.listAdminSubjects();
            return res.json(data);
        } catch (error) {
            return handleError(error, res);
        }
    });

    router.post('/', authRequired, adminRequired, async (req, res) => {
        try {
            const response = await subjectsService.createSubject(req.body);
            return res.status(201).json(response);
        } catch (error) {
            return handleError(error, res);
        }
    });

    router.put('/:id', authRequired, adminRequired, async (req, res) => {
        try {
            const response = await subjectsService.updateSubject(req.params.id, req.body);
            return res.json({ success: true, message: response.message });
        } catch (error) {
            return handleError(error, res);
        }
    });

    router.post('/:id/image', authRequired, adminRequired, async (req, res) => {
        const { imageData } = req.body || {};
        if (!imageData || typeof imageData !== 'string') {
            return res.status(400).json({ message: 'imageData es requerido' });
        }

        let subjectId;
        try {
            subjectId = subjectsService.parseAndValidateSubjectId(req.params.id);
        } catch (error) {
            return handleError(error, res);
        }

        const match = imageData.match(imageDataPattern);
        if (!match) {
            return res.status(400).json({ message: 'Formato de imagen no valido. Usa PNG, JPG/JPEG o WEBP.' });
        }

        const format = match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
        const extByFormat = { png: 'png', jpeg: 'jpg', webp: 'webp' };
        const ext = extByFormat[format] || 'jpg';
        const buffer = Buffer.from(match[2], 'base64');
        const maxSizeBytes = 300 * 1024;

        if (!buffer.length) return res.status(400).json({ message: 'La imagen esta vacia' });
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

        try {
            const subject = await subjectsRepository.findSubjectById(subjectId);
            if (!subject) return res.status(404).json({ message: 'Asignatura no encontrada' });

            await subjectsRepository.updateSubjectImage(subjectId, publicUrl);

            let oldPath = subject.image_url;
            if (typeof oldPath === 'string' && oldPath.startsWith('http')) {
                try {
                    oldPath = new URL(oldPath).pathname;
                } catch {
                    oldPath = subject.image_url;
                }
            }

            if (oldPath && typeof oldPath === 'string' && oldPath.startsWith('/images/subjects/')) {
                const oldFilePath = path.join(subjectsImagesDir, oldPath.replace('/images/subjects/', ''));
                if (fs.existsSync(oldFilePath)) {
                    try {
                        fs.unlinkSync(oldFilePath);
                    } catch {
                        // Ignore old file deletion issues.
                    }
                }
            }

            return res.json({ success: true, image_url: publicUrl });
        } catch (error) {
            return handleError(error, res);
        }
    });

    router.delete('/:id', authRequired, adminRequired, async (req, res) => {
        try {
            const response = await subjectsService.deactivateSubject(req.params.id);
            return res.json(response);
        } catch (error) {
            return handleError(error, res);
        }
    });

    return router;
};
