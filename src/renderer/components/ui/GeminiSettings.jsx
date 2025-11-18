import React, { useState } from 'react';
import { useAI } from '../../providers/AIProvider';
import Button from './Button';
import { Input } from './Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
import { Alert, AlertDescription } from './alert';
import { CheckCircle, XCircle } from 'lucide-react';

const GeminiSettings = () => {
  const { aiSettings, configureGemini, disableGemini, isGeminiAvailable, getAIStatus } = useAI();
  const [apiKey, setApiKey] = useState(aiSettings.geminiApiKey || '');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [message, setMessage] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleConfigure = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter a valid API key' });
      return;
    }

    setIsConfiguring(true);
    setMessage(null);

    try {
      const result = await configureGemini(apiKey.trim());
      if (result.success) {
        setMessage({ type: 'success', text: 'Gemini configured successfully!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to configure Gemini' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to configure Gemini: ' + error.message });
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleDisable = async () => {
    try {
      await disableGemini();
      setMessage({ type: 'success', text: 'Gemini disabled successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disable Gemini: ' + error.message });
    }
  };

  const isGeminiReady = isGeminiAvailable();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          
          Gemini AI Configuration
        </CardTitle>
        <CardDescription>
          Configure Google's Gemini AI for enhanced language learning responses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicator */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
          {isGeminiReady ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700">Gemini is active and ready</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Gemini is not configured</span>
            </>
          )}
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <label htmlFor="gemini-api-key" className="text-sm font-medium">
            Gemini API Key
          </label>
          <div className="relative">
            <Input
              id="gemini-api-key"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="pr-20"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Get your API key from{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Google AI Studio
            </a>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleConfigure}
            disabled={isConfiguring || !apiKey.trim()}
            className="flex-1"
          >
            {isConfiguring ? 'Configuring...' : 'Configure Gemini'}
          </Button>
          {aiSettings.useGemini && (
            <Button
              variant="outline"
              onClick={handleDisable}
              className="px-3"
            >
              Disable
            </Button>
          )}
        </div>

        {/* Message Display */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Gemini provides more accurate and contextual language learning responses</p>
          <p>• Your API key is stored locally and never shared</p>
          <p>• You can disable Gemini anytime to use fallback providers</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeminiSettings;