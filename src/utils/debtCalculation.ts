import { roundMoney, sumMoney, toNumber } from './currency';

export type DebtType = 'receivable' | 'payable';
export type DebtStatus = 'active' | 'settled';

export interface DebtLike {
  type: DebtType;
  status: DebtStatus;
  currency: string;
  principal_amount: number | string;
  remaining_amount?: number | string;
}

export interface PaymentLike {
  amount: number | string;
}

/**
 * Total of every payment applied to a debt.
 */
export function totalPaid(payments: readonly PaymentLike[]): number {
  return sumMoney(payments.map((p) => p.amount));
}

/**
 * Remaining (unpaid) portion of a debt, never below zero.
 */
export function remainingAmount(
  principal: number | string,
  payments: readonly PaymentLike[],
): number {
  const p = toNumber(principal);
  const paid = totalPaid(payments);
  return roundMoney(Math.max(0, p - paid));
}

/**
 * Whether the running payments meet or exceed the principal.
 */
export function isSettled(
  principal: number | string,
  payments: readonly PaymentLike[],
): boolean {
  return totalPaid(payments) + 1e-9 >= toNumber(principal);
}

/**
 * Fraction in [0, 1] representing how much of the principal has been paid.
 */
export function paymentProgress(
  principal: number | string,
  payments: readonly PaymentLike[],
): number {
  const p = toNumber(principal);
  if (p <= 0) return 1;
  const ratio = totalPaid(payments) / p;
  if (!Number.isFinite(ratio)) return 0;
  return Math.max(0, Math.min(1, ratio));
}

export type PaymentValidationFailure =
  | 'not_a_number'
  | 'not_positive'
  | 'too_many_decimals'
  | 'exceeds_remaining';

export interface PaymentValidationResult {
  valid: boolean;
  amount?: number;
  reason?: PaymentValidationFailure;
}

/**
 * Validate that a proposed payment is positive, has at most 2 decimal places,
 * and does not exceed the debt's remaining balance.
 */
export function validatePayment(
  rawAmount: number | string,
  principal: number | string,
  payments: readonly PaymentLike[],
): PaymentValidationResult {
  let amount: number;
  if (typeof rawAmount === 'string') {
    const normalised = rawAmount.trim().replace(',', '.');
    if (normalised === '' || !/^\d+(\.\d+)?$/.test(normalised)) {
      return { valid: false, reason: 'not_a_number' };
    }
    if (/^\d+\.\d{3,}$/.test(normalised)) {
      return { valid: false, reason: 'too_many_decimals' };
    }
    amount = Number(normalised);
  } else {
    if (!Number.isFinite(rawAmount)) return { valid: false, reason: 'not_a_number' };
    amount = rawAmount;
    if (Math.round(amount * 100) !== amount * 100) {
      return { valid: false, reason: 'too_many_decimals' };
    }
  }
  if (amount <= 0) return { valid: false, reason: 'not_positive' };

  const remaining = remainingAmount(principal, payments);
  // Allow a tiny epsilon for floating-point comparison at the boundary.
  if (amount > remaining + 1e-9) return { valid: false, reason: 'exceeds_remaining' };

  return { valid: true, amount: roundMoney(amount) };
}

export interface CurrencyTotals {
  /** Sum of remaining_amount for active receivable debts. */
  receivable: number;
  /** Sum of remaining_amount for active payable debts. */
  payable: number;
  /** receivable - payable (positive means net owed TO you in this currency). */
  net: number;
}

/**
 * Group active debts by currency and sum the remaining balance per side.
 * Settled debts are excluded; partially-paid debts contribute their remainder.
 *
 * Keys in the returned record are currency codes (e.g. 'USD', 'CNY').
 */
export function aggregateOutstandingByCurrency(
  debts: readonly DebtLike[],
): Record<string, CurrencyTotals> {
  const acc: Record<string, CurrencyTotals> = {};

  for (const d of debts) {
    if (d.status === 'settled') continue;
    const remaining =
      d.remaining_amount !== undefined
        ? toNumber(d.remaining_amount)
        : toNumber(d.principal_amount);
    if (remaining <= 0) continue;
    const slot = acc[d.currency] ?? { receivable: 0, payable: 0, net: 0 };
    if (d.type === 'receivable') {
      slot.receivable = roundMoney(slot.receivable + remaining);
    } else {
      slot.payable = roundMoney(slot.payable + remaining);
    }
    slot.net = roundMoney(slot.receivable - slot.payable);
    acc[d.currency] = slot;
  }

  return acc;
}

