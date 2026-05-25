/**
 * Smoke tests for the Yeni Kişi form.
 *
 * Round 2 spec: only `phone_number` is required. Round 5 §1 moved the
 * service-type pills off this form onto the transaction entry form —
 * these tests now assert the pills are GONE from here.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { contactSchema } from '@/schemas/contact';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light', setColorScheme: () => {} }),
  styled: <T,>(component: T) => component,
}));

// eslint-disable-next-line import/first
import { ContactForm } from '@/components/ContactForm';

describe('ContactForm — smoke', () => {
  afterEach(() => {
    cleanup();
  });

  it('does NOT render the service-type pills (moved to transaction form in R5 §1)', () => {
    render(<ContactForm submitLabel="common.save" onSubmit={() => {}} />);

    expect(screen.queryByText('contacts.serviceTypeVize')).toBeNull();
    expect(screen.queryByText('contacts.serviceTypeBilet')).toBeNull();
    expect(screen.queryByText('contacts.serviceTypeBiletVeVize')).toBeNull();
    expect(screen.queryByText('contacts.serviceTypeOther')).toBeNull();
  });

  it('saves with only the phone number filled in', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ContactForm submitLabel="common.save" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('contacts.phoneNumber *'), {
      target: { value: '5551234567' },
    });
    fireEvent.click(screen.getByText('common.save'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const arg = onSubmit.mock.calls[0]?.[0];
    expect(arg).toMatchObject({
      phone_number: '5551234567',
      full_name: null,
      occupation: null,
      notes: null,
    });
    // service_type fields must not be in the payload any more.
    expect(arg).not.toHaveProperty('service_type');
    expect(arg).not.toHaveProperty('service_type_other');
  });

  it('rejects a phone number shorter than 7 chars', async () => {
    const onSubmit = vi.fn();
    render(<ContactForm submitLabel="common.save" onSubmit={onSubmit} />);

    const input = screen.getByLabelText('contacts.phoneNumber *');
    fireEvent.change(input, { target: { value: '12345' } });
    fireEvent.blur(input);
    fireEvent.click(screen.getByText('common.save'));

    // The submit must not fire when validation fails. Allow the resolver
    // promise to settle before asserting.
    await new Promise((r) => setTimeout(r, 50));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('contactSchema — service_type removed (R5 §1)', () => {
  it('passing legacy service_type fields no longer rejects, they are silently ignored', () => {
    const result = contactSchema.safeParse({
      phone_number: '5551234567',
      service_type: 'other',
      service_type_other: 'leftover',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // The schema is now closed on these keys — Zod strips unknowns by
      // default, so `service_type` does not appear in the output.
      expect('service_type' in result.data).toBe(false);
      expect('service_type_other' in result.data).toBe(false);
    }
  });
});

describe('contactSchema — idempotency', () => {
  it('parsing its own output does not throw — this is the round-2 regression', () => {
    const once = contactSchema.parse({
      phone_number: '5551234567',
      full_name: '',
      occupation: '',
      notes: '',
    });
    // Empty strings should normalise to null.
    expect(once.full_name).toBeNull();
    expect(once.occupation).toBeNull();
    expect(once.notes).toBeNull();

    // Now feed the transformed output back in. With Round 1's schema this
    // threw "Expected string, received null". With the Round 2 schema it
    // returns the same shape unchanged.
    const twice = contactSchema.parse(once);
    expect(twice).toEqual(once);
  });

  it('accepts a populated form', () => {
    const out = contactSchema.parse({
      phone_number: '+1 555-123-4567',
      full_name: '  Alice  ',
      occupation: 'designer',
      notes: 'Hi',
    });
    expect(out.full_name).toBe('Alice');
    expect(out.phone_number).toBe('+1 555-123-4567');
  });
});
