import { z } from 'zod';

/**
 * Build a validator for an optional, trimmed text field with a max length.
 *
 * IMPORTANT: this validator is *idempotent*. The Round 1 version used
 * `z.string().trim().max().optional().transform(v => v || null)` which
 * worked when the form gave it a string, but blew up on the second parse
 * call (the screens re-parse `rawValues` after handleSubmit) because
 * `z.string()` rejects `null` — and the previous transform produces `null`
 * for blank fields. Symptom: "the form refuses to save unless all four
 * fields are filled." That is exactly the issue Round 2 is meant to fix.
 *
 * `preprocess` lets us accept `string | null | undefined` as input and
 * normalise to `string | null` before the trailing schema runs, so calling
 * the validator on its own output is safe.
 */
const trimmedNullable = (max: number) =>
  z.preprocess((v) => {
    if (v == null) return null;
    if (typeof v !== 'string') return v;
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed;
  }, z.string().max(max, { message: 'validation.tooLong' }).nullable());

/**
 * Contact form schema.
 *
 * The ONLY required field is `phone_number`: the user enters a person's
 * phone, optionally fills in a name, and we save. Everything else — name,
 * occupation, notes, service_type — is nullable in the DB (see migration
 * 012) and in this validator.
 *
 * Phone min length is 7 (shortest realistic dialable number), max 30 to
 * match the DB constraint in 001_initial_schema.sql.
 */
export const contactSchema = z
  .object({
    full_name: trimmedNullable(200),
    phone_number: z
      .string()
      .trim()
      .min(7, { message: 'validation.phoneInvalid' })
      .max(30, { message: 'validation.tooLong' })
      .regex(/^[+0-9 ()\-]+$/, { message: 'validation.phoneInvalid' }),
    occupation: trimmedNullable(200),
    notes: trimmedNullable(2000),
    service_type: z.preprocess(
      (v) => (v == null || v === '' ? null : v),
      z.enum(['vize', 'bilet', 'bilet_ve_vize', 'other']).nullable(),
    ),
    service_type_other: trimmedNullable(200),
  })
  // Mirror the DB CHECK from migration 016: the free-text label is
  // required when, and only when, the pill says "other". Surface the
  // error on the field so RHF can render it under the input.
  .superRefine((value, ctx) => {
    if (value.service_type === 'other' && !value.service_type_other) {
      ctx.addIssue({
        code: 'custom',
        path: ['service_type_other'],
        message: 'validation.serviceTypeOtherRequired',
      });
    }
    if (value.service_type !== 'other' && value.service_type_other) {
      // Defensive: if the user toggled away from "other" but the text
      // lingered, normalise to null rather than rejecting — RHF clears
      // the field client-side too.
      value.service_type_other = null;
    }
  });

export type ContactServiceType = 'vize' | 'bilet' | 'bilet_ve_vize' | 'other';

/**
 * Shape the form passes around while the user is typing. Because the
 * schema uses `z.preprocess`, `z.input<typeof contactSchema>` resolves to
 * `unknown` — useless for typing controlled inputs. Declare the input
 * shape explicitly instead and let the schema's runtime preprocessing
 * accept anything assignable to it.
 */
export interface ContactFormValues {
  full_name: string | null;
  phone_number: string;
  occupation: string | null;
  notes: string | null;
  service_type: ContactServiceType | null;
  service_type_other: string | null;
}

/** Shape returned by `contactSchema.parse(...)` — what the DB sees. */
export type ContactValues = z.output<typeof contactSchema>;
