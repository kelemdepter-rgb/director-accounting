/**
 * Shapes mirroring the Postgres schema in `supabase/migrations/`.
 * These are the canonical "row" types we work with on the client.
 */

export type ContactServiceType = 'vize' | 'bilet' | 'bilet_ve_vize';

export interface ContactRow {
  id: string;
  user_id: string;
  /**
   * Display name. NULL when the user only recorded a phone number — the UI
   * falls back to the phone number in that case (see `displayContact`).
   */
  full_name: string | null;
  phone_number: string | null;
  occupation: string | null;
  notes: string | null;
  service_type: ContactServiceType | null;
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
  debt_id: string | null;
  debt_payment_id: string | null;
  auto_generated: boolean;
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
  updated_at: string;
  edited_count: number;
}

/**
 * Insert shape — only the phone number is mandatory, everything else can be
 * left blank or null. Mirrors the validation in `src/schemas/contact.ts` and
 * the DB constraints in migration 012.
 */
export type ContactInsert = Pick<ContactRow, 'phone_number'> &
  Partial<Pick<ContactRow, 'full_name' | 'occupation' | 'notes' | 'service_type'>>;

export type ContactUpdate = Partial<
  Pick<ContactRow, 'full_name' | 'phone_number' | 'occupation' | 'notes' | 'service_type'>
>;
