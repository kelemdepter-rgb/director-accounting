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
 *   receivable side = Σ active receivable remaining + Σ manual income
 *   payable side    = Σ active payable    remaining + Σ manual expense
 *
 * The "remaining" side already accounts for partial payments via
 * debts_with_balance.remaining_amount, so a partial payback shrinks the
 * receivable principal directly. Free-form cash inflows the user logged
 * without tying them to a specific debt still need to land somewhere, and
 * the convention in this app is: income from a contact widens the
 * receivable column, expense to a contact widens the payable column.
 */
export function aggregateContactBalance(
  debts: readonly DebtLike[],
  transactions: readonly ContactCashflowLike[],
): Record<string, CurrencyTotals> {
  const acc = aggregateOutstandingByCurrency(debts);

  for (const tx of transactions) {
    if (tx.auto_generated) continue;
    const amount = toNumber(tx.amount);
    if (amount <= 0) continue;
    const slot = acc[tx.currency] ?? { receivable: 0, payable: 0, net: 0 };
    if (tx.type === 'income') {
      slot.receivable = roundMoney(slot.receivable + amount);
    } else {
      slot.payable = roundMoney(slot.payable + amount);
    }
    slot.net = roundMoney(slot.receivable - slot.payable);
    acc[tx.currency] = slot;
  }

  return acc;
}
