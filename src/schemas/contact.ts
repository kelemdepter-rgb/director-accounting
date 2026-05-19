import { z } from 'zod';

const trimmedNullable = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: 'validation.tooLong' })
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

/**
 * Contact form schema.
 *
 * Per spec the ONLY required field is `phone_number`: the user enters a
 * person's phone, optionally fills in a name, and we save. Everything else
 * — name, occupation, notes, service_type — is nullable both in the DB
 * (see migration 012) and in this validator.
 *
 * Phone must look phone-y: 3..30 characters of digits / spaces / + - ( ).
 */
export const contactSchema = z.object({
  full_name: trimmedNullable(200),
  phone_number: z
    .string()
    .trim()
    .min(3, { message: 'validation.phoneInvalid' })
    .max(30, { message: 'validation.tooLong' })
    .regex(/^[+0-9 ()\-]+$/, { message: 'validation.phoneInvalid' }),
  occupation: trimmedNullable(200),
  notes: trimmedNullable(2000),
  service_type: z
    .enum(['vize', 'bilet', 'bilet_ve_vize'])
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});

export type ContactFormValues = z.input<typeof contactSchema>;
export type ContactValues = z.output<typeof contactSchema>;
export type ContactServiceType = 'vize' | 'bilet' | 'bilet_ve_vize';
