import type { ContactRow } from '@/types/database';

/**
 * Pick the best label to render for a contact.
 *
 * The "Yeni Kişi" form only requires phone, so `full_name` is allowed to be
 * null. List rows, avatars, and the contact detail header all funnel through
 * this helper so the visible string is consistent: prefer the typed name,
 * fall back to the phone number, finally fall back to an em-dash.
 */
export function displayContact(
  contact:
    | Pick<ContactRow, 'full_name' | 'phone_number'>
    | { full_name?: string | null; phone_number?: string | null }
    | null
    | undefined,
): string {
  if (!contact) return '—';
  const name = contact.full_name?.trim();
  if (name && name.length > 0) return name;
  const phone = contact.phone_number?.trim();
  if (phone && phone.length > 0) return phone;
  return '—';
}
