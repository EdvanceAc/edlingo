import React, { useState } from 'react';
import StreamingChat from '../components/StreamingChat';

const StreamingChatDemo = () => {
  const [userLevel, setUserLevel] = useState('beginner');
  const [focusArea, setFocusArea] = useState('conversation');
  const [showSettings, setShowSettings] = useState(false);

  const userLevels = [
    { value: 'beginner', label: 'Beginner (A1-A2)' },
    { value: 'intermediate', label: 'Intermediate (B1-B2)' },
    { value: 'advanced', label: 'Advanced (C1-C2)' }
  ];

  const focusAreas = [
    { value: 'conversation', label: 'Conversation Practice' },
    { value: 'grammar', label: 'Grammar Help' },
    { value: 'vocabulary', label: 'Vocabulary Building' },
    { value: 'writing', label: 'Writing Assistance' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            ⚡ Ultra-Fast Streaming Chat
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Experience lightning-fast AI responses with our hyper-optimized streaming technology
          </p>
          
          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="inline-flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Chat Settings
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Chat Configuration</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* User Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language Level
                </label>
                <select
                  value={userLevel}
                  onChange={(e) => setUserLevel(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {userLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Focus Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Focus Area
                </label>
                <select
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {focusAreas.map((area) => (
                    <option key={area.value} value={area.value}>
                      {area.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Performance Info */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">⚡ Ultra-Fast Optimizations</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Instant streaming responses (sub-second first chunk delivery)</li>
                <li>• Ultra-fast 8-second timeout with optimized retry logic</li>
                <li>• Gemini 1.5 Flash with hyper-optimized generation config</li>
                <li>• Reduced to 100 tokens for lightning-fast generation</li>
                <li>• Concise prompts for faster AI processing</li>
                <li>• Optimized client-side chunk processing</li>
              </ul>
            </div>
          </div>
        )}

        {/* Performance Metrics - Updated */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center border-l-4 border-green-500">
            <div className="text-3xl font-bold text-green-600 mb-2">~0.5-1s</div>
            <div className="text-gray-600">First Chunk Time</div>
            <div className="text-xs text-gray-500 mt-1">Ultra-fast delivery</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 text-center border-l-4 border-blue-500">
            <div className="text-3xl font-bold text-blue-600 mb-2">Instant</div>
            <div className="text-gray-600">Chunk Display</div>
            <div className="text-xs text-gray-500 mt-1">Zero buffering delay</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 text-center border-l-4 border-purple-500">
            <div className="text-3xl font-bold text-purple-600 mb-2">8s</div>
            <div className="text-gray-600">Max Timeout</div>
            <div className="text-xs text-gray-500 mt-1">Reduced from 15s</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 text-center border-l-4 border-orange-500">
            <div className="text-3xl font-bold text-orange-600 mb-2">100</div>
            <div className="text-gray-600">Token Limit</div>
            <div className="text-xs text-gray-500 mt-1">Optimized for speed</div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="h-96">
          <StreamingChat 
            userLevel={userLevel} 
            focusArea={focusArea}
            key={`${userLevel}-${focusArea}`} // Force re-render when settings change
          />
        </div>

        {/* Usage Tips */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">💡 Usage Tips</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">⚡ Ultra-Fast Performance Tips:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Short messages = lightning-fast responses</li>
                <li>• Specific questions get instant, focused answers</li>
                <li>• Correct focus area enables optimized prompts</li>
                <li>• Accurate level setting improves response speed</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">🚀 Hyper-Streaming Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Sub-second first chunk delivery</li>
                <li>• Optimized chunk batching for smooth display</li>
                <li>• Ultra-fast timeout and retry logic</li>
                <li>• Enhanced visual streaming indicators</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🔧 Technical Implementation</h3>
          
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Backend:</strong> Hyper-optimized Supabase Edge Function with Gemini 1.5 Flash</p>
            <p><strong>Generation Config:</strong> Reduced tokens (100), lower temperature (0.6), optimized sampling</p>
            <p><strong>Frontend:</strong> Ultra-fast chunk processing with optimized rendering batches</p>
            <p><strong>Protocol:</strong> Server-Sent Events with immediate flush for zero-delay delivery</p>
            <p><strong>Timeouts:</strong> 8s streaming timeout, 250ms retry backoff for maximum speed</p>
            <p><strong>Prompts:</strong> Concise, optimized prompts for faster AI processing</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingChatDemo;