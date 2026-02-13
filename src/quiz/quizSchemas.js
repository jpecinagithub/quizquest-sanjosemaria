import { z } from 'zod';

export const canStartParamsSchema = z.object({
    subjectId: z.coerce.number().int().positive(),
});

const questionSchema = z.object({
    text: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).length(4),
    correctAnswerIndex: z.number().int().min(0).max(3),
    explanation: z.string().optional().nullable(),
});

export const finishQuizBodySchema = z.object({
    userId: z.coerce.number().int().positive(),
    subjectId: z.coerce.number().int().positive(),
    score: z.number(),
    xpEarned: z.number(),
    questions: z.array(questionSchema).optional(),
});
