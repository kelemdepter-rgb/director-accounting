/**
 * Shapes mirroring the Postgres schema in `supabase/migrations/`.
 * These are the canonical "row" types we work with on the client.
 */

export interface ContactRow {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string | null;
  occupation: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'income' | 'expense';

export interface TransactionRow {
  id: string;
  user_id: string;
  contact_id: string | null;
  type: TransactionType;
  amount: string; // numeric arrives as string from PostgREST
  currency: string;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

export type DebtType = 'receivable' | 'payable';
export type DebtStatus = 'active' | 'settled';

export interface DebtRow {
  id: string;
  user_id: string;
  contact_id: string;
  type: DebtType;
  principal_amount: string;
  currency: string;
  description: string | null;
  status: DebtStatus;
  created_at: string;
  settled_at: string | null;
}

export interface DebtWithBalanceRow extends DebtRow {
  paid_amount: string;
  remaining_amount: string;
}

export interface DebtPaymentRow {
  id: string;
  debt_id: string;
  user_id: string;
  amount: string;
  paid_at: string;
  note: string | null;
  created_at: string;
  transaction_id: string | null;
}

export type ContactInsert = Pick<ContactRow, 'full_name'> &
  Partial<Pick<ContactRow, 'phone_number' | 'occupation' | 'notes'>>;

export type ContactUpdate = Partial<ContactInsert>;
