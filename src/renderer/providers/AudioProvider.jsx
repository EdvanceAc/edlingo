import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const AudioContext = createContext({
  isRecording: false,
  isPlaying: false,
  audioLevel: 0,
  startRecording: () => {},
  stopRecording: () => {},
  playAudio: () => {},
  stopAudio: () => {},
  speakText: () => {},
  analyzeAudio: () => {},
});

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export function AudioProvider({ children }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const currentAudioRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize audio context and analyser
  const initializeAudioContext = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }, []);

  // Start recording audio
  const startRecording = useCallback(async () => {
    try {
      await initializeAudioContext();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      // Set up audio level monitoring
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateAudioLevel = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(average / 255); // Normalize to 0-1
        
        if (isRecording) {
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      const audioChunks = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        
        // Send audio to Electron main process for analysis
        try {
          const arrayBuffer = await audioBlob.arrayBuffer();
          const result = await window.electronAPI?.analyzeAudio?.(arrayBuffer);
          console.log('Audio analysis result:', result);
        } catch (error) {
          console.error('Failed to analyze audio:', error);
        }
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        setAudioLevel(0);
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      updateAudioLevel();
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
    }
  }, [initializeAudioContext, isRecording]);

  // Stop recording audio
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Play audio from URL or blob
  const playAudio = useCallback(async (audioSource) => {
    try {
      await initializeAudioContext();
      
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      
      const audio = new Audio();
      
      if (audioSource instanceof Blob) {
        audio.src = URL.createObjectURL(audioSource);
      } else {
        audio.src = audioSource;
      }
      
      audio.onloadstart = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        currentAudioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlaying(false);
        currentAudioRef.current = null;
        console.error('Failed to play audio');
      };
      
      currentAudioRef.current = audio;
      await audio.play();
      
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
    }
  }, [initializeAudioContext]);

  // Stop currently playing audio
  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  // Text-to-speech functionality
  const speakText = useCallback(async (text, options = {}) => {
    try {
      // Try using Electron API first
      if (window.electronAPI?.speakText) {
        await window.electronAPI.speakText(text, options);
        return;
      }
      
      // Fallback to Web Speech API
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Apply options
        if (options.rate) utterance.rate = options.rate;
        if (options.pitch) utterance.pitch = options.pitch;
        if (options.volume) utterance.volume = options.volume;
        if (options.lang) utterance.lang = options.lang;
        
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        
        speechSynthesis.speak(utterance);
      } else {
        console.warn('Text-to-speech not supported');
      }
    } catch (error) {
      console.error('Failed to speak text:', error);
      setIsPlaying(false);
    }
  }, []);

  // Analyze audio for pronunciation feedback
  const analyzeAudio = useCallback(async (audioData, targetText) => {
    try {
      if (window.electronAPI?.analyzeAudio) {
        return await window.electronAPI.analyzeAudio(audioData, targetText);
      }
      
      // Fallback: basic analysis or mock response
      console.warn('Audio analysis not available');
      return {
        accuracy: Math.random() * 0.3 + 0.7, // Mock 70-100% accuracy
        feedback: 'Audio analysis not available in this environment',
        suggestions: []
      };
    } catch (error) {
      console.error('Failed to analyze audio:', error);
      return {
        accuracy: 0,
        feedback: 'Analysis failed',
        suggestions: []
      };
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const value = {
    isRecording,
    isPlaying,
    audioLevel,
    startRecording,
    stopRecording,
    playAudio,
    stopAudio,
    speakText,
    analyzeAudio,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}