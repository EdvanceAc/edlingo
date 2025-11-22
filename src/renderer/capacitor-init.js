import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

export const isNativePlatform = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

/**
 * Initialize Capacitor plugins for mobile app
 */
export async function initializeCapacitor() {
  if (!isNativePlatform) {
    console.log('Running on web platform, skipping native plugin initialization');
    return;
  }

  console.log(`Initializing Capacitor on ${platform} platform`);

  try {
    // Configure StatusBar
    if (Capacitor.isPluginAvailable('StatusBar')) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
      console.log('StatusBar configured');
    }

    // Configure Keyboard
    if (Capacitor.isPluginAvailable('Keyboard')) {
      await Keyboard.setAccessoryBarVisible({ isVisible: true });
      console.log('Keyboard configured');
    }

    // Hide splash screen after app is ready
    if (Capacitor.isPluginAvailable('SplashScreen')) {
      setTimeout(async () => {
        await SplashScreen.hide();
        console.log('SplashScreen hidden');
      }, 2000);
    }

    // Listen to app state changes
    if (Capacitor.isPluginAvailable('App')) {
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Active:', isActive);
      });

      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        } else {
          window.history.back();
        }
      });
      console.log('App listeners registered');
    }

    console.log('Capacitor initialization complete');
  } catch (error) {
    console.error('Error initializing Capacitor:', error);
  }
}

/**
 * Get device info
 */
export async function getDeviceInfo() {
  if (!isNativePlatform) return null;

  try {
    const { Device } = await import('@capacitor/device');
    const info = await Device.getInfo();
    return info;
  } catch (error) {
    console.error('Error getting device info:', error);
    return null;
  }
}
