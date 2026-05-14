import { describe, expect, it } from 'vitest';

import {
  aggregateOutstandingByCurrency,
  isSettled,
  paymentProgress,
  remainingAmount,
  totalPaid,
  validatePayment,
  type DebtLike,
} from '@/utils/debtCalculation';

describe('totalPaid', () => {
  it('returns 0 for an empty payment list', () => {
    expect(totalPaid([])).toBe(0);
  });

  it('sums numeric amounts', () => {
    expect(totalPaid([{ amount: 100 }, { amount: 50.5 }])).toBe(150.5);
  });

  it('sums string amounts (PostgREST numeric)', () => {
    expect(totalPaid([{ amount: '100.00' }, { amount: '50.50' }])).toBe(150.5);
  });

  it('avoids floating-point drift on classic 0.1+0.2 case', () => {
    expect(totalPaid([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3);
  });
});

describe('remainingAmount', () => {
  it('returns the full principal when nothing is paid', () => {
    expect(remainingAmount(500, [])).toBe(500);
  });

  it('subtracts payments correctly', () => {
    expect(remainingAmount(500, [{ amount: 200 }])).toBe(300);
    expect(remainingAmount(500, [{ amount: 200 }, { amount: 50 }])).toBe(250);
  });

  it('never returns negative even when overpaid', () => {
    expect(remainingAmount(100, [{ amount: 150 }])).toBe(0);
  });

  it('handles string principal and string payments', () => {
    expect(remainingAmount('500.00', [{ amount: '200.50' }])).toBe(299.5);
  });
});

describe('isSettled', () => {
  it('false for partial', () => {
    expect(isSettled(500, [{ amount: 200 }])).toBe(false);
  });

  it('true when total equals principal', () => {
    expect(isSettled(500, [{ amount: 200 }, { amount: 300 }])).toBe(true);
  });

  it('true when overpaid', () => {
    expect(isSettled(500, [{ amount: 600 }])).toBe(true);
  });

  it('handles 0.1+0.2 boundary without false negative', () => {
    expect(isSettled(0.3, [{ amount: 0.1 }, { amount: 0.2 }])).toBe(true);
  });
});

describe('paymentProgress', () => {
  it('returns 0 with no payments', () => {
    expect(paymentProgress(100, [])).toBe(0);
  });

  it('returns 0.5 when half paid', () => {
    expect(paymentProgress(100, [{ amount: 50 }])).toBe(0.5);
  });

  it('clamps to 1 when overpaid', () => {
    expect(paymentProgress(100, [{ amount: 200 }])).toBe(1);
  });

  it('returns 1 for zero or negative principal (degenerate)', () => {
    expect(paymentProgress(0, [{ amount: 10 }])).toBe(1);
    expect(paymentProgress(-5, [])).toBe(1);
  });
});

describe('validatePayment', () => {
  const principal = 500;
  const noPayments: { amount: number }[] = [];

  it('rejects empty / non-numeric strings', () => {
    expect(validatePayment('', principal, noPayments).valid).toBe(false);
    expect(validatePayment('abc', principal, noPayments).valid).toBe(false);
  });

  it('rejects zero and negative', () => {
    expect(validatePayment(0, principal, noPayments)).toEqual({
      valid: false,
      reason: 'not_positive',
    });
    expect(validatePayment(-50, principal, noPayments)).toEqual({
      valid: false,
      reason: 'not_positive',
    });
  });

  it('rejects more than 2 decimals', () => {
    expect(validatePayment('10.123', principal, noPayments).reason).toBe('too_many_decimals');
    expect(validatePayment(10.123, principal, noPayments).reason).toBe('too_many_decimals');
  });

  it('rejects amount that exceeds remaining', () => {
    expect(validatePayment(600, principal, noPayments).reason).toBe('exceeds_remaining');
    expect(validatePayment(400, principal, [{ amount: 200 }]).reason).toBe('exceeds_remaining');
  });

  it('accepts a valid partial payment', () => {
    expect(validatePayment(200, principal, noPayments)).toEqual({ valid: true, amount: 200 });
  });

  it('accepts payment that exactly clears the debt', () => {
    expect(validatePayment(300, principal, [{ amount: 200 }])).toEqual({
      valid: true,
      amount: 300,
    });
  });

  it('accepts comma-decimal strings', () => {
    expect(validatePayment('199,50', principal, noPayments)).toEqual({
      valid: true,
      amount: 199.5,
    });
  });
});

describe('aggregateOutstandingByCurrency', () => {
  const debts: DebtLike[] = [
    {
      type: 'receivable',
      status: 'active',
      currency: 'USD',
      principal_amount: 500,
      remaining_amount: 300,
    },
    {
      type: 'receivable',
      status: 'active',
      currency: 'USD',
      principal_amount: 200,
      remaining_amount: 200,
    },
    {
      type: 'payable',
      status: 'active',
      currency: 'USD',
      principal_amount: 150,
      remaining_amount: 100,
    },
    {
      type: 'receivable',
      status: 'active',
      currency: 'CNY',
      principal_amount: 1000,
      remaining_amount: 1000,
    },
    {
      type: 'payable',
      status: 'active',
      currency: 'CNY',
      principal_amount: 1500,
      remaining_amount: 1500,
    },
    {
      // Settled debts must be ignored entirely.
      type: 'receivable',
      status: 'settled',
      currency: 'USD',
      principal_amount: 9999,
      remaining_amount: 0,
    },
  ];

  it('groups by currency and splits by side', () => {
    const result = aggregateOutstandingByCurrency(debts);
    expect(result.USD).toEqual({ receivable: 500, payable: 100, net: 400 });
    expect(result.CNY).toEqual({ receivable: 1000, payable: 1500, net: -500 });
  });

  it('skips settled debts and zero-remaining rows', () => {
    const result = aggregateOutstandingByCurrency(debts);
    expect(result).not.toHaveProperty('settled');
    // USD net is 400, NOT including the 9999 settled receivable.
    expect(result.USD?.net).toBe(400);
  });

  it('falls back to principal_amount when remaining_amount is missing', () => {
    const r = aggregateOutstandingByCurrency([
      { type: 'receivable', status: 'active', currency: 'EUR', principal_amount: 250 },
    ]);
    expect(r.EUR).toEqual({ receivable: 250, payable: 0, net: 250 });
  });

  it('returns an empty object for an empty list', () => {
    expect(aggregateOutstandingByCurrency([])).toEqual({});
  });
});
