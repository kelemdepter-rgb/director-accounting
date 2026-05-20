/**
 * Reusable scroll wrapper for screens with vertical content that may
 * exceed the viewport.
 *
 * Why it exists: Round 2 only fixed scrolling on the contact-detail
 * screen, by reading `useSafeAreaInsets()` and adding the right
 * paddingBottom. Settings, the Yeni Kişi modal, and the in-sheet
 * transaction-entry form were never audited and each clipped their
 * bottom rows (sign-out button on Settings was unreachable on iPhone
 * SE). Round 3 §1 asks for one wrapper everyone uses so we don't
 * keep re-discovering this bug per screen.
 *
 * It has two render branches because `useBottomTabBarHeight` throws
 * when the screen is *outside* the tab navigator (modals, stack
 * screens). React's hook rules forbid calling it conditionally, so we
 * route to one of two child components based on the `insideTabs` prop.
 */
import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

type Props = PropsWithChildren<{
  /**
   * Set to `false` when the screen is NOT inside the (tabs) navigator —
   * e.g. modal routes (`contact/new`) and stack-only screens. Defaults
   * to true because most long-content screens in this app are tabs.
   */
  insideTabs?: boolean;
  /** Extra bottom padding for sticky footers (Save button, etc.), in px. */
  footerHeight?: number;
  /** Extra contentContainer style. Merged after the computed padding. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Pass-throughs for ScrollView. */
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  showsVerticalScrollIndicator?: boolean;
}>;

export function ScreenScroll(props: Props) {
  return props.insideTabs === false ? (
    <PlainScroll {...props} />
  ) : (
    <TabbedScroll {...props} />
  );
}

interface InnerProps extends PropsWithChildren {
  paddingBottom: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  showsVerticalScrollIndicator?: boolean;
  topInset: number;
}

function ScrollGuts({
  paddingBottom,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
  topInset,
  children,
}: InnerProps) {
  return (
    <KeyboardAvoidingView
      // On iOS we shift the entire view up by the keyboard height ('padding').
      // On Android, soft input mode 'adjustResize' (Expo default) handles
      // this at the OS level — KAV behavior 'height' double-shifts and
      // looks worse.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={topInset}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ flexGrow: 1, paddingBottom }, contentContainerStyle]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TabbedScroll({ footerHeight = 0, children, ...rest }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const paddingBottom = useMemo(
    () => tabBarHeight + insets.bottom + footerHeight + 24,
    [tabBarHeight, insets.bottom, footerHeight],
  );
  return (
    <ScrollGuts {...rest} paddingBottom={paddingBottom} topInset={insets.top}>
      {children}
    </ScrollGuts>
  );
}

function PlainScroll({ footerHeight = 0, children, ...rest }: Props) {
  const insets = useSafeAreaInsets();
  const paddingBottom = useMemo(
    () => insets.bottom + footerHeight + 24,
    [insets.bottom, footerHeight],
  );
  return (
    <ScrollGuts {...rest} paddingBottom={paddingBottom} topInset={insets.top}>
      {children}
    </ScrollGuts>
  );
}
