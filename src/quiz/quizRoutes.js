import { Router } from 'express';
import { HttpError } from '../auth/authService.js';
import { createQuizRepository } from './quizRepository.js';
import { createQuizService } from './quizService.js';

export const createQuizRouter = ({
    db,
    authRequired,
    parseSubjectId,
    dailyQuizLimit,
}) => {
    const router = Router();
    const quizRepository = createQuizRepository(db);
    const quizService = createQuizService({
        db,
        quizRepository,
        parseSubjectId,
        dailyQuizLimit,
    });

    const handleError = (error, res) => {
        if (error instanceof HttpError) {
            const payload = { message: error.message };
            return res.status(error.status).json(payload);
        }
        return res.status(500).json(error);
    };

    router.get('/can-start/:subjectId', authRequired, async (req, res) => {
        try {
            const response = await quizService.getCanStartStatus(req.auth.userId, req.params.subjectId);
            return res.json(response);
        } catch (error) {
            return handleError(error, res);
        }
    });

    router.post('/finish', authRequired, async (req, res) => {
        try {
            const response = await quizService.finishQuiz({
                authUserId: req.auth.userId,
                userId: req.body?.userId,
                subjectId: req.body?.subjectId,
                score: req.body?.score,
                xpEarned: req.body?.xpEarned,
                questions: req.body?.questions,
            });
            return res.json(response);
        } catch (error) {
            if (error instanceof HttpError && error.status === 429) {
                const normalizedSubjectId = parseSubjectId(req.body?.subjectId);
                const attemptsToday = normalizedSubjectId
                    ? await quizRepository.getDailyAttemptsForSubject(req.body?.userId, normalizedSubjectId).catch(() => null)
                    : null;
                return res.status(429).json({
                    message: error.message,
                    attemptsToday,
                    dailyLimit: dailyQuizLimit,
                });
            }
            return handleError(error, res);
        }
    });

    return router;
};
