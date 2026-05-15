/**
 * Design tokens used by code that needs hex values (icon tints, Animated
 * interpolations, native shadow props). All Tailwind classes mirror these.
 */

export const colors = {
  brand: {
    50: '#EEF4FB',
    100: '#D5E2F1',
    200: '#A6BFDF',
    400: '#3D6AA5',
    500: '#1E3A5F',
    600: '#1A3354',
    700: '#152A45',
    900: '#0B1726',
  },
  income: '#10B981',
  expense: '#EF4444',
  payable: '#F59E0B',
  receivable: '#10B981',
  warning: '#F59E0B',

  ink: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  background: {
    light: '#F8FAFC',
    dark: '#0F172A',
  },
  surface: {
    light: '#FFFFFF',
    dark: '#1E293B',
  },
  border: {
    light: '#E2E8F0',
    dark: '#334155',
  },
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 16,
  '3xl': 20,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  fab: {
    shadowColor: '#10B981',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

/**
 * Deterministic avatar background color from any string (typically a name).
 * Picks from a small palette designed to look harmonious next to the brand.
 */
const AVATAR_PALETTE = [
  '#1E3A5F', // navy
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // coral
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#0EA5E9', // sky
  '#14B8A6', // teal
] as const;

export function avatarColor(seed: string): string {
  if (!seed) return AVATAR_PALETTE[0]!;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}

/**
 * Extract a friendly initial (1–2 letters) from a name for avatar display.
 */
export function initials(name: string): string {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]![0] ?? '').toUpperCase() + (parts[parts.length - 1]![0] ?? '').toUpperCase();
}
