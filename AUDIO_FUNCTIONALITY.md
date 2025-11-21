# EdLingo Audio Functionality Documentation

## Overview

EdLingo provides comprehensive audio functionality including voice message recording, speech-to-text (STT), text-to-speech (TTS), and audio analysis capabilities. This document outlines the implementation, usage, and integration of these features.

## Architecture

### Core Components

1. **AudioProvider** (`src/renderer/providers/AudioProvider.jsx`)
   - Manages audio recording and playback
   - Handles microphone permissions and audio context
   - Provides audio level monitoring
   - Integrates with Electron's audio analysis

2. **ModernGeminiLiveService** (`src/renderer/services/modernGeminiLiveService.js`)
   - Handles real-time STT/TTS integration
   - Manages live conversation sessions
   - Provides event-driven audio processing

3. **Main Process Audio Handler** (`src/main/main.js`)
   - Implements `analyzeAudio` IPC handler
   - Processes audio buffers for analysis
   - Returns audio characteristics and metadata

## Features

### 1. Voice Message Recording

**Location**: Chat component (`src/renderer/pages/Chat.jsx`)

**Usage**:
```javascript
const { startRecording, stopRecording, isRecording } = useAudio();

const handleVoiceInput = async () => {
  if (isRecording) {
    await stopRecording();
  } else {
    await startRecording();
  }
};
```

**Features**:
- Real-time audio level monitoring
- Automatic audio analysis on recording stop
- Visual feedback with recording indicator
- Error handling for microphone permissions

### 2. Speech-to-Text (STT)

**Location**: LiveConversation component (`src/renderer/pages/LiveConversation.jsx`)

**Implementation**:
- Uses Web Speech API (`webkitSpeechRecognition`)
- Provides real-time interim results
- Continuous listening with auto-restart
- Language configuration support

**Event Handlers**:
```javascript
const handleSTTStart = () => {
  console.log('STT started');
  setIsRecording(true);
};

const handleSTTInterim = (data) => {
  console.log('STT interim:', data.transcript);
  setCurrentMessage(data.transcript);
};

const handleSTTFinal = (data) => {
  console.log('STT final:', data.transcript);
  // Process final transcript
};
```

### 3. Text-to-Speech (TTS)

**Implementation**:
- Uses Web Speech API (`speechSynthesis`)
- Voice selection with fallback options
- Configurable rate, pitch, and volume
- Event-driven playback control

**Usage Example**:
```javascript
const liveService = ModernGeminiLiveService;
const result = await liveService.speak(text, {
  rate: 0.9,
  pitch: 1.0,
  volume: 0.8,
  language: 'en-US'
});
```

### 4. Audio Analysis

**Main Process Handler**:
```javascript
ipcMain.handle('analyze-audio', async (event, audioBuffer) => {
  try {
    const analysis = {
      duration: audioBuffer.byteLength / (16000 * 2), // Approximate duration
      sampleRate: 16000,
      channels: 1,
      format: 'PCM',
      quality: 'good',
      timestamp: new Date().toISOString()
    };
    return { success: true, analysis };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

## Integration Examples

### Chat Component Voice Messages

```javascript
// Voice input button in Chat component
<button
  onClick={handleVoiceInput}
  className={`p-3 rounded-full transition-all duration-200 ${
    isRecording 
      ? 'bg-red-500 text-white animate-pulse' 
      : 'bg-blue-500 text-white hover:bg-blue-600'
  }`}
  disabled={isLoading}
>
  {isRecording ? <Square size={20} /> : <Mic size={20} />}
</button>
```

### LiveConversation STT/TTS Integration

```javascript
// Initialize live service with event listeners
useEffect(() => {
  const liveService = liveServiceRef.current;
  if (!liveService) return;

  // STT Event Handlers
  liveService.on('sttStart', handleSTTStart);
  liveService.on('sttInterim', handleSTTInterim);
  liveService.on('sttFinal', handleSTTFinal);
  liveService.on('sttEnd', handleSTTEnd);
  liveService.on('sttError', handleSTTError);

  // TTS Event Handlers
  liveService.on('ttsStart', handleTTSStart);
  liveService.on('ttsEnd', handleTTSEnd);
  liveService.on('ttsError', handleTTSError);

  return () => {
    // Cleanup event listeners
    liveService.off('sttStart', handleSTTStart);
    // ... other cleanup
  };
}, []);
```

## Configuration

### Audio Settings

```javascript
const voiceSettings = {
  language: 'en-US',
  voice: 'Alloy',
  speed: 1.0,
  pitch: 1.0
};

const audioConfig = {
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16
};
```

### Browser Compatibility

- **STT**: Requires `webkitSpeechRecognition` or `SpeechRecognition`
- **TTS**: Requires `speechSynthesis` API
- **Audio Recording**: Requires `MediaRecorder` API
- **Microphone Access**: Requires HTTPS or localhost

## Error Handling

### Common Error Scenarios

1. **Microphone Permission Denied**
```javascript
try {
  await startRecording();
} catch (error) {
  if (error.name === 'NotAllowedError') {
    toast({
      title: "Microphone Access Denied",
      description: "Please allow microphone access to use voice features.",
      variant: "destructive"
    });
  }
}
```

2. **STT Not Supported**
```javascript
if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
  throw new Error('Speech recognition not supported');
}
```

3. **TTS Not Available**
```javascript
if (!('speechSynthesis' in window)) {
  throw new Error('Speech synthesis not supported');
}
```

## Performance Considerations

1. **Audio Buffer Management**
   - Limit recording duration to prevent memory issues
   - Clean up audio contexts when not in use
   - Use appropriate sample rates for quality vs. performance

2. **STT Optimization**
   - Use continuous recognition with auto-restart
   - Handle interim results efficiently
   - Implement debouncing for final results

3. **TTS Optimization**
   - Cache voice selections
   - Queue speech requests to prevent conflicts
   - Stop previous speech before starting new

## Testing

### Manual Testing Steps

1. **Voice Recording in Chat**
   - Navigate to Chat page
   - Click microphone button
   - Verify recording indicator appears
   - Speak and stop recording
   - Check console for audio analysis results

2. **STT in LiveConversation**
   - Navigate to LiveConversation page
   - Start a live session
   - Enable microphone and speak
   - Verify interim and final transcripts appear

3. **TTS Playback**
   - Send a message in LiveConversation
   - Verify AI response is spoken aloud
   - Test stop/pause functionality

### Automated Testing

```javascript
// Example test for audio analysis
describe('Audio Analysis', () => {
  it('should analyze audio buffer correctly', async () => {
    const mockBuffer = new ArrayBuffer(1024);
    const result = await window.electronAPI.analyzeAudio(mockBuffer);
    
    expect(result.success).toBe(true);
    expect(result.analysis).toHaveProperty('duration');
    expect(result.analysis).toHaveProperty('sampleRate');
  });
});
```

## Troubleshooting

### Common Issues

1. **No Audio Input**
   - Check microphone permissions in browser
   - Verify microphone is not muted
   - Test with different browsers

2. **STT Not Working**
   - Ensure HTTPS or localhost environment
   - Check browser compatibility
   - Verify internet connection for cloud STT

3. **TTS Not Playing**
   - Check system volume settings
   - Verify browser audio permissions
   - Test with different voices

4. **Performance Issues**
   - Reduce audio quality settings
   - Limit concurrent audio operations
   - Clear audio context regularly

## Future Enhancements

1. **Advanced Audio Analysis**
   - Implement noise reduction
   - Add voice activity detection
   - Support multiple audio formats

2. **Enhanced STT Features**
   - Custom vocabulary support
   - Multiple language detection
   - Confidence scoring

3. **Improved TTS**
   - Neural voice synthesis
   - Emotion and tone control
   - SSML support

4. **Real-time Features**
   - Live audio streaming
   - Real-time translation
   - Voice cloning capabilities

## Conclusion

EdLingo's audio functionality provides a comprehensive foundation for voice-enabled language learning. The modular architecture allows for easy extension and customization while maintaining performance and reliability across different platforms and browsers.