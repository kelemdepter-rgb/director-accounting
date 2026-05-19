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

/**
 * Write a contact to the device address book (iOS / Android only).
 *
 * Returns true if the OS accepted the entry, false on any error or when the
 * platform doesn't support it. Errors are swallowed because failing to mirror
 * the contact to the device should never block the in-app save — the prompt
 * explicitly says "skip silently".
 */
export async function addContactToDevice(input: {
  name: string;
  phoneNumber?: string | null;
}): Promise<boolean> {
  if (!isPhoneContactsSupported()) return false;
  try {
    const { status } = await Contacts.getPermissionsAsync();
    if (status !== 'granted') return false;
    const trimmedName = input.name.trim();
    if (trimmedName.length === 0) return false;

    const contact: Contacts.Contact = {
      // expo-contacts requires a contactType. Person is the universal default.
      contactType: Contacts.ContactTypes.Person,
      name: trimmedName,
      firstName: trimmedName,
    };

    if (input.phoneNumber && input.phoneNumber.trim().length > 0) {
      contact.phoneNumbers = [
        {
          label: 'mobile',
          number: input.phoneNumber.trim(),
        },
      ];
    }

    await Contacts.addContactAsync(contact);
    return true;
  } catch {
    return false;
  }
}
