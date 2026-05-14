import { z } from 'zod';

const trimmedNullable = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: 'validation.tooLong' })
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

export const contactSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, { message: 'validation.required' })
    .max(200, { message: 'validation.tooLong' }),
  phone_number: z
    .string()
    .trim()
    .max(30, { message: 'validation.tooLong' })
    .optional()
    .transform((v) => (v && v.length >= 3 ? v : v && v.length === 0 ? null : v ?? null))
    .refine(
      (v) => v === null || (typeof v === 'string' && v.length >= 3 && v.length <= 30),
      { message: 'validation.phoneInvalid' },
    ),
  occupation: trimmedNullable(200),
  notes: trimmedNullable(2000),
});

export type ContactFormValues = z.input<typeof contactSchema>;
export type ContactValues = z.output<typeof contactSchema>;
