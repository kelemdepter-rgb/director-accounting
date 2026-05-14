import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** When true the native alert button uses iOS destructive (red) styling. */
  destructive?: boolean;
}

/**
 * Cross-platform yes/no prompt.
 *
 * React Native Web maps `Alert.alert` to `window.alert`, which only renders an
 * OK button — so multi-button confirmations silently do nothing on the web
 * build. We branch on platform and fall back to `window.confirm` there, which
 * does block the page until the user picks Cancel or OK.
 *
 * Returns `true` if the user confirmed, `false` otherwise.
 */
export function confirm({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
      return Promise.resolve(false);
    }
    const composed = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(window.confirm(composed));
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

/**
 * Cross-platform info / success notice (one OK button).
 *
 * Safe on web because both `Alert.alert` (RN) and `window.alert` (web)
 * agree on the single-button case.
 */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}
