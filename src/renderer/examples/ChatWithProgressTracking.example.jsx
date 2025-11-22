/**
 * Example: AI Chat Component with Progress Tracking
 * 
 * This shows how to integrate progress tracking into your chat components.
 * Copy the relevant parts into your actual chat component.
 */

import { useState, useEffect, useRef } from 'react';
import { useProgressTracking } from '../hooks/useProgressTracking';
import { Toaster } from 'react-hot-toast';

export function ChatWithProgressTracking() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  
  // Progress tracking hook
  const { trackChatMessage, trackChatSession } = useProgressTracking();
  
  // Session tracking
  const sessionIdRef = useRef(`chat_${Date.now()}`);
  const sessionStartRef = useRef(Date.now());
  const messageCountRef = useRef(0);

  // Track session end when component unmounts
  useEffect(() => {
    return () => {
      const duration = Math.round((Date.now() - sessionStartRef.current) / 60000);
      if (messageCountRef.current > 0) {
        trackChatSession({
          sessionId: sessionIdRef.current,
          duration,
          messageCount: messageCountRef.current
        });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    // Add message to UI
    const userMessage = {
      id: Date.now(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Track the message (awards 5 XP)
    await trackChatMessage({
      sessionId: sessionIdRef.current,
      messageCount: 1
    });
    
    messageCountRef.current += 1;

    // Send to AI and get response
    const aiResponse = await sendToAI(inputText);
    
    setMessages(prev => [...prev, {
      id: Date.now() + 1,
      text: aiResponse,
      sender: 'ai',
      timestamp: new Date()
    }]);

    setInputText('');
  };

  const sendToAI = async (text) => {
    // Your AI logic here
    return `AI response to: ${text}`;
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
      </div>

      <div className="input-area">
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>

      <Toaster position="bottom-right" />
    </div>
  );
}

// ============================================
// Alternative: If you have an existing chat component
// ============================================

/**
 * Minimal integration for existing chat components
 */
export function MinimalChatIntegration() {
  const { trackChatMessage, trackChatSession } = useProgressTracking();
  const sessionIdRef = useRef(`chat_${Date.now()}`);
  const sessionStartRef = useRef(Date.now());

  // Option 1: Track individual messages
  const handleMessageSent = async () => {
    // ... your existing message logic ...

    // Add this line:
    await trackChatMessage({ sessionId: sessionIdRef.current });
  };

  // Option 2: Track session end only
  useEffect(() => {
    return () => {
      const duration = Math.round((Date.now() - sessionStartRef.current) / 60000);
      trackChatSession({
        sessionId: sessionIdRef.current,
        duration,
        messageCount: /* your message count */
      });
    };
  }, []);

  return null; // Your actual component
}
