import { z } from 'zod';

import { parseUserAmount } from '@/utils/currency';

export const DEBT_TYPES = ['receivable', 'payable'] as const;

const amountField = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'number' ? v : parseUserAmount(v)))
    .refine((v): v is number => v !== null && v > 0, {
      message: 'validation.amountInvalid',
    }),
);

const currencyField = z
  .string()
  .trim()
  .toUpperCase()
  .length(3, { message: 'validation.currencyInvalid' });

export const debtSchema = z.object({
  type: z.enum(DEBT_TYPES),
  contact_id: z.string().uuid({ message: 'validation.contactRequired' }),
  principal_amount: amountField,
  currency: currencyField,
  description: z
    .string()
    .trim()
    .max(2000, { message: 'validation.tooLong' })
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const debtPaymentSchema = z.object({
  amount: amountField,
  note: z
    .string()
    .trim()
    .max(500, { message: 'validation.tooLong' })
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type DebtFormValues = z.input<typeof debtSchema>;
export type DebtValues = z.output<typeof debtSchema>;
export type DebtPaymentFormValues = z.input<typeof debtPaymentSchema>;
export type DebtPaymentValues = z.output<typeof debtPaymentSchema>;
