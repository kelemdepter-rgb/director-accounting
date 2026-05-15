import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Button } from './ui/Button';

interface ErrorBoundaryProps {
  /** Message shown in place of the crashed subtree. */
  fallbackTitle: string;
  /** Label for the "try again" action. */
  retryLabel: string;
  /** Body description shown under the title. */
  fallbackDescription?: string;
  children: ReactNode;
  /** Optional callback for logging — kept synchronous to match RN constraints. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Class-based ErrorBoundary — React's error-boundary contract is class-only.
 * Wrap any subtree (a screen, a list section, a modal) to keep a single render
 * crash from taking down the whole app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // In dev React already logs the stack — surface it via the optional hook.
    this.props.onError?.(error, info);
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <View
        accessibilityRole="alert"
        className="flex-1 items-center justify-center bg-white px-6 py-10 dark:bg-ink-900"
      >
        <Text className="mb-2 text-4xl" accessibilityElementsHidden>
          ⚠️
        </Text>
        <Text
          accessibilityRole="header"
          className="text-center text-lg font-semibold text-ink-900 dark:text-ink-50"
        >
          {this.props.fallbackTitle}
        </Text>
        {this.props.fallbackDescription ? (
          <Text className="mt-2 max-w-md text-center text-sm text-ink-600 dark:text-ink-300">
            {this.props.fallbackDescription}
          </Text>
        ) : null}
        {__DEV__ && this.state.error ? (
          <Text className="mt-4 max-w-md text-center font-mono text-xs text-ink-500 dark:text-ink-300">
            {this.state.error.message}
          </Text>
        ) : null}
        <View className="mt-5">
          <Button label={this.props.retryLabel} onPress={this.reset} variant="secondary" />
        </View>
      </View>
    );
  }
}
