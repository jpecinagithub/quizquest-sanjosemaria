import { z } from 'zod';

const optionalText = z.string().trim().max(5000).optional().nullable();

export const subjectIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const createSubjectBodySchema = z.object({
    name: z.string().trim().min(1, 'name es obligatorio').max(100),
    description: optionalText,
    image_url: z.string().trim().url().optional().nullable(),
    activo: z.boolean().optional(),
});

export const updateSubjectBodySchema = z.object({
    name: z.string().trim().min(1, 'name es obligatorio').max(100),
    description: optionalText,
    image_url: z.string().trim().url().optional().nullable(),
    activo: z.boolean().optional(),
});

export const uploadSubjectImageBodySchema = z.object({
    imageData: z
        .string()
        .regex(
            /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i,
            'Formato de imagen no valido. Usa PNG, JPG/JPEG o WEBP.'
        ),
});
