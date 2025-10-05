import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import supabaseGeminiService from '../services/supabaseGeminiService';

const SupabaseGeminiTest = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    console.log('🧪 SupabaseGeminiTest: Starting message send:', message);
    setLoading(true);
    setError('');
    setResponse('');
    
    try {
      console.log('🧪 SupabaseGeminiTest: Calling supabaseGeminiService.sendMessage');
      const result = await supabaseGeminiService.sendMessage(message, {
        userLevel: 'intermediate',
        focusArea: 'conversation'
      });
      
      console.log('🧪 SupabaseGeminiTest: Received result:', result);
      
      if (result.success) {
        setResponse(result.message);
        console.log('🧪 SupabaseGeminiTest: Success - message set');
      } else {
        setError(result.error || 'Failed to get response');
        console.log('🧪 SupabaseGeminiTest: Error in result:', result.error);
      }
    } catch (err) {
      console.log('🧪 SupabaseGeminiTest: Caught exception:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('🧪 SupabaseGeminiTest: Message send completed');
    }
  };

  if (!user) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
        <p>Please log in to test Supabase Gemini integration.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Supabase Gemini Test</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Test Message:
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder="Enter a message to test Gemini via Supabase..."
        />
      </div>
      
      <button
        onClick={handleSendMessage}
        disabled={loading || !message.trim()}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending...' : 'Send Message'}
      </button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
          <h3 className="font-semibold text-red-800">Error:</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {response && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded">
          <h3 className="font-semibold text-green-800">Gemini Response:</h3>
          <p className="text-green-700 whitespace-pre-wrap">{response}</p>
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-600">
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Status:</strong> Testing Supabase → Gemini integration</p>
      </div>
    </div>
  );
};

export default SupabaseGeminiTest;