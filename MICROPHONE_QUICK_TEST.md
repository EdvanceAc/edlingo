# 🎤 Quick Microphone Test Guide

## Quick Start (60 seconds)

### Step 1: Start the App
```bash
npm run dev
```

### Step 2: Open Test Page
Navigate to: `http://127.0.0.1:3002/test-microphone.html`

### Step 3: Run Tests
1. Click "Test Microphone Access" → Should see ✓ green success
2. Click "Start Speech Recognition" → Speak into mic
3. Watch transcript appear in real-time

### Step 4: Test Live Conversation
1. Go to Live Conversation page in the app
2. Click "Tap to Speak"
3. Say something (e.g., "Hello, how are you?")
4. Verify AI responds

---

## ✅ Success Indicators

**Console should show**:
```
✓ Granted permission: microphone
[LiveConversation] Microphone access granted
[LiveConversation] Speech recognition started
```

**UI should show**:
- Green "Connected via Supabase" badge
- Your speech appears as text
- AI response appears below

---

## ❌ Common Issues & Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| "Microphone access denied" | Allow in system settings, restart app |
| "No microphone found" | Check connection, test in other app |
| Button stays disabled | Check console for errors, reload page |
| Recognition stops immediately | Speak louder/sooner, check mic levels |
| No interim transcript | Normal - wait for final result |

---

## 🔍 Quick Debug Checklist

- [ ] Microphone is connected and working
- [ ] System permissions allow microphone access
- [ ] No other app is using the microphone
- [ ] Console shows no red error messages
- [ ] "Tap to Speak" button becomes "Stop listening" when clicked
- [ ] Green success message appears when mic permission granted

---

## 🆘 Emergency Reset

If nothing works:
1. Close the app completely
2. Check microphone in another app (test that it works)
3. Clear Electron cache:
   ```bash
   # Windows
   del /s /q %APPDATA%\edlingo-electron\
   
   # macOS/Linux
   rm -rf ~/Library/Application\ Support/edlingo-electron/
   ```
4. Restart the app
5. Grant permissions when prompted

---

## 📞 Support

If mic still doesn't work after all fixes:
1. Run test page and copy console output
2. Check `MICROPHONE_STT_FIXES.md` for detailed troubleshooting
3. Verify all 5 critical bugs are fixed (see that file)

**Expected Result**: Microphone should work in under 2 minutes of testing!
