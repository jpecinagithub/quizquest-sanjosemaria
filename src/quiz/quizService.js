import { HttpError } from '../auth/authService.js';
import { beginTransactionAsync, commitAsync, rollbackAsync } from '../common/db.js';

export const createQuizService = ({
    db,
    quizRepository,
    parseSubjectId,
    dailyQuizLimit,
}) => ({
    async getCanStartStatus(authUserId, subjectIdRaw) {
        const subjectId = parseSubjectId(subjectIdRaw);
        if (!subjectId) throw new HttpError(400, 'subjectId invalido');

        const attemptsToday = await quizRepository.getDailyAttemptsForSubject(authUserId, subjectId);
        const allowed = attemptsToday < dailyQuizLimit;
        return {
            allowed,
            attemptsToday,
            dailyLimit: dailyQuizLimit,
            remaining: Math.max(0, dailyQuizLimit - attemptsToday),
        };
    },

    validateFinishPayload({ authUserId, userId, subjectId, score, xpEarned, questions }) {
        const normalizedSubjectId = parseSubjectId(subjectId);
        if (!userId || !normalizedSubjectId || typeof score !== 'number' || typeof xpEarned !== 'number') {
            throw new HttpError(400, 'Body invalido para guardar resultado');
        }
        if (Number(userId) !== Number(authUserId)) {
            throw new HttpError(403, 'No autorizado para guardar resultados de otro usuario');
        }
        if (questions !== undefined && !Array.isArray(questions)) {
            throw new HttpError(400, 'questions debe ser un array');
        }
        return { normalizedSubjectId };
    },

    sanitizeQuestions(questions) {
        return (questions || []).map((question) => ({
            text: typeof question?.text === 'string' ? question.text.trim() : '',
            options: Array.isArray(question?.options) ? question.options.slice(0, 4).map((option) => String(option ?? '')) : [],
            correctAnswerIndex: Number(question?.correctAnswerIndex),
            explanation: typeof question?.explanation === 'string' ? question.explanation : null,
        }));
    },

    assertQuestionsValid(sanitizedQuestions) {
        const hasInvalidQuestion = sanitizedQuestions.some((question) => (
            !question.text ||
            question.options.length !== 4 ||
            question.options.some((option) => option.trim().length === 0) ||
            !Number.isInteger(question.correctAnswerIndex) ||
            question.correctAnswerIndex < 0 ||
            question.correctAnswerIndex > 3
        ));
        if (hasInvalidQuestion) {
            throw new HttpError(400, 'Formato de questions invalido. Cada pregunta debe tener texto, 4 opciones y correctAnswerIndex entre 0 y 3.');
        }
    },

    async finishQuiz({ authUserId, userId, subjectId, score, xpEarned, questions }) {
        const { normalizedSubjectId } = this.validateFinishPayload({
            authUserId,
            userId,
            subjectId,
            score,
            xpEarned,
            questions,
        });

        const attemptsToday = await quizRepository.getDailyAttemptsForSubject(userId, normalizedSubjectId);
        if (attemptsToday >= dailyQuizLimit) {
            throw new HttpError(429, 'Has superado el numero de test diarios para esta asignatura.');
        }

        const sanitizedQuestions = this.sanitizeQuestions(questions);
        this.assertQuestionsValid(sanitizedQuestions);

        try {
            await beginTransactionAsync(db);
            await quizRepository.insertQuizResult(userId, normalizedSubjectId, score, xpEarned);
            await quizRepository.updateUserXp(userId, xpEarned);

            for (const question of sanitizedQuestions) {
                await quizRepository.insertQuestion({
                    subjectId: normalizedSubjectId,
                    text: question.text,
                    options: question.options,
                    correctAnswerIndex: question.correctAnswerIndex,
                    explanation: question.explanation,
                });
            }

            await commitAsync(db);
            if (!sanitizedQuestions.length) {
                return { success: true, message: 'Resultado guardado y XP actualizado' };
            }
            return { success: true, message: 'Resultado guardado, XP actualizado y preguntas registradas' };
        } catch (error) {
            await rollbackAsync(db);
            throw error;
        }
    },
});
