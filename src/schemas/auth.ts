import { z } from 'zod';

/**
 * Strong-password rule mandated by the spec:
 *   - minimum 8 characters
 *   - at least one uppercase letter
 *   - at least one lowercase letter
 *   - at least one digit
 *
 * Error messages are i18n keys, looked up by the form layer.
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'validation.passwordTooShort' })
  .regex(/[A-Z]/, { message: 'validation.passwordWeak' })
  .regex(/[a-z]/, { message: 'validation.passwordWeak' })
  .regex(/[0-9]/, { message: 'validation.passwordWeak' });

export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: 'validation.emailInvalid' })
  .email({ message: 'validation.emailInvalid' })
  .toLowerCase();

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'validation.passwordTooShort' }),
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation.passwordsDoNotMatch',
    path: ['confirmPassword'],
  });

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
