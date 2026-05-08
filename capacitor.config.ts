import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vist.studio',
  appName: 'VIST',
  webDir: 'dist',
  bundledWebRuntime: false,

  // Server config — for dev hot-reload, point to local Vite or hosted URL.
  // Comment out the `url` line for production builds (uses bundled webDir).
  server: {
    androidScheme: 'https',
    // url: 'http://192.168.1.X:5173', // ← uncomment for hot-reload during dev
    // cleartext: true,
  },

  // iOS-specific
  ios: {
    contentInset: 'always',
    backgroundColor: '#F4EDE0', // cream — matches Headshot Pro mood
  },

  // Android-specific
  android: {
    backgroundColor: '#F4EDE0',
    allowMixedContent: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#F4EDE0',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK', // dark text on cream bg
      backgroundColor: '#F4EDE0',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
