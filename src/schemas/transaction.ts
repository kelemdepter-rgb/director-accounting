import { z } from 'zod';

import { parseLocaleAmount } from '@/utils/currency';

export const TRANSACTION_TYPES = ['income', 'expense'] as const;

const amountField = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'number' ? v : parseLocaleAmount(v)?.value ?? null))
    .refine((v): v is number => v !== null && v > 0, {
      message: 'validation.amountInvalid',
    }),
);

const currencyField = z
  .string()
  .trim()
  .toUpperCase()
  .length(3, { message: 'validation.currencyInvalid' });

export const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  contact_id: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  amount: amountField,
  currency: currencyField,
  description: z
    .string()
    .trim()
    .max(2000, { message: 'validation.tooLong' })
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type TransactionFormValues = z.input<typeof transactionSchema>;
export type TransactionValues = z.output<typeof transactionSchema>;
