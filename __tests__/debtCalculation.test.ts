import { describe, expect, it } from 'vitest';

import {
  aggregateContactBalance,
  aggregateOutstandingByCurrency,
  isSettled,
  paymentProgress,
  remainingAmount,
  totalPaid,
  validatePayment,
  type ContactCashflowLike,
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

describe('aggregateContactBalance', () => {
  it('matches the prompt example: lend 15k alacak + borç 20k + manual cash movements', () => {
    // From the spec: a contact with TRY 20,000 borç (payable) and TRY 15,000
    // alacak (receivable), plus a manual cash inflow of TRY 2,358 and a
    // manual cash outflow of TRY 2,385. Auto-generated mirrors of the debt
    // creation MUST be ignored so they don't double-count.
    const debts: DebtLike[] = [
      {
        type: 'receivable',
        status: 'active',
        currency: 'TRY',
        principal_amount: 15000,
        remaining_amount: 15000,
      },
      {
        type: 'payable',
        status: 'active',
        currency: 'TRY',
        principal_amount: 20000,
        remaining_amount: 20000,
      },
    ];
    const transactions: ContactCashflowLike[] = [
      { type: 'income', currency: 'TRY', amount: 2358, auto_generated: false },
      { type: 'expense', currency: 'TRY', amount: 2385, auto_generated: false },
      // These ones came from the create_debt_with_cashflow RPC. They must NOT
      // bump the totals because the debt rows already represent them.
      { type: 'expense', currency: 'TRY', amount: 15000, auto_generated: true },
      { type: 'income', currency: 'TRY', amount: 20000, auto_generated: true },
    ];

    const result = aggregateContactBalance(debts, transactions);
    // Round 3 §5 flipped the cash flow direction:
    //   gross_rec=15000, gross_pay=20000
    //   paid_in=2358 (reduces receivable), paid_out=2385 (reduces payable)
    //   raw_rec = 15000 - 2358 = 12642
    //   raw_pay = 20000 - 2385 = 17615
    expect(result.TRY).toEqual({
      receivable: 12642,
      payable: 17615,
      net: -4973,
    });
  });

  it('ignores auto-generated rows entirely', () => {
    const debts: DebtLike[] = [
      {
        type: 'receivable',
        status: 'active',
        currency: 'USD',
        principal_amount: 100,
        remaining_amount: 100,
      },
    ];
    const noManual = aggregateContactBalance(debts, [
      { type: 'income', currency: 'USD', amount: 30, auto_generated: true },
      { type: 'expense', currency: 'USD', amount: 50, auto_generated: true },
    ]);
    expect(noManual.USD).toEqual({ receivable: 100, payable: 0, net: 100 });
  });

  it('handles per-currency segregation under the new arithmetic', () => {
    const result = aggregateContactBalance(
      [
        {
          type: 'receivable',
          status: 'active',
          currency: 'USD',
          principal_amount: 100,
          remaining_amount: 100,
        },
      ],
      [
        // EUR income with no EUR debt: raw_rec = 0 - 40 = -40, raw_pay = 0.
        // Overflow flips: receivable=0, payable=40.
        { type: 'income', currency: 'EUR', amount: 40, auto_generated: false },
        // USD expense reduces payable (which is 0), overflows into receivable:
        // raw_rec = 100, raw_pay = 0 - 25 = -25 → receivable=100+25=125, payable=0.
        { type: 'expense', currency: 'USD', amount: 25, auto_generated: false },
      ],
    );
    expect(result.USD).toEqual({ receivable: 125, payable: 0, net: 125 });
    expect(result.EUR).toEqual({ receivable: 0, payable: 40, net: -40 });
  });

  it('an unmatched cash_in with no debt creates payable, not receivable', () => {
    // The Round-3 inversion: receiving money you weren't owed conceptually
    // puts you in debt to that person, not in credit.
    const result = aggregateContactBalance(
      [],
      [{ type: 'income', currency: 'CNY', amount: '125.50', auto_generated: false }],
    );
    expect(result.CNY).toEqual({ receivable: 0, payable: 125.5, net: -125.5 });
  });

  it('skips zero / negative manual amounts', () => {
    const result = aggregateContactBalance([], [
      { type: 'income', currency: 'USD', amount: 0, auto_generated: false },
      { type: 'expense', currency: 'USD', amount: -10, auto_generated: false },
    ]);
    expect(result).toEqual({});
  });
});

describe('aggregateContactBalance — R3 §5.5 step-by-step matrix', () => {
  // Pinpoints the user's source-of-truth matrix. Each step is the
  // cumulative state after applying the action. The SQL view in
  // migration 017 mirrors this; if either drifts, both tests catch it.
  type Step = {
    label: string;
    debts: DebtLike[];
    transactions: ContactCashflowLike[];
    expected: { receivable: number; payable: number };
  };

  const STEPS: Step[] = [
    {
      label: 'Step 1 — alacak 20k → (20k, 0)',
      debts: [
        {
          type: 'receivable',
          status: 'active',
          currency: 'TRY',
          principal_amount: 20000,
          remaining_amount: 20000,
        },
      ],
      transactions: [],
      expected: { receivable: 20000, payable: 0 },
    },
    {
      label: 'Step 2 — + borç 15k → (20k, 15k)',
      debts: [
        {
          type: 'receivable',
          status: 'active',
          currency: 'TRY',
          principal_amount: 20000,
          remaining_amount: 20000,
        },
        {
          type: 'payable',
          status: 'active',
          currency: 'TRY',
          principal_amount: 15000,
          remaining_amount: 15000,
        },
      ],
      transactions: [],
      expected: { receivable: 20000, payable: 15000 },
    },
    {
      label: 'Step 3 — + cash_in 5k → (15k, 15k)',
      debts: [
        {
          type: 'receivable',
          status: 'active',
          currency: 'TRY',
          principal_amount: 20000,
          remaining_amount: 20000,
        },
        {
          type: 'payable',
          status: 'active',
          currency: 'TRY',
          principal_amount: 15000,
          remaining_amount: 15000,
        },
      ],
      transactions: [
        { type: 'income', currency: 'TRY', amount: 5000, auto_generated: false },
      ],
      expected: { receivable: 15000, payable: 15000 },
    },
    {
      label: 'Step 4 — + cash_out 3k → (15k, 12k)',
      debts: [
        {
          type: 'receivable',
          status: 'active',
          currency: 'TRY',
          principal_amount: 20000,
          remaining_amount: 20000,
        },
        {
          type: 'payable',
          status: 'active',
          currency: 'TRY',
          principal_amount: 15000,
          remaining_amount: 15000,
        },
      ],
      transactions: [
        { type: 'income', currency: 'TRY', amount: 5000, auto_generated: false },
        { type: 'expense', currency: 'TRY', amount: 3000, auto_generated: false },
      ],
      expected: { receivable: 15000, payable: 12000 },
    },
    {
      label: 'Step 5 — + another cash_in 30k → (0, 27k) [overflow]',
      // paid_in total = 5k + 30k = 35k; paid_out = 3k.
      // raw_rec = 20k - 35k = -15k; raw_pay = 15k - 3k = 12k.
      // Overflow: net_rec = 0; net_pay = 12k + 15k = 27k.
      debts: [
        {
          type: 'receivable',
          status: 'active',
          currency: 'TRY',
          principal_amount: 20000,
          remaining_amount: 20000,
        },
        {
          type: 'payable',
          status: 'active',
          currency: 'TRY',
          principal_amount: 15000,
          remaining_amount: 15000,
        },
      ],
      transactions: [
        { type: 'income', currency: 'TRY', amount: 5000, auto_generated: false },
        { type: 'expense', currency: 'TRY', amount: 3000, auto_generated: false },
        { type: 'income', currency: 'TRY', amount: 30000, auto_generated: false },
      ],
      expected: { receivable: 0, payable: 27000 },
    },
  ];

  for (const step of STEPS) {
    it(step.label, () => {
      const result = aggregateContactBalance(step.debts, step.transactions);
      expect(result.TRY?.receivable).toBe(step.expected.receivable);
      expect(result.TRY?.payable).toBe(step.expected.payable);
    });
  }

  it('symmetric overflow on cash_out exceeds payable → flips to receivable', () => {
    // gross_rec=5k, gross_pay=10k, paid_out=15k.
    // raw_rec = 5k, raw_pay = -5k → net_rec = 5k + 5k = 10k, net_pay = 0.
    const result = aggregateContactBalance(
      [
        {
          type: 'receivable',
          status: 'active',
          currency: 'TRY',
          principal_amount: 5000,
          remaining_amount: 5000,
        },
        {
          type: 'payable',
          status: 'active',
          currency: 'TRY',
          principal_amount: 10000,
          remaining_amount: 10000,
        },
      ],
      [{ type: 'expense', currency: 'TRY', amount: 15000, auto_generated: false }],
    );
    expect(result.TRY).toEqual({ receivable: 10000, payable: 0, net: 10000 });
  });
});
