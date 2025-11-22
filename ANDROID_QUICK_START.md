# 🚀 EdLingo Android - Quick Start

## Prerequisites Checklist

- [ ] Node.js v20+ installed
- [ ] Android Studio installed
- [ ] Java JDK 17+ installed
- [ ] Environment variables configured (`ANDROID_HOME`, `PATH`)

## One-Time Setup

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Generate environment file
npm run generate:env

# 3. Open Android Studio and configure SDK
npm run android:open
```

## Daily Development Workflow

### Build & Test

```bash
# Build web assets and sync to Android
npm run android:sync

# Open in Android Studio
npm run android:open

# Or run directly on device/emulator
npm run android:run
```

### After Code Changes

```bash
# Quick rebuild and sync
npm run android:sync
```

## Quick Commands

| Command | Description |
|---------|-------------|
| `npm run build:mobile` | Build web assets only |
| `npm run android:sync` | Build + sync to Android |
| `npm run android:open` | Open in Android Studio |
| `npm run android:run` | Run on device/emulator |

## Build APK

### Debug APK (for testing)

**Option 1: Android Studio**
1. Open project: `npm run android:open`
2. Build > Build Bundle(s) / APK(s) > Build APK(s)
3. Find APK: `android/app/build/outputs/apk/debug/app-debug.apk`

**Option 2: Command Line**
```bash
cd android
gradlew assembleDebug
```

### Release APK (for production)

1. Create keystore (one-time):
   ```bash
   keytool -genkey -v -keystore edlingo-release.keystore -alias edlingo -keyalg RSA -keysize 2048 -validity 10000
   ```

2. In Android Studio:
   - Build > Generate Signed Bundle / APK
   - Select APK > Next
   - Choose keystore > Finish

## Install APK on Device

```bash
# Enable USB debugging on your phone first!
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## Troubleshooting

**Build fails?**
```bash
cd android
gradlew clean
```

**Capacitor issues?**
```bash
npx cap sync android
```

**Port conflict?**
```bash
npx kill-port 3002
```

## File Locations

- **APK Output**: `android/app/build/outputs/apk/`
- **Android Code**: `android/`
- **Web Build**: `dist/`
- **Config**: `capacitor.config.ts`

## Next Steps

1. ✅ Build debug APK
2. ✅ Test on your device
3. ✅ Add app icon (see full guide)
4. ✅ Build release APK for production
5. ✅ Publish to Google Play Store

📖 **Full guide**: See `ANDROID_BUILD_GUIDE.md`

---

Happy building! 🎉
