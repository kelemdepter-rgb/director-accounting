/**
 * Smoke tests for the Yeni Kişi form. The Round 2 spec says:
 *   1. Only `phone_number` is required.
 *   2. The three service-type pills must render.
 *   3. The schema must be idempotent — re-parsing its own output must NOT
 *      fail. The previous round regressed because the screens re-ran
 *      safeParse on already-transformed values, which produced nulls that
 *      the original `z.string()` validator rejected. The form silently
 *      bailed and the user thought "every field is required".
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

  it('renders the three service-type pills', () => {
    render(<ContactForm submitLabel="common.save" onSubmit={() => {}} />);

    expect(screen.getByText('contacts.serviceTypeVize')).toBeTruthy();
    expect(screen.getByText('contacts.serviceTypeBilet')).toBeTruthy();
    expect(screen.getByText('contacts.serviceTypeBiletVeVize')).toBeTruthy();
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
      service_type: null,
      service_type_other: null,
    });
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

describe('ContactForm — Başka service type (R3 §4)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the four pills including Başka', () => {
    render(<ContactForm submitLabel="common.save" onSubmit={() => {}} />);
    expect(screen.getByText('contacts.serviceTypeVize')).toBeTruthy();
    expect(screen.getByText('contacts.serviceTypeBilet')).toBeTruthy();
    expect(screen.getByText('contacts.serviceTypeBiletVeVize')).toBeTruthy();
    expect(screen.getByText('contacts.serviceTypeOther')).toBeTruthy();
  });

  it('reveals the free-text input only when Başka is selected', async () => {
    render(<ContactForm submitLabel="common.save" onSubmit={() => {}} />);
    // Initially hidden.
    expect(screen.queryByLabelText('contacts.serviceTypeOtherLabel *')).toBeNull();

    fireEvent.click(screen.getByText('contacts.serviceTypeOther'));
    await waitFor(() => {
      expect(screen.getByLabelText('contacts.serviceTypeOtherLabel *')).toBeTruthy();
    });

    // Toggle off — should hide again.
    fireEvent.click(screen.getByText('contacts.serviceTypeOther'));
    await waitFor(() => {
      expect(screen.queryByLabelText('contacts.serviceTypeOtherLabel *')).toBeNull();
    });
  });
});

describe('contactSchema — Başka refinement (R3 §4)', () => {
  it('requires service_type_other when service_type is other', () => {
    const result = contactSchema.safeParse({
      phone_number: '5551234567',
      service_type: 'other',
      service_type_other: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const otherErr = result.error.issues.find((i) => i.path[0] === 'service_type_other');
      expect(otherErr).toBeDefined();
    }
  });

  it('accepts other + non-empty description', () => {
    const result = contactSchema.safeParse({
      phone_number: '5551234567',
      service_type: 'other',
      service_type_other: 'Otel rezervasyonu',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.service_type).toBe('other');
      expect(result.data.service_type_other).toBe('Otel rezervasyonu');
    }
  });

  it('normalises stale free-text when service_type is not other', () => {
    const result = contactSchema.safeParse({
      phone_number: '5551234567',
      service_type: 'vize',
      service_type_other: 'leftover',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.service_type_other).toBeNull();
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
      service_type: '',
    });
    // Empty strings should normalise to null.
    expect(once.full_name).toBeNull();
    expect(once.occupation).toBeNull();
    expect(once.notes).toBeNull();
    expect(once.service_type).toBeNull();

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
      service_type: 'vize',
    });
    expect(out.full_name).toBe('Alice');
    expect(out.service_type).toBe('vize');
  });
});
