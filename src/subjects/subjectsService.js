import { HttpError } from '../auth/authService.js';

export const createSubjectsService = ({ subjectsRepository, parseSubjectId }) => ({
    listAdminSubjects() {
        return subjectsRepository.listAdminSubjects();
    },

    async createSubject(body) {
        const { name, description, image_url, activo } = body || {};
        if (!name) throw new HttpError(400, 'name es obligatorio');

        const result = await subjectsRepository.createSubject({
            name: String(name).trim(),
            description: description || null,
            imageUrl: image_url || null,
            activo: activo === false ? 0 : 1,
        });
        return { success: true, message: 'Asignatura creada', id: Number(result.insertId) };
    },

    async updateSubject(subjectIdRaw, body) {
        const subjectId = parseSubjectId(subjectIdRaw);
        const { name, description, image_url, activo } = body || {};

        if (!subjectId) throw new HttpError(400, 'id de asignatura invalido');
        if (!name) throw new HttpError(400, 'name es obligatorio');

        const result = await subjectsRepository.updateSubject({
            subjectId,
            name: String(name).trim(),
            description: description || null,
            imageUrl: image_url || null,
            activo: activo === false ? 0 : 1,
        });
        if (!result.affectedRows) throw new HttpError(404, 'Asignatura no encontrada');

        return { success: true, message: 'Asignatura actualizada', subjectId };
    },

    async deactivateSubject(subjectIdRaw) {
        const subjectId = parseSubjectId(subjectIdRaw);
        if (!subjectId) throw new HttpError(400, 'id de asignatura invalido');

        const result = await subjectsRepository.deactivateSubject(subjectId);
        if (result.affectedRows > 0) {
            return { success: true, message: 'Asignatura desactivada' };
        }
        const subject = await subjectsRepository.findSubjectById(subjectId);
        if (!subject) throw new HttpError(404, 'Asignatura no encontrada');
        return { success: true, message: 'Asignatura ya estaba desactivada' };
    },

    listActiveSubjectsWithProgress(userId) {
        return subjectsRepository.listActiveSubjectsWithProgress(userId);
    },

    parseAndValidateSubjectId(subjectIdRaw) {
        const subjectId = parseSubjectId(subjectIdRaw);
        if (!subjectId) throw new HttpError(400, 'id de asignatura invalido');
        return subjectId;
    },
});
