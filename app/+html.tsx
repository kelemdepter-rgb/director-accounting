import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * Root HTML for static web renders.
 *
 * Why this overrides Expo Router's default template:
 *
 *   1. `viewport-fit=cover` is REQUIRED for iOS Safari to expose
 *      `env(safe-area-inset-*)`. Without it, react-native-safe-area-context
 *      returns `insets.bottom === 0` on web, which is why
 *      `paddingBottom: 96 + insets.bottom` from the previous round did not
 *      reserve any room for the iOS home indicator / dynamic browser chrome.
 *
 *   2. `height: 100%` on the html/body chain resolves to the *large* viewport
 *      on mobile Safari — the area including the (initially visible) URL bar.
 *      Result: the bottom ~60 px of content sits behind the address bar on
 *      first paint. `100dvh` (dynamic viewport height) tracks the visible
 *      viewport as the URL bar collapses, which is what we want here.
 *
 *   3. Even with `100dvh`, we still need the `100%` chain that
 *      `ScrollViewStyleReset` installs (it's how RN-Web's `flex: 1` cascade
 *      reaches the viewport), so we keep it and layer the `dvh` rule
 *      below — the cascade picks the later rule on supporting browsers and
 *      falls back to `100%` everywhere else.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style
          id="director-viewport-fix"
          dangerouslySetInnerHTML={{
            __html: `
              @supports (height: 100dvh) {
                html, body, #root { height: 100dvh; }
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
