# EdLingo Android APK Build Guide

This guide will help you build an Android APK from your EdLingo web application using Capacitor.

## Prerequisites

Before building the Android APK, ensure you have the following installed:

1. **Node.js** (v20 or higher) - Already installed ✓
2. **Android Studio** - Download from https://developer.android.com/studio
3. **Java Development Kit (JDK)** - JDK 17 or higher
   - Check with: `java -version`
   - Android Studio usually includes this

## Android Studio Setup

1. **Install Android Studio**
   - Download and install from https://developer.android.com/studio
   - During installation, make sure to install:
     - Android SDK
     - Android SDK Platform
     - Android Virtual Device (optional, for testing)

2. **Set up Android SDK**
   - Open Android Studio
   - Go to `Tools > SDK Manager`
   - Install the following:
     - Android SDK Platform 34 (or latest)
     - Android SDK Build-Tools
     - Android SDK Command-line Tools
     - Android Emulator (optional)

3. **Set Environment Variables**
   - Add `ANDROID_HOME` to your system environment variables:
     - Windows: `C:\Users\<YourUsername>\AppData\Local\Android\Sdk`
   - Add to PATH:
     - `%ANDROID_HOME%\platform-tools`
     - `%ANDROID_HOME%\tools`
     - `%ANDROID_HOME%\cmdline-tools\latest\bin`

## Building the APK

### Method 1: Using Android Studio (Recommended for First Build)

1. **Open the Android project in Android Studio**
   ```bash
   npm run android:open
   ```
   Or manually open: `android/` folder in Android Studio

2. **Wait for Gradle sync to complete**
   - Android Studio will automatically sync and download dependencies
   - This may take 5-15 minutes on the first run

3. **Build the APK**
   - In Android Studio, go to `Build > Build Bundle(s) / APK(s) > Build APK(s)`
   - Wait for the build to complete
   - APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

4. **For Release APK** (Production-ready)
   - Go to `Build > Generate Signed Bundle / APK`
   - Select `APK` and click `Next`
   - Create a new keystore or use an existing one
   - Fill in the keystore details
   - Choose `release` build variant
   - Click `Finish`
   - APK location: `android/app/build/outputs/apk/release/app-release.apk`

### Method 2: Using Command Line

1. **Build for Debug (unsigned APK)**
   ```bash
   cd android
   gradlew assembleDebug
   ```
   Output: `android/app/build/outputs/apk/debug/app-debug.apk`

2. **Build for Release (requires signing)**
   ```bash
   cd android
   gradlew assembleRelease
   ```
   Output: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

### Method 3: Using NPM Scripts (Easiest)

We've created convenient npm scripts for you:

1. **Sync and build**
   ```bash
   npm run android:sync
   ```

2. **Open Android Studio**
   ```bash
   npm run android:open
   ```

3. **Run on connected device/emulator**
   ```bash
   npm run android:run
   ```

## Making Changes and Rebuilding

Whenever you make changes to your web app:

1. **Rebuild web assets**
   ```bash
   npm run build:mobile
   ```

2. **Sync to Android**
   ```bash
   npx cap sync android
   ```

3. **Rebuild APK**
   - Use Android Studio or command line methods above

Or use the combined command:
```bash
npm run android:sync
```

## APK Signing for Production

For a production APK that can be published to Google Play Store:

1. **Create a keystore** (one-time setup)
   ```bash
   keytool -genkey -v -keystore edlingo-release.keystore -alias edlingo -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Store keystore safely**
   - **IMPORTANT**: Keep your keystore file and passwords secure
   - You'll need the same keystore for all future updates

3. **Configure signing in Android Studio**
   - Open `android/app/build.gradle`
   - Or use Android Studio's UI: `Build > Generate Signed Bundle / APK`

4. **Build signed APK**
   ```bash
   cd android
   gradlew assembleRelease
   ```

## App Configuration

### Update App Name and Icon

1. **App Name**
   - Edit: `android/app/src/main/res/values/strings.xml`
   ```xml
   <string name="app_name">EdLingo</string>
   ```

2. **App Icon**
   - Generate icons: https://icon.kitchen/ or https://romannurik.github.io/AndroidAssetStudio/
   - Replace icons in: `android/app/src/main/res/mipmap-*/`
   - Or use Capacitor assets:
     ```bash
     npm install -D @capacitor/assets
     npx capacitor-assets generate
     ```

3. **Version and Build Number**
   - Edit: `android/app/build.gradle`
   ```gradle
   versionCode 1
   versionName "1.0.0"
   ```

### Permissions

Your app permissions are defined in `android/app/src/main/AndroidManifest.xml`

Current permissions:
- Internet access (for API calls)
- Network state (for connectivity detection)

## Testing the APK

### Install on Physical Device

1. **Enable USB Debugging** on your Android device
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times to enable Developer Options
   - Go to Settings > Developer Options
   - Enable "USB Debugging"

2. **Connect device to computer**

3. **Install APK**
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Test on Emulator

1. **Create an emulator** in Android Studio
   - Tools > Device Manager
   - Create Virtual Device

2. **Run the app**
   ```bash
   npm run android:run
   ```

## Troubleshooting

### Gradle Build Fails

1. **Clean the project**
   ```bash
   cd android
   gradlew clean
   ```

2. **Invalidate caches** in Android Studio
   - File > Invalidate Caches / Restart

### Capacitor Plugin Issues

1. **Update plugins**
   ```bash
   npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest
   ```

2. **Sync again**
   ```bash
   npx cap sync android
   ```

### Port Already in Use

If dev server port is in use:
```bash
npx kill-port 3002
```

## Environment Variables

The app uses environment variables from `.env` file. These are bundled at build time.

**Important**: Never commit sensitive keys to version control!

For production builds:
1. Create `.env.production` with production values
2. Build with: `npm run build:mobile -- --mode production`

## File Structure

```
edlingo/
├── android/                 # Native Android project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/     # Web assets copied here
│   │   │   ├── res/        # Android resources (icons, etc.)
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle    # App-level Gradle config
│   └── build.gradle        # Project-level Gradle config
├── dist/                   # Built web assets
├── capacitor.config.ts     # Capacitor configuration
└── package.json            # NPM scripts
```

## NPM Scripts Reference

```json
{
  "build:mobile": "vite build",
  "android:sync": "npm run build:mobile && npx cap sync android",
  "android:open": "npx cap open android",
  "android:run": "npx cap run android"
}
```

## Publishing to Google Play Store

1. **Create a Google Play Developer account** ($25 one-time fee)
   - https://play.google.com/console

2. **Prepare your app**
   - Create signed release APK or AAB (Android App Bundle)
   - Prepare app listing (screenshots, description, etc.)

3. **Upload to Play Console**
   - Create new app
   - Upload APK/AAB
   - Fill in store listing details
   - Submit for review

4. **Recommended: Use AAB instead of APK**
   ```bash
   cd android
   gradlew bundleRelease
   ```
   Output: `android/app/build/outputs/bundle/release/app-release.aab`

## Next Steps

1. ✅ **Build debug APK** to test on your device
2. ✅ **Test thoroughly** on different devices/Android versions
3. ✅ **Create app icons** and splash screens
4. ✅ **Generate signed release APK** when ready for production
5. ✅ **Publish to Google Play Store**

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [Google Play Console](https://play.google.com/console)

## Support

For issues specific to:
- **Capacitor**: https://github.com/ionic-team/capacitor/issues
- **Android Build**: https://stackoverflow.com/questions/tagged/android

---

**Built with ❤️ using Capacitor**
