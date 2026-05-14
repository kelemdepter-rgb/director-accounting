import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';

export interface PhoneContact {
  /** Stable identifier from the device address book. */
  id: string;
  name: string;
  phoneNumber: string | null;
}

export type ContactsPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export function isPhoneContactsSupported(): boolean {
  // expo-contacts has no web implementation; fail closed there.
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function getPhoneContactsPermissionStatus(): Promise<ContactsPermission> {
  if (!isPhoneContactsSupported()) return 'unsupported';
  const { status } = await Contacts.getPermissionsAsync();
  return status;
}

export async function requestPhoneContactsPermission(): Promise<ContactsPermission> {
  if (!isPhoneContactsSupported()) return 'unsupported';
  const { status } = await Contacts.requestPermissionsAsync();
  return status;
}

/**
 * Load every phone contact (name + first phone number).
 * Caller is responsible for first checking permission status.
 */
export async function fetchPhoneContacts(): Promise<PhoneContact[]> {
  if (!isPhoneContactsSupported()) return [];

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    sort: Contacts.SortTypes.FirstName,
  });

  return data
    .filter((c) => typeof c.name === 'string' && c.name.trim().length > 0)
    .map<PhoneContact>((c, index) => ({
      id: c.id ?? `phone-${index}-${c.name ?? ''}`,
      name: (c.name ?? '').trim(),
      phoneNumber: c.phoneNumbers?.[0]?.number?.trim() ?? null,
    }));
}

/**
 * Case-insensitive substring match on name or phone digits.
 * Empty / short queries return an empty list (UI requirement: only search once
 * the user has typed 2+ characters).
 */
export function filterPhoneContacts(
  source: readonly PhoneContact[],
  query: string,
  limit = 20,
): PhoneContact[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const result: PhoneContact[] = [];
  for (const item of source) {
    if (
      item.name.toLowerCase().includes(q) ||
      (item.phoneNumber ?? '').toLowerCase().includes(q)
    ) {
      result.push(item);
      if (result.length >= limit) break;
    }
  }
  return result;
}
