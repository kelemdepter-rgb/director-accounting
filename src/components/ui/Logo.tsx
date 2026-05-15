import { Image, type ImageStyle, type StyleProp, View } from 'react-native';

// Metro resolves this relative to the source file.
// The PNG is bundled with the app — see `assets/images/logo.png`.
const LOGO_SOURCE = require('../../../assets/images/logo.png');

interface LogoProps {
  /** Square size in points. */
  size?: number;
  /** Add a subtle rounded background frame (recommended on busy backgrounds). */
  framed?: boolean;
  style?: StyleProp<ImageStyle>;
}

/**
 * The DirectorBook / PatronDefteri / دېرىكتور دەپتىرى brand mark.
 * The image lives at `assets/images/logo.png` and is bundled with the app.
 */
export function Logo({ size = 48, framed = false, style }: LogoProps) {
  const image = (
    <Image
      source={LOGO_SOURCE}
      accessibilityLabel="DirectorBook"
      resizeMode="contain"
      style={[{ width: size, height: size }, style]}
    />
  );

  if (!framed) return image;

  return (
    <View
      className="items-center justify-center rounded-2xl bg-white/10"
      style={{ width: size + 16, height: size + 16 }}
    >
      {image}
    </View>
  );
}
