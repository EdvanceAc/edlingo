/**
 * MediaRecorder-based Speech-to-Text using Gemini API
 * This is a fallback for when Web Speech API doesn't work (e.g., network errors in Electron)
 */

class MediaRecorderSTT {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
    this.onInterimTranscript = null;
    this.onFinalTranscript = null;
    this.onError = null;
  }

  async start(options = {}) {
    try {
      console.log('[MediaRecorderSTT] Starting...');
      
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      console.log('[MediaRecorderSTT] Microphone access granted');

      // Create MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log(`[MediaRecorderSTT] Audio chunk recorded: ${event.data.size} bytes`);
        }
      };

      this.mediaRecorder.onstop = async () => {
        console.log('[MediaRecorderSTT] Recording stopped, processing audio...');
        await this.processAudio();
      };

      this.mediaRecorder.onerror = (event) => {
        const errorMsg = event.error?.message || event.message || 'Unknown MediaRecorder error';
        console.error('[MediaRecorderSTT] MediaRecorder error:', errorMsg, event);
        if (this.onError) {
          this.onError(new Error(errorMsg));
        }
      };

      // Start recording
      this.mediaRecorder.start();
      this.isRecording = true;
      console.log('[MediaRecorderSTT] Recording started');

      return { success: true };
    } catch (error) {
      console.error('[MediaRecorderSTT] Failed to start:', error);
      if (this.onError) {
        this.onError(error);
      }
      return { success: false, error: error.message };
    }
  }

  stop() {
    if (this.mediaRecorder && this.isRecording) {
      console.log('[MediaRecorderSTT] Stopping recording...');
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      // Stop all tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }
    }
  }

  async processAudio() {
    try {
      if (this.audioChunks.length === 0) {
        console.warn('[MediaRecorderSTT] No audio chunks to process');
        return;
      }

      // Create blob from audio chunks
      const mimeType = this.getSupportedMimeType();
      const audioBlob = new Blob(this.audioChunks, { type: mimeType });
      console.log(`[MediaRecorderSTT] Created audio blob: ${audioBlob.size} bytes, type: ${mimeType}`);

      // Convert to base64
      const base64Audio = await this.blobToBase64(audioBlob);
      
      // Send to Gemini API for transcription
      const transcript = await this.transcribeWithGemini(base64Audio, mimeType);
      
      if (transcript && this.onFinalTranscript) {
        console.log(`[MediaRecorderSTT] Transcript: ${transcript}`);
        this.onFinalTranscript(transcript);
      }
    } catch (error) {
      const errorMsg = error?.message || String(error) || 'Unknown processing error';
      console.error('[MediaRecorderSTT] Error processing audio:', errorMsg, error);
      if (this.onError) {
        this.onError(error instanceof Error ? error : new Error(errorMsg));
      }
    } finally {
      this.audioChunks = [];
    }
  }

  async transcribeWithGemini(base64Audio, mimeType) {
    try {
      console.log('[MediaRecorderSTT] Sending audio to Supabase for transcription...');
      
      // Get Supabase URL from environment or use default
      const supabaseUrl = window.__ENV__?.VITE_SUPABASE_URL || 
                         import.meta.env?.VITE_SUPABASE_URL || 
                         'https://ecglfwqylqchdyuhmtuv.supabase.co';
      
      const supabaseAnonKey = window.__ENV__?.VITE_SUPABASE_ANON_KEY || 
                              import.meta.env?.VITE_SUPABASE_ANON_KEY ||
                              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ2xmd3F5bHFjaGR5dWhtdHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NTI0ODEsImV4cCI6MjA0ODUyODQ4MX0.tZeIDJk4x3CPToVQX3bDquePrVzrVhiI7n0UG-I-sM8';

      // Send to Supabase transcribe-audio function
      const response = await fetch(`${supabaseUrl}/functions/v1/transcribe-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: mimeType,
          language: 'en-US'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[MediaRecorderSTT] Supabase transcription failed:', response.status, errorText);
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.text) {
        console.error('[MediaRecorderSTT] Transcription result invalid:', result);
        throw new Error(result.message || 'Failed to transcribe audio');
      }

      const transcript = result.text.trim();
      console.log('[MediaRecorderSTT] Transcript received from Supabase:', transcript);

      if (transcript.startsWith('ERROR:')) {
        throw new Error('Failed to transcribe audio');
      }

      return transcript;
    } catch (error) {
      const errorMsg = error?.message || String(error) || 'Unknown transcription error';
      console.error('[MediaRecorderSTT] Supabase transcription error:', errorMsg, error);
      throw error instanceof Error ? error : new Error(errorMsg);
    }
  }

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  getSupportedMimeType() {
    const types = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`[MediaRecorderSTT] Using MIME type: ${type}`);
        return type;
      }
    }

    console.log('[MediaRecorderSTT] No preferred MIME type supported, using default');
    return 'audio/webm';
  }

  isAvailable() {
    return !!(navigator.mediaDevices && 
              navigator.mediaDevices.getUserMedia && 
              window.MediaRecorder);
  }
}

export default MediaRecorderSTT;