export interface ContactCashflowLike {
  type: 'income' | 'expense';
  currency: string;
  amount: number | string;
  /** Auto-generated rows (debt-creation / payment mirrors) are excluded from
   *  the running balance because the debt's own remaining_amount already
   *  reflects them. Only manual cash movements should bump the totals. */
  auto_generated: boolean;
}

/**
 * Per-currency balance for a single contact, combining open debts with manual
 * cash movements (rows the user entered by hand, not the ones the system
 * mirrors from debt creation or payment recording).
 *
 * Round 3 §5 flipped the cash flow direction from the convention introduced
 * by Round 1's fc596ab:
 *
 *   cash_in  ("they paid me")   reduces receivable; overflow → payable.
 *   cash_out ("I paid them")    reduces payable;    overflow → receivable.
 *
 * The "gross" side already accounts for partial payments tracked via
 * record_debt_payment (which writes an auto_generated mirror transaction
 * we explicitly exclude here). So manual cash flows behave the same way
 * regardless of whether they were recorded as free-form transactions or
 * formal debt payments — both reduce the matching side.
 *
 * The SQL view `v_contact_balance` (migration 017) computes the same
 * thing on the server. Tests pin the matrix from R3 §5.5 so the two
 * implementations cannot drift.
 */
export function aggregateContactBalance(
  debts: readonly DebtLike[],
  transactions: readonly ContactCashflowLike[],
): Record<string, CurrencyTotals> {
  // Per-currency gross debt totals (already net of formal debt_payments).
  const grossRec: Record<string, number> = {};
  const grossPay: Record<string, number> = {};
  for (const d of debts) {
    if (d.status === 'settled') continue;
    const remaining =
      d.remaining_amount !== undefined
        ? toNumber(d.remaining_amount)
        : toNumber(d.principal_amount);
    if (remaining <= 0) continue;
    if (d.type === 'receivable') {
      grossRec[d.currency] = roundMoney((grossRec[d.currency] ?? 0) + remaining);
    } else {
      grossPay[d.currency] = roundMoney((grossPay[d.currency] ?? 0) + remaining);
    }
  }

  // Per-currency manual cash movements. auto_generated rows mirror debt
  // payments and are already reflected in remaining_amount above —
  // counting them again would over-net.
  const paidIn: Record<string, number> = {};
  const paidOut: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.auto_generated) continue;
    const amount = toNumber(tx.amount);
    if (amount <= 0) continue;
    if (tx.type === 'income') {
      paidIn[tx.currency] = roundMoney((paidIn[tx.currency] ?? 0) + amount);
    } else {
      paidOut[tx.currency] = roundMoney((paidOut[tx.currency] ?? 0) + amount);
    }
  }

  const currencies = new Set<string>([
    ...Object.keys(grossRec),
    ...Object.keys(grossPay),
    ...Object.keys(paidIn),
    ...Object.keys(paidOut),
  ]);

  const acc: Record<string, CurrencyTotals> = {};
  for (const currency of currencies) {
    const rawRec = (grossRec[currency] ?? 0) - (paidIn[currency] ?? 0);
    const rawPay = (grossPay[currency] ?? 0) - (paidOut[currency] ?? 0);

    // Collapse: a negative raw side means the user has overpaid in that
    // direction; the excess spills onto the opposite side. If both raw
    // sides are negative the user has overpaid in both directions, which
    // swaps them. Verified in the matrix test at __tests__/debtCalculation.
    const receivable = roundMoney(Math.max(0, rawRec) + Math.max(0, -rawPay));
    const payable = roundMoney(Math.max(0, rawPay) + Math.max(0, -rawRec));
    const net = roundMoney(receivable - payable);

    // Skip currencies where both sides round to zero — they contribute
    // nothing visible to the UI.
    if (receivable < 0.005 && payable < 0.005) continue;
    acc[currency] = { receivable, payable, net };
  }

  return acc;
}
