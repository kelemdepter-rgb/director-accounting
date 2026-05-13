import { SafeAreaView, Text, View } from 'react-native';

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-1 items-center justify-center px-6">
        <Text
          accessibilityRole="header"
          className="text-3xl font-bold text-brand-600 dark:text-brand-300"
        >
          Director Accounting
        </Text>
        <Text className="mt-3 text-center text-base text-neutral-600 dark:text-neutral-400">
          Project scaffold ready. Step 1 verification screen.
        </Text>
      </View>
    </SafeAreaView>
  );
}
