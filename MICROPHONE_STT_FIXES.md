# Microphone & Speech-to-Text (STT) Fixes - EdLingo

## Summary of Issues Fixed

All critical issues preventing microphone access and speech recognition in the live conversation feature have been identified and fixed.

---

## 🔴 Critical Bugs Fixed

### 1. **Duplicate Class Definition in `geminiLiveService.js`**
- **Location**: `src/renderer/services/geminiLiveService.js`
- **Problem**: File contained TWO complete class definitions (lines 3-592 and 594-673), causing conflicts
- **Fix**: Removed the duplicate class definition at line 594
- **Impact**: Service now properly exports and functions correctly

### 2. **Missing WebSocket Endpoint in `LiveSession.js`**
- **Location**: `src/main/LiveSession.js`
- **Problem**: Line 27 referenced `this.endpoint` which was never initialized
- **Fix**: Added proper endpoint initialization in constructor:
  ```javascript
  this.endpoint = options.endpoint || 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';
  ```
- **Impact**: WebSocket connections now work properly

### 3. **Inadequate Microphone Permissions in Electron**
- **Location**: `src/main/main.js` lines 119-142
- **Problem**: Only handled generic 'media' permission, missing microphone-specific permissions
- **Fix**: Added comprehensive permission handling:
  - `setPermissionRequestHandler` for getUserMedia
  - `setPermissionCheckHandler` for Web APIs like Speech Recognition
  - Handles 'media', 'microphone', and 'audioCapture' permissions
- **Impact**: Electron now properly grants microphone access for both getUserMedia and Web Speech API

### 4. **Missing Microphone Permission Check on Page Load**
- **Location**: `src/renderer/pages/LiveConversation.tsx` lines 46-81
- **Problem**: No explicit microphone permission request, causing silent failures
- **Fix**: Added proactive permission check with detailed error handling:
  - Requests microphone access on component mount
  - Provides specific error messages for different failure scenarios
  - Tests actual microphone availability
- **Impact**: Users now see clear error messages if microphone access is denied

### 5. **TypeScript Configuration Errors**
- **Location**: `tsconfig.node.json`
- **Problem**: Missing `src/services/**/*` and `src/utils/**/*` from include pattern
- **Fix**: Added missing directories to include pattern
- **Impact**: TypeScript compilation now works without errors

---

## 🎯 How It Works Now

### Permission Flow

1. **On App Startup** (Electron Main Process):
   - `setPermissionRequestHandler` grants microphone permissions
   - `setPermissionCheckHandler` validates permission requests
   - Console logs show permission grants/denials

2. **On LiveConversation Page Load** (Renderer Process):
   - Checks for Speech Recognition API availability
   - Requests microphone access via `getUserMedia`
   - Tests actual microphone stream
   - Shows user-friendly error messages if access denied

3. **When User Clicks "Tap to Speak"**:
   - Creates SpeechRecognition instance
   - Starts listening with `continuous: false` and `interimResults: true`
   - Shows interim transcripts as user speaks
   - Sends final transcript to AI service when complete

### Error Handling

The system now provides specific error messages for:
- **NotAllowedError**: Permission denied by user or system
- **NotFoundError**: No microphone device found
- **Network errors**: Connectivity issues
- **General errors**: Any other microphone-related issues

---

## 🧪 Testing Procedures

### Method 1: Use the Test Page

1. Open the test page in your Electron app:
   ```
   http://127.0.0.1:3002/test-microphone.html
   ```

2. Run all tests in order:
   - **Browser Compatibility Check**: Verifies API support
   - **Microphone Permission Test**: Tests getUserMedia access
   - **Speech Recognition Test**: Tests actual voice input
   - **System Information**: Shows environment details
   - **Console Log**: Detailed diagnostic information

### Method 2: Test Live Conversation Feature

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Live Conversation page
3. Look for the microphone status in the console
4. Click "Tap to Speak" button
5. Speak into your microphone
6. Verify:
   - Interim transcript appears as you speak
   - Final transcript is sent to AI
   - AI responds appropriately

### Method 3: Check Console Logs

Look for these success messages in the console:

```
✓ Granted permission: microphone
✓ Permission check passed: microphone from file://
[LiveConversation] Microphone access granted
[LiveConversation] Speech recognition started
```

Look for these error patterns if something fails:

```
✗ Denied permission: microphone
[LiveConversation] Microphone access denied: NotAllowedError
Speech recognition error: not-allowed
```

---

## 🔧 Troubleshooting

### Issue: "Microphone access denied"

**Solutions**:
1. **Check System Permissions**:
   - Windows: Settings → Privacy → Microphone → Allow apps to access microphone
   - macOS: System Preferences → Security & Privacy → Microphone → Check Electron
   - Linux: Check pulseaudio or pipewire permissions

2. **Check Browser/Electron Permissions**:
   - Clear Electron cache and restart
   - Check if microphone is being used by another app
   - Verify microphone is set as default device

3. **Reload the Application**:
   - Close and restart the Electron app
   - Clear browser cache if testing in browser

### Issue: "No microphone found"

**Solutions**:
1. Verify microphone is connected and working
2. Test microphone in other applications (Zoom, Discord, etc.)
3. Check if microphone appears in system devices
4. Try a different USB port (if USB microphone)

### Issue: "Speech recognition not supported"

**Solutions**:
1. Update to latest Chrome/Chromium version
2. Electron app should include Chromium with Speech API support
3. Check that you're not in an old browser version

### Issue: Speech recognition stops immediately

**Solutions**:
1. Check for no-speech timeout (speak within 3-5 seconds)
2. Ensure microphone isn't muted
3. Check audio levels in system mixer
4. Try speaking louder or closer to microphone

---

## 📝 Code Changes Summary

### Files Modified:
1. `src/renderer/services/geminiLiveService.js` - Removed duplicate class
2. `src/main/LiveSession.js` - Added endpoint initialization
3. `src/main/main.js` - Enhanced permission handling
4. `src/renderer/pages/LiveConversation.tsx` - Added permission checks
5. `tsconfig.node.json` - Fixed TypeScript configuration

### Files Created:
1. `test-microphone.html` - Comprehensive diagnostic tool
2. `MICROPHONE_STT_FIXES.md` - This documentation

---

## 🚀 Next Steps

1. **Test on Different Platforms**:
   - Windows 10/11
   - macOS (Intel & Apple Silicon)
   - Linux (Ubuntu, Fedora)

2. **Test with Different Microphones**:
   - Built-in laptop microphone
   - USB microphone
   - Bluetooth headset
   - External audio interface

3. **Test Edge Cases**:
   - Multiple microphones connected
   - Microphone unplugged during use
   - System going to sleep during recording
   - Network disconnection during live conversation

4. **Performance Optimization**:
   - Monitor memory usage during long sessions
   - Test with poor network conditions
   - Optimize transcript processing

---

## 📚 Related Files

- Live Conversation Component: `src/renderer/pages/LiveConversation.tsx`
- Supabase Live Hook: `src/renderer/live/hooks/useSupabaseLiveConversation.ts`
- Gemini Live Service: `src/renderer/services/geminiLiveService.js`
- Main Process: `src/main/main.js`
- Preload Script: `src/preload/preload.js`

---

## 🔗 Additional Resources

- [Web Speech API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Electron Media Permissions](https://www.electronjs.org/docs/latest/tutorial/devices)
- [getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

---

**Last Updated**: November 22, 2025  
**Status**: ✅ All fixes applied and tested  
**Next Review**: After platform-specific testing
