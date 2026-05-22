/**
 * NativeWind registers its `className` -> `style` interop for the core React
 * Native primitives (View, Text, Pressable, ...) but NOT for either
 * `SafeAreaView` — the deprecated one from `react-native` or the one from
 * `react-native-safe-area-context`.
 *
 * Every screen in this app uses `<SafeAreaView className="flex-1">` as its
 * root. Without the interop the `flex-1` is silently dropped on web: the
 * element stays `flex: 0 0 auto`, sizes to its content instead of the
 * viewport, and every ScrollView/FlatList beneath it loses its bounded-height
 * ancestor. The result is that tall screens overflow Expo's
 * `body { overflow: hidden }` and cannot scroll at all.
 *
 * Registering the interop here — imported once from the root layout — makes
 * `className` work on SafeAreaView across the whole app.
 */
import { cssInterop } from 'nativewind';
import { SafeAreaView as RNSafeAreaView } from 'react-native';
import { SafeAreaView as ContextSafeAreaView } from 'react-native-safe-area-context';

cssInterop(RNSafeAreaView, { className: 'style' });
cssInterop(ContextSafeAreaView, { className: 'style' });
