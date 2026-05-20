import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';

interface ZodLikeIssue {
  path: PropertyKey[];
  message: string;
  code: string;
}

interface ZodLikeSchema<Out> {
  safeParseAsync(input: unknown): Promise<
    | { success: true; data: Out }
    | { success: false; error: { issues: readonly ZodLikeIssue[] } }
  >;
}

/**
 * Drop-in replacement for @hookform/resolvers/zod that understands Zod v4.
 *
 * The shipped resolver (@hookform/resolvers@3.10) checks `err.errors` to
 * decide whether to format a thrown error as validation messages. Zod v4
 * renamed that property to `err.issues`, so the resolver re-throws instead
 * of returning errors — react-hook-form's submit silently rejects, no
 * error label ever appears, and the user thinks the form is broken.
 * This is the second root cause behind Round 2's "Yeni Kişi form refuses
 * to save" regression; see schemas/contact.ts for the first one (double
 * parse).
 *
 * - Calls `safeParseAsync` so a Zod failure does NOT throw.
 * - Walks each issue's `.path` to build the nested error tree RHF expects.
 * - On success, returns the transformed `data` as `values` so `handleSubmit`
 *   hands the consumer the parsed shape, not the raw input.
 */
export function zodResolver<TInput extends FieldValues, TOutput>(
  schema: ZodLikeSchema<TOutput>,
): Resolver<TInput, unknown, TOutput> {
  return (async (rawValues: TInput) => {
    const result = await schema.safeParseAsync(rawValues);
    if (result.success) {
      return {
        values: result.data,
        errors: {},
      };
    }

    const errors: FieldErrors = {};
    for (const issue of result.error.issues) {
      let cursor: Record<string, unknown> = errors as Record<string, unknown>;
      for (let i = 0; i < issue.path.length - 1; i += 1) {
        const key = String(issue.path[i]);
        if (typeof cursor[key] !== 'object' || cursor[key] === null) {
          cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
      }
      const leaf = String(issue.path[issue.path.length - 1] ?? '');
      if (cursor[leaf] == null) {
        cursor[leaf] = { type: issue.code, message: issue.message };
      }
    }

    return {
      values: {},
      errors,
    };
  }) as Resolver<TInput, unknown, TOutput>;
}
