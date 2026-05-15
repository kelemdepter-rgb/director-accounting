import { Text, View } from 'react-native';

import { avatarColor, initials } from '@/constants/theme';

interface AvatarProps {
  name: string;
  /** Square size in points. */
  size?: number;
  /** Override colour — defaults to a hash of the name. */
  color?: string;
}

/**
 * Solid-circle avatar with the contact's initials. Used wherever we list
 * people: contacts tab, transaction rows, debt cards, sidebar profile.
 */
export function Avatar({ name, size = 40, color }: AvatarProps) {
  const bg = color ?? avatarColor(name);
  const fontSize = Math.round(size * 0.4);
  return (
    <View
      accessibilityElementsHidden
      className="items-center justify-center"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg }}
    >
      <Text
        className="font-semibold text-white"
        style={{ fontSize }}
        // Allow Uyghur and Turkish characters in initials.
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {initials(name)}
      </Text>
    </View>
  );
}
