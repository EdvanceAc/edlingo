import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Square,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Zap,
  Waves,
  MessageCircle
} from 'lucide-react';
import { useProgress } from '../providers/ProgressProvider';
import { useToast } from '../hooks/use-toast';
import { useAI } from '../providers/AIProvider';
import supabaseGeminiService from '../services/supabaseGeminiService';
import ModernGeminiLiveService from '../services/modernGeminiLiveService';
import { createClient } from '@supabase/supabase-js';

const LiveConversation = () => {
  // Session state
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error

  // Audio state
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Conversation state
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState(''); // For interim STT results
  const [userInput, setUserInput] = useState('');
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false); // For AI response streaming
  const [streamingMessage, setStreamingMessage] = useState(''); // Current streaming content
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    duration: 0,
    messagesExchanged: 0,
    wordsSpoken: 0
  });
  const [sttWarning, setSttWarning] = useState(null);
const [audioOnly, setAudioOnly] = useState(true);

  // Voice settings
  const [voiceSettings, setVoiceSettings] = useState({
    language: 'en-US',
    voice: 'Alloy',
    speed: 1.0,
    pitch: 1.0
  });

  // Refs
  const messagesEndRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const sessionStartTime = useRef(null);
  const liveServiceRef = useRef(null);
  const userEndedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);

  const { addXP, level } = useProgress();
  const { toast } = useToast();
  const { isGeminiAvailable, getApiKey } = useAI();

  // Initialize live service
  useEffect(() => {
    if (!liveServiceRef.current) {
      liveServiceRef.current = ModernGeminiLiveService;
    }
    // Hydrate UI state if a session is already active (e.g., StrictMode remounts)
    const svc = liveServiceRef.current;
    try {
      if (svc && svc.isSessionActive && svc.isSessionActive()) {
        setIsSessionActive(true);
        setConnectionStatus('connected');
        if (svc.getSessionId) setSessionId(svc.getSessionId());
      }
    } catch {}
    // Gracefully end session on window unload (not during React StrictMode re-mounts)
    const handleBeforeUnload = () => {
      if (liveServiceRef.current && liveServiceRef.current.isSessionActive && liveServiceRef.current.isSessionActive()) {
        liveServiceRef.current.endLiveSession();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Duplicate handleLiveMessage removed

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle live message from Gemini (defined before effect to avoid TDZ)
  const handleLiveMessage = useCallback(async (message) => {
    if (message.type === 'text') {
      if (message.isComplete) {
        let shouldPlayAudio = false;
        let audioDataToPlay = null;
        
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          // Check if we already have this exact message to prevent duplicates
          const isDuplicate = newMessages.some(msg => 
            msg.type === 'ai' && 
            msg.content === message.content && 
            !msg.isStreaming
          );
          
          if (isDuplicate) {
            console.log('🚫 Duplicate message detected, skipping');
            return newMessages; // Don't add duplicate
          }
          
          if (lastMessage && lastMessage.isStreaming) {
            // Update existing streaming message
            lastMessage.content = message.content;
            lastMessage.isStreaming = false;
            lastMessage.timestamp = new Date().toLocaleTimeString();
            lastMessage.audioData = message.audioData; // Store audio data
            audioDataToPlay = message.audioData;
            shouldPlayAudio = true;
          } else {
            // Add new message
            const newMessage = {
              id: Date.now(),
              type: 'ai',
              content: message.content,
              timestamp: new Date().toLocaleTimeString(),
              isStreaming: false,
              audioData: message.audioData
            };
            newMessages.push(newMessage);
            audioDataToPlay = message.audioData;
            shouldPlayAudio = true;
          }
          return newMessages;
        });
        
        setIsAIResponding(false);
        setIsStreaming(false);
        setStreamingMessage('');
        addXP(10, 'conversation');
        
        // Store AI message in database
        if (sessionId && message.content) {
          try {
            await supabaseGeminiService.supabase
              .from('live_conversation_messages')
              .insert({
                session_id: sessionId,
                message_type: 'assistant',
                content: message.content
              });
          } catch (dbError) {
            console.warn('Failed to store AI message in database:', dbError);
          }
        }
        
        // Play TTS if speaker is enabled - prefer Zephyr audio over browser TTS
        if (isSpeakerEnabled && message.content && shouldPlayAudio) {
          const liveService = liveServiceRef.current;
          
          if (audioDataToPlay && liveService) {
            console.log('🎙️ Playing Zephyr voice from message');
            liveService.playZephyrAudio(audioDataToPlay);
          } else {
            console.log('🔊 Using browser TTS - no Zephyr audio available');
            const utterance = new SpeechSynthesisUtterance(message.content);
            window.speechSynthesis.speak(utterance);
          }
        }
      } else {
        setIsStreaming(true);
        setStreamingMessage(message.content);
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.isStreaming) {
            lastMessage.content = message.content;
          } else {
            newMessages.push({
              id: Date.now(),
              type: 'ai',
              content: message.content,
              timestamp: new Date().toLocaleTimeString(),
              isStreaming: true
            });
          }
          return newMessages;
        });
      }
    }
  }, [addXP, isSpeakerEnabled, sessionId]);

  // Set up enhanced STT/TTS event listeners
  useEffect(() => {
    const liveService = liveServiceRef.current;
    if (!liveService) return;

    // STT Event Handlers
    const handleSTTStart = () => {
      console.log('STT started');
      setIsRecording(true);
      setSttWarning(null);
    };

    const handleSTTInterim = (data) => {
      console.log('STT interim:', data.transcript);
      setCurrentMessage(data.transcript);
    };

    const handleSTTFinal = async (data) => {
      console.log('STT final:', data.transcript);
      setCurrentMessage('');
      
      // Add user message
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'user',
        content: data.transcript,
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        messagesExchanged: prev.messagesExchanged + 1,
        wordsSpoken: prev.wordsSpoken + data.transcript.split(' ').length
      }));
      
      // Store message in database
      if (sessionId) {
        try {
          await supabaseGeminiService.supabase
            .from('live_conversation_messages')
            .insert({
              session_id: sessionId,
              message_type: 'user',
              content: data.transcript,
              transcript: data.transcript
            });
        } catch (dbError) {
          console.warn('Failed to store message in database:', dbError);
        }
      }
    };

    const handleSTTEnd = () => {
      console.log('STT ended');
      setIsRecording(false);
    };

    const handleSTTError = (data) => {
      const level = data?.severity || 'error';
      const desc = data?.message || `Failed to recognize speech: ${data?.error || 'unknown'}`;
      if (level === 'warning') {
        console.warn('STT warning:', data?.error);
        setSttWarning(desc);
        toast({ title: 'Speech Warning', description: desc, variant: 'default' });
        return; // do not flip recording state for warnings
      }
      console.error('STT error:', data?.error);
      setIsRecording(false);
      toast({ title: 'Speech Recognition Error', description: desc, variant: 'destructive' });
    };

    // TTS Event Handlers
    const handleTTSStart = (data) => {
      console.log('TTS started:', data.text);
      setIsAIResponding(true);
    };

    const handleTTSEnd = () => {
      console.log('TTS ended');
      setIsAIResponding(false);
    };

    const handleTTSError = (data) => {
      console.error('TTS error:', data.error);
      setIsAIResponding(false);
      toast({
        title: "Text-to-Speech Error",
        description: `Failed to play audio: ${data.error}`,
        variant: "destructive"
      });
    };

    // Message Event Handler - removed duplicate, using useCallback version below

    const handleLiveError = (error) => {
      console.error('Live session error:', error);
      // Keep the session alive on transient errors; mark status as error but do not flip isSessionActive
      setConnectionStatus('error');
      setIsAIResponding(false);
      setIsConnecting(false);
      toast({
        title: "Live Session Warning",
        description: error?.error || "A temporary issue occurred. The session is still active.",
        variant: "destructive"
      });
    };

    const handleLiveClose = (data) => {
      console.log('Live session closed:', data);
      // Only mark closed if this is our current session or service reports inactive
      const svc = liveServiceRef.current;
      const stillActive = svc && svc.isSessionActive && svc.isSessionActive();
      const sameSession = data?.sessionId && data.sessionId === sessionId;
      if (!stillActive || sameSession) {
        setConnectionStatus('disconnected');
        setIsSessionActive(false);
        setSessionId(null);
        // If not a user-initiated end, attempt auto-reconnect
        if (!userEndedRef.current) {
          attemptReconnect();
        }
      }
      setIsConnecting(false);
      setIsRecording(false);
      setIsAIResponding(false);
    };

    // Audio Event Handlers
    const handleAudioQueued = (data) => {
      console.log('Audio queued due to autoplay policy:', data);
      toast({
        title: "Audio Requires Interaction",
        description: data.message || "Click anywhere to enable audio playback",
        variant: "default"
      });
    };

    const handleAudioError = (data) => {
      console.error('Audio playback error:', data.error);
      toast({
        title: "Audio Playback Failed",
        description: `Audio error: ${data.error}`,
        variant: "destructive"
      });
    };

    // Duplicate enableAudio definition removed (useCallback version below is the canonical implementation)


    const handleAudioEnabled = () => {
      console.log('Audio playback enabled');
      toast({
        title: "Audio Enabled",
        description: "Audio playback is now active",
        variant: "default"
      });
    };

    // Register all event listeners
    liveService.on('stt-start', handleSTTStart);
    liveService.on('stt-interim', handleSTTInterim);
    liveService.on('stt-final', handleSTTFinal);
    liveService.on('stt-end', handleSTTEnd);
    liveService.on('stt-error', handleSTTError);

    liveService.on('tts-start', handleTTSStart);
    liveService.on('tts-end', handleTTSEnd);
    liveService.on('tts-error', handleTTSError);

    liveService.on('message', handleLiveMessage);
    liveService.on('error', handleLiveError);
    liveService.on('close', handleLiveClose);

    // Audio events
    liveService.on('audioQueued', handleAudioQueued);
    liveService.on('audioError', handleAudioError);
    liveService.on('audioEnabled', handleAudioEnabled);

    return () => {
      liveService.off('stt-start', handleSTTStart);
      liveService.off('stt-interim', handleSTTInterim);
      liveService.off('stt-final', handleSTTFinal);
      liveService.off('stt-end', handleSTTEnd);
      liveService.off('stt-error', handleSTTError);

      liveService.off('tts-start', handleTTSStart);
      liveService.off('tts-end', handleTTSEnd);
      liveService.off('tts-error', handleTTSError);

      liveService.off('message', handleLiveMessage);
      liveService.off('error', handleLiveError);
      liveService.off('close', handleLiveClose);

      liveService.off('audioQueued', handleAudioQueued);
      liveService.off('audioError', handleAudioError);
      liveService.off('audioEnabled', handleAudioEnabled);
    };
  }, [addXP, toast, handleLiveMessage]);



  

  // Handle audio response
  const handleAudioResponse = useCallback((audioData) => {
    if (isSpeakerEnabled && audioData) {
      playAudioResponse(audioData);
    }
  }, [isSpeakerEnabled]);

  // Enable audio on user interaction
  const enableAudio = useCallback(async () => {
    try {
      const svc = liveServiceRef.current;
      if (!svc) return;
      const res = await svc.unlockAudio();
      if (res?.success) {
        toast({ title: 'Audio Enabled', description: 'Queued audio will play', variant: 'default' });
      } else {
        toast({ title: 'Enable Audio Failed', description: 'Tap again to allow playback', variant: 'destructive' });
      }
    } catch (e) {
      console.error('Enable audio error:', e);
      toast({ title: 'Audio Error', description: String(e?.message || e), variant: 'destructive' });
    }
  }, [toast]);

  // Start live session with enhanced STT/TTS
  const startLiveSession = useCallback(async () => {
    console.log('Starting live session...');
    
    if (!isGeminiAvailable()) {
      console.log('Gemini not available locally; proceeding with Supabase server-side live conversation');
      toast({
        title: "Server-side AI",
        description: "Proceeding with Supabase live conversation.",
        variant: "default"
      });
      // Continue without local API key; Supabase Edge Functions will handle requests
    }

    const liveService = liveServiceRef.current;
    if (!liveService) {
      toast({
        title: "Service Error",
        description: "Live service is not available.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Setting connection status to connecting...');
      setConnectionStatus('connecting');
      setIsConnecting(true);
      setIsLoading(true);
      userEndedRef.current = false;
      reconnectAttemptsRef.current = 0;
      
      // Get API key (optional). If absent, we'll run in server-side mode via Supabase.
      const apiKey = getApiKey();
      if (!apiKey) {
        console.log('No local Gemini API key found; initializing without key (Supabase will handle requests)');
      }
      
      console.log('Initializing live service...');
      const initResult = await liveService.initialize(apiKey, {
        model: 'models/gemini-2.0-flash-exp',
        voiceName: 'Zephyr',
        systemInstruction: `You are a helpful language learning assistant. User level: ${level ? level.toString() : 'intermediate'}. Language focus: ${voiceSettings.language}.`
      });
      
      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initialize live service');
      }
      
      console.log('Live service initialized, starting session...');
      const sessionResult = await liveService.startLiveSession({
        autoStartSTT: false,
        language: voiceSettings.language
      });
      
      if (!sessionResult.success) {
        throw new Error(sessionResult.error || 'Failed to start live session');
      }
      
      console.log('Live session started successfully');
      
      // Create a new session for live conversation
      const newSessionId = sessionResult.sessionId || crypto.randomUUID();
      console.log('Created new session:', newSessionId);
      
      // Track session in database
      try {
        // Ensure supabaseGeminiService is initialized
        await supabaseGeminiService.initialize();
        
        const { data: { user } } = await supabaseGeminiService.supabase.auth.getUser();
        if (user) {
          await supabaseGeminiService.supabase
            .from('live_conversation_sessions')
            .insert({
              user_id: user.id,
              session_id: newSessionId,
              language: voiceSettings.language,
              user_level: level || 'intermediate',
              focus_area: 'conversation'
            });
        }
      } catch (dbError) {
        console.warn('Failed to track session in database:', dbError);
      }
      
      setSessionId(newSessionId);
      setConnectionStatus('connected');
      setIsSessionActive(true);
      
      setMessages([{
        id: Date.now(),
        type: 'system',
        content: '🎙️ Live conversation started! You can now use voice or text to practice English conversation.',
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      // Start session timer and auto-start STT with small delay (uses fallback if needed)
      sessionStartTime.current = Date.now();
      setTimeout(async () => {
        try {
          await liveService.startRecording();
        } catch (sttErr) {
          console.warn('Failed to auto-start STT:', sttErr);
        }
      }, 400);
      
      toast({
        title: "Live Session Started",
        description: "Voice and text conversation is now active!"
      });
    } catch (error) {
      console.error('Failed to start session:', error);
      setConnectionStatus('error');
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to start live session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
      setIsLoading(false);
    }
  }, [isGeminiAvailable, toast, voiceSettings.language, isMicEnabled, level]);

  // End live session
  const endLiveSession = useCallback(async () => {
    try {
      setIsLoading(true);
      userEndedRef.current = true;
      
      // End live service session
      const liveService = liveServiceRef.current;
      if (liveService) {
        await liveService.endLiveSession();
      }
      
      // Calculate final session stats
      if (sessionStartTime.current) {
        const duration = Math.floor((Date.now() - sessionStartTime.current) / 1000);
        setSessionStats(prev => ({ ...prev, duration }));
      }
      
      // Clear Supabase session and update database
      if (sessionId) {
        try {
          // Ensure supabaseGeminiService is initialized
          await supabaseGeminiService.initialize();
          
          // Update session end time and stats in database
          const { data: { user } } = await supabaseGeminiService.supabase.auth.getUser();
          if (user) {
            await supabaseGeminiService.supabase
              .from('live_conversation_sessions')
              .update({
                ended_at: new Date().toISOString(),
                messages_exchanged: sessionStats.messagesExchanged,
                words_spoken: sessionStats.wordsSpoken,
                is_active: false
              })
              .eq('session_id', sessionId)
              .eq('user_id', user.id);
          }
          
          await supabaseGeminiService.clearSession(sessionId);
          console.log('Supabase session cleared and database updated');
        } catch (error) {
          console.warn('Failed to clear Supabase session:', error);
        }
      }
      
      // Reset state
      setIsSessionActive(false);
      setSessionId(null);
      setConnectionStatus('disconnected');
      setIsRecording(false);
      setIsStreaming(false);
      setStreamingMessage('');
      
      // Add session end message
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: `Session ended. Duration: ${sessionStartTime.current ? Math.floor((Date.now() - sessionStartTime.current) / 1000) : 0}s, Messages: ${sessionStats.messagesExchanged}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      toast({
        title: "Session Ended",
        description: "Your live conversation session has been ended."
      });
    } catch (error) {
      console.error('Failed to end session:', error);
      toast({
        title: "Error",
        description: "Failed to properly end the session.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionStats.messagesExchanged, toast]);

  // Attempt to automatically reconnect the live session after unexpected close
  const attemptReconnect = useCallback(async () => {
    if (userEndedRef.current) return; // do not auto-reconnect after user ends
    const maxAttempts = 3;
    if (reconnectAttemptsRef.current >= maxAttempts) {
      console.warn('Max auto-reconnect attempts reached');
      return;
    }
    reconnectAttemptsRef.current += 1;
    const backoffMs = 1000 * reconnectAttemptsRef.current; // 1s, 2s, 3s
    console.log(`Attempting live session auto-reconnect in ${backoffMs}ms (attempt ${reconnectAttemptsRef.current}/${maxAttempts})`);
    setConnectionStatus('connecting');
    setIsConnecting(true);
    setTimeout(async () => {
      try {
        const liveService = liveServiceRef.current;
        if (!liveService) return;
        const apiKey = getApiKey();
        if (!apiKey) {
          console.log('No local Gemini API key found during reconnect; continuing with server-side mode');
        }
        const initResult = await liveService.initialize(apiKey, {
          model: 'models/gemini-2.0-flash-exp',
          voiceName: 'Zephyr',
          systemInstruction: `You are a helpful language learning assistant. User level: ${level ? level.toString() : 'intermediate'}. Language focus: ${voiceSettings.language}.`
        });
        if (!initResult?.success) throw new Error(initResult?.error || 'Init failed');
        const sessionResult = await liveService.startLiveSession({ language: voiceSettings.language });
        if (!sessionResult?.success) throw new Error(sessionResult?.error || 'Start failed');
        const newSessionId = sessionResult.sessionId || crypto.randomUUID();
        setSessionId(newSessionId);
        setConnectionStatus('connected');
        setIsSessionActive(true);
        sessionStartTime.current = Date.now();
        toast({ title: 'Reconnected', description: 'Live session has been restored.' });
      } catch (err) {
        console.error('Auto-reconnect failed:', err);
        // Try again if under max attempts
        if (!userEndedRef.current && reconnectAttemptsRef.current < 3) {
          attemptReconnect();
        } else {
          setConnectionStatus('error');
          setIsConnecting(false);
          toast({ title: 'Connection Lost', description: 'Could not restore the live session.', variant: 'destructive' });
        }
      }
    }, backoffMs);
  }, [getApiKey, level, toast, voiceSettings.language]);

  // Toggle speech recognition
  const toggleRecording = async () => {
    if (!isSessionActive) {
      toast({
        title: "No Active Session",
        description: "Please start a live session first.",
        variant: "destructive"
      });
      return;
    }

    if (!isMicEnabled) {
      toast({
        title: "Microphone Disabled",
        description: "Please enable the microphone first.",
        variant: "destructive"
      });
      return;
    }

    const liveService = liveServiceRef.current;
    if (!liveService) {
      toast({
        title: "Service Error",
        description: "Live service is not available.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isRecording) {
        await liveService.stopRecording();
        toast({
          title: "Speech Recognition Stopped",
          description: "Voice input has been disabled."
        });
      } else {
        await liveService.startRecording();
        toast({
          title: "Speech Recognition Started",
          description: "Listening for your voice input..."
        });
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
      setIsRecording(false);
      toast({
        title: "Speech Recognition Error",
        description: error.message || "Failed to control speech recognition.",
        variant: "destructive"
      });
    }
  };

  // Stop TTS playback
  const stopTTS = () => {
    // TTS functionality will be handled by browser's built-in speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsAIResponding(false);
    toast({
      title: "Audio Stopped",
      description: "Text-to-speech playback has been stopped."
    });
  };

  // Retry STT after warning
  const retrySTT = async () => {
    const liveService = liveServiceRef.current;
    if (!isSessionActive || !liveService) return;
    try {
      await liveService.startRecording();
      setSttWarning(null);
      toast({ title: 'Listening Resumed', description: 'Speech recognition restarted.' });
    } catch (error) {
      console.error('Failed to retry STT:', error);
      toast({ title: 'Retry Failed', description: error.message || 'Could not restart listening.', variant: 'destructive' });
    }
  };

  // Play audio response (handled automatically by TTS service)
  const playAudioResponse = async (audioData) => {
    // Audio playback is now handled automatically by the TTS service
    // This function is kept for compatibility but may not be needed
    console.log('Audio response received:', audioData);
  };

  // Send text message
  const sendTextMessage = async (text) => {
    if (!text.trim() || !sessionId || !isSessionActive) return;
    
    const liveService = liveServiceRef.current;
    if (!liveService) {
      toast({
        title: "Service Error",
        description: "Live service is not available.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsAIResponding(true);
      
      // Add user message if not already added (for typed messages)
      if (!messages.some(msg => msg.content === text && msg.type === 'user')) {
        const userMessage = {
          id: Date.now(),
          type: 'user',
          content: text,
          timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        // Update session stats
        setSessionStats(prev => ({
          ...prev,
          messagesExchanged: prev.messagesExchanged + 1,
          wordsSpoken: prev.wordsSpoken + text.split(' ').length
        }));
      }
      
      // Send message via live service
      const response = await liveService.sendMessage(text);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }
      
      // Award XP for sending message
      addXP(5, 'conversation');
      
      // The live service handles responses through event listeners
      // Response will come through handleLiveMessage callback
      setIsAIResponding(false);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        content: `Failed to send message: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
      setIsAIResponding(false);
    }
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    setCurrentMessage('');
  };

  // Get status color
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Radio className={`w-6 h-6 ${isSessionActive ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
              <div>
                <h1 className="text-xl font-bold text-foreground">Live Conversation</h1>
                <p className={`text-sm ${getStatusColor()}`}>
                  {getStatusText()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Audio Controls */}
            <button
              onClick={() => setIsMicEnabled(!isMicEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                isMicEnabled 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
              title={isMicEnabled ? 'Disable microphone' : 'Enable microphone'}
            >
              {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setIsSpeakerEnabled(!isSpeakerEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                isSpeakerEnabled 
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isSpeakerEnabled ? 'Disable speaker' : 'Enable speaker'}
            >
              {isSpeakerEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-lg transition-colors ${voiceEnabled ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title={voiceEnabled ? 'Disable voice features' : 'Enable voice features'}
            >
              <Waves className="w-4 h-4" />
            </button>
            
            {/* Clear conversation */}
            <button
              onClick={clearConversation}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Clear conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {audioOnly ? (
          <div className="flex h-full items-center justify-center">
            <div className="bg-card border border-border rounded-lg p-4 text-center max-w-md">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Waves className="w-5 h-5 text-purple-600" />
                <span className="font-medium">Audio-only mode</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Speak to converse. Text messages are hidden in this mode.
              </p>
              {currentMessage && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    &quot;{currentMessage}&quot;
                    <span className="inline-block w-1 h-4 bg-blue-500 opacity-75 animate-pulse ml-1">|</span>
                  </p>
                </div>
              )}
              {isAIResponding && (
                <div className="mt-3 flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>AI is responding...</span>
                </div>
              )}
              {sttWarning && (
                <div className="mt-3 p-3 rounded-md border border-yellow-300 bg-yellow-50 text-yellow-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{sttWarning}</span>
                    <button
                      onClick={retrySTT}
                      className="ml-3 px-3 py-1 rounded bg-yellow-600 text-white hover:bg-yellow-700 text-xs"
                    >
                      Retry now
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.type === 'system'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : message.type === 'error'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-card border border-border'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.type === 'ai' && (
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Zap className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">
                          {message.content}
                          {message.isStreaming && (
                            <span className="inline-block w-2 h-4 bg-current opacity-75 animate-pulse ml-1">|</span>
                          )}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs opacity-70">{message.timestamp}</span>
                          {message.isRecording && (
                            <span className="text-xs text-red-500">● Recording</span>
                          )}
                          {message.isStreaming && (
                            <div className="flex items-center space-x-1 text-xs opacity-70">
                              <Radio className="w-3 h-3 animate-pulse" />
                              <span>streaming</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* Show streaming message if active */}
              {isStreaming && streamingMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[80%] rounded-lg p-3 bg-card border border-border">
                    <div className="flex items-start space-x-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Zap className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">
                          {streamingMessage}
                          <span className="inline-block w-2 h-4 bg-current opacity-75 animate-pulse ml-1">|</span>
                        </p>
                        <div className="text-xs opacity-70 mt-2">
                          Streaming...
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* AI Responding Indicator */}
            {isAIResponding && !currentMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex items-center space-x-1">
                      <Waves className="w-4 h-4 animate-pulse" />
                      <span className="text-sm text-muted-foreground">AI is responding...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

          {/* Controls Area */}
          <div className="bg-card border-t border-border p-4">
            {!isSessionActive ? (
              /* Start Session Button */
              <div className="flex justify-center">
                <button
                  onClick={startLiveSession}
                  disabled={isConnecting}
                  className="flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isConnecting ? (
                    <>
                      <Radio className="w-5 h-5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      <span>Start Live Conversation</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Active Session Controls */
              <div className="space-y-4">
                {/* Voice Controls */}
                <div className="flex items-center justify-center space-x-4">
                  {/* Speech Recognition Toggle */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={toggleRecording}
                      disabled={!isMicEnabled || isLoading}
                      className={`relative p-4 rounded-full transition-all duration-200 ${
                        isRecording
                          ? 'bg-red-500 text-white scale-110 shadow-lg animate-pulse'
                          : isMicEnabled
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title={isRecording ? 'Stop listening' : isMicEnabled ? 'Start listening' : 'Microphone disabled'}
                    >
                      {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                      {isRecording && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-white"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                    </button>
                    
                    {/* Voice Activity Indicator */}
                    {isRecording && (
                      <div className="flex flex-col items-center space-y-1">
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-1 bg-green-500 rounded-full"
                              animate={{
                                height: [4, Math.random() * 16 + 4, 4]
                              }}
                              transition={{
                                duration: 0.5 + Math.random() * 0.5,
                                repeat: Infinity,
                                repeatType: "reverse"
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-green-600 font-medium">Listening...</span>
                      </div>
                    )}
                    
                    {/* Current Speech Display */}
                    {currentMessage && (
                      <div className="max-w-xs p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          &quot;{currentMessage}&quot;
                          <span className="inline-block w-1 h-4 bg-blue-500 opacity-75 animate-pulse ml-1">|</span>
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* TTS Control */}
                  {isAIResponding && (
                    <button
                      onClick={stopTTS}
                      className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      title="Stop AI speech"
                    >
                      <VolumeX className="w-5 h-5" />
                    </button>
                  )}
                  
                  {/* Audio Enable Button */}
                  <button
                    onClick={enableAudio}
                    className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    title="Enable audio playback"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                  
                  {/* End Session Button */}
                  <button
                    onClick={endLiveSession}
                    className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    title="End conversation"
                  >
                    <Square className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Text Input */}
                {!audioOnly && (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 p-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => sendTextMessage(userInput)}
                      className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                      disabled={isAIResponding || !isSessionActive || !userInput.trim()}
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
    </div>
  );
};

export default LiveConversation;