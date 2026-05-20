import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shadows } from '@/constants/theme';

import { QuickAddPicker } from './QuickAddPicker';
import type { QuickAddMode } from './QuickAddSheet';

interface QuickAddFabProps {
  onPick: (mode: QuickAddMode) => void;
}

/**
 * Floating Action Button. The Round 2 redesign replaced the four
 * fan-out chips with a four-card BottomSheet picker — see QuickAddPicker
 * — so the FAB itself now just toggles that sheet open.
 */
export function QuickAddFab({ onPick }: QuickAddFabProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const bottomOffset = 24 + insets.bottom;

  const handlePick = (mode: QuickAddMode) => {
    setOpen(false);
    // Defer one frame so the picker close-animation can start before the
    // entry sheet opens on top.
    setTimeout(() => onPick(mode), 60);
  };

  return (
    <>
      <View
        className="absolute right-6 items-end"
        style={{ bottom: bottomOffset }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('quickAdd.openPicker')}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(true)}
          style={shadows.fab}
          className="h-14 w-14 items-center justify-center rounded-full bg-income-500"
        >
          <Text
            className="text-3xl font-light text-white"
            style={{ lineHeight: 32 }}
          >
            ＋
          </Text>
        </Pressable>
      </View>

      <QuickAddPicker
        visible={open}
        onClose={() => setOpen(false)}
        onPick={handlePick}
      />
    </>
  );
}
