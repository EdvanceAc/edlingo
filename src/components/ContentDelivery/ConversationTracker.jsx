// Conversation Engagement Tracker Component
// Monitors and analyzes user conversation engagement for progression requirements

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { 
  MessageCircle, 
  Send, 
  Clock, 
  Target, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  BarChart3, 
  Brain, 
  Zap, 
  Timer,
  MessageSquare,
  Users,
  Award,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import conversationEngagementService from '../../services/conversationEngagementService';
import { analyzeTextComplexity } from '../../utils/readability';

const ConversationTracker = ({ 
  moduleId, 
  requiredEngagement = 80, 
  minTurns = 10, 
  minDuration = 300, // 5 minutes
  onEngagementMet,
  className = ""
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [sessionId, setSessionId] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionStats, setSessionStats] = useState({
    turns: 0,
    duration: 0,
    engagementScore: 0,
    avgResponseLength: 0,
    vocabularyDiversity: 0,
    grammarScore: 0,
    topicRelevance: 0
  });
  const [requirements, setRequirements] = useState({
    minTurns: minTurns,
    minDuration: minDuration,
    minEngagement: requiredEngagement
  });
  const [progressMetrics, setProgressMetrics] = useState({
    turnsProgress: 0,
    durationProgress: 0,
    engagementProgress: 0
  });
  const [aiPartner, setAiPartner] = useState({
    name: 'Sofia',
    personality: 'friendly',
    level: 'intermediate'
  });
  const [conversationTopic, setConversationTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [lastActivity, setLastActivity] = useState(null);

  // Initialize conversation session
  const startConversation = async (topic = '') => {
    try {
      setLoading(true);
      
      const session = await conversationEngagementService.startSession(
        user.id,
        moduleId,
        {
          topic: topic || 'general',
          aiPartner: aiPartner,
          requirements: requirements
        }
      );
      
      setSessionId(session.id);
      setIsActive(true);
      setStartTime(Date.now());
      setLastActivity(Date.now());
      setConversationTopic(topic || 'general conversation');
      
      // Add initial AI message
      const welcomeMessage = generateWelcomeMessage(topic);
      setMessages([{
        id: 1,
        sender: 'ai',
        content: welcomeMessage,
        timestamp: new Date().toISOString(),
        analysis: null
      }]);
      
      toast({
        title: "Conversation Started",
        description: `Let's practice ${topic || 'conversation'}! Try to be engaging and natural.`,
        variant: "default"
      });
      
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate contextual welcome message
  const generateWelcomeMessage = (topic) => {
    const welcomeMessages = {
      'travel': `¡Hola! I'm Sofia, your conversation partner. I love talking about travel! Have you been to any interesting places recently?`,
      'food': `Hi there! I'm Sofia. I'm passionate about food and cooking. What's your favorite dish to cook or eat?`,
      'hobbies': `Hello! I'm Sofia. I enjoy learning about different hobbies. What do you like to do in your free time?`,
      'work': `Hi! I'm Sofia. I find different careers fascinating. What kind of work do you do or want to do?`,
      'family': `¡Hola! I'm Sofia. Family is so important! Tell me about your family or someone special to you.`,
      'general': `Hello! I'm Sofia, your AI conversation partner. I'm here to help you practice your language skills. What would you like to talk about today?`
    };
    
    return welcomeMessages[topic] || welcomeMessages['general'];
  };

  // Send user message
  const sendMessage = async () => {
    if (!currentMessage.trim() || !sessionId || loading) return;
    
    try {
      setLoading(true);
      
      const userMessage = {
        id: messages.length + 1,
        sender: 'user',
        content: currentMessage.trim(),
        timestamp: new Date().toISOString(),
        analysis: null
      };
      
      // Add user message to chat
      setMessages(prev => [...prev, userMessage]);
      
      // Analyze user message
      const messageAnalysis = await analyzeUserMessage(currentMessage.trim());
      
      // Record turn in engagement service
      await conversationEngagementService.recordTurn(
        sessionId,
        currentMessage.trim(),
        messageAnalysis
      );
      
      // Update user message with analysis
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id 
          ? { ...msg, analysis: messageAnalysis }
          : msg
      ));
      
      // Generate AI response
      const aiResponse = await generateAIResponse(currentMessage.trim(), messageAnalysis);
      
      const aiMessage = {
        id: messages.length + 2,
        sender: 'ai',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        analysis: null
      };
      
      // Add AI response
      setMessages(prev => [...prev, aiMessage]);
      
      // Update session statistics
      await updateSessionStats();
      
      // Clear input
      setCurrentMessage('');
      setLastActivity(Date.now());
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Analyze user message for engagement metrics
  const analyzeUserMessage = async (message) => {
    try {
      // Text complexity analysis
      const complexity = analyzeTextComplexity(message);
      
      // Length analysis
      const wordCount = message.split(/\s+/).length;
      const charCount = message.length;
      
      // Vocabulary diversity (unique words / total words)
      const words = message.toLowerCase().match(/\b\w+\b/g) || [];
      const uniqueWords = new Set(words);
      const vocabularyDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;
      
      // Grammar score (basic heuristics)
      const grammarScore = calculateBasicGrammarScore(message);
      
      // Topic relevance (keyword matching)
      const topicRelevance = calculateTopicRelevance(message, conversationTopic);
      
      // Engagement indicators
      const hasQuestion = /\?/.test(message);
      const hasEmotionalWords = /\b(love|like|enjoy|hate|excited|happy|sad|amazing|wonderful|terrible)\b/i.test(message);
      const hasPersonalReference = /\b(I|me|my|myself|we|us|our)\b/i.test(message);
      
      return {
        wordCount,
        charCount,
        vocabularyDiversity: Math.round(vocabularyDiversity * 100),
        grammarScore: Math.round(grammarScore),
        topicRelevance: Math.round(topicRelevance),
        complexity: complexity,
        engagementIndicators: {
          hasQuestion,
          hasEmotionalWords,
          hasPersonalReference
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Failed to analyze message:', error);
      return {
        wordCount: message.split(/\s+/).length,
        charCount: message.length,
        vocabularyDiversity: 50,
        grammarScore: 70,
        topicRelevance: 60,
        complexity: { level: 2, fleschReadingEase: 60 },
        engagementIndicators: { hasQuestion: false, hasEmotionalWords: false, hasPersonalReference: false }
      };
    }
  };

  // Calculate basic grammar score using heuristics
  const calculateBasicGrammarScore = (message) => {
    let score = 100;
    
    // Check for basic punctuation
    if (!/[.!?]$/.test(message.trim())) {
      score -= 10;
    }
    
    // Check for capitalization at start
    if (!/^[A-Z]/.test(message.trim())) {
      score -= 10;
    }
    
    // Check for common grammar patterns
    const commonErrors = [
      /\bi\s/g, // lowercase 'i'
      /\s{2,}/g, // multiple spaces
      /[.!?]{2,}/g, // multiple punctuation
    ];
    
    commonErrors.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) {
        score -= matches.length * 5;
      }
    });
    
    return Math.max(0, Math.min(100, score));
  };

  // Calculate topic relevance
  const calculateTopicRelevance = (message, topic) => {
    const topicKeywords = {
      'travel': ['trip', 'vacation', 'country', 'city', 'plane', 'hotel', 'tourist', 'visit', 'culture', 'language'],
      'food': ['eat', 'cook', 'recipe', 'restaurant', 'delicious', 'taste', 'meal', 'dinner', 'lunch', 'breakfast'],
      'hobbies': ['hobby', 'fun', 'enjoy', 'play', 'sport', 'music', 'read', 'watch', 'game', 'activity'],
      'work': ['job', 'work', 'career', 'office', 'business', 'company', 'colleague', 'boss', 'salary', 'professional'],
      'family': ['family', 'mother', 'father', 'sister', 'brother', 'parent', 'child', 'relative', 'home', 'love']
    };
    
    const keywords = topicKeywords[topic] || [];
    if (keywords.length === 0) return 70; // Default for general conversation
    
    const messageLower = message.toLowerCase();
    const matchCount = keywords.filter(keyword => messageLower.includes(keyword)).length;
    
    return Math.min(100, (matchCount / keywords.length) * 100 + 30); // Base score of 30
  };

  // Generate AI response
  const generateAIResponse = async (userMessage, analysis) => {
    try {
      // Simple response generation based on user input and analysis
      const responses = {
        high_engagement: [
          "That's really interesting! Tell me more about that.",
          "I love how you explained that! What else can you share?",
          "Your perspective is fascinating. Can you give me an example?",
          "That sounds amazing! How did that make you feel?"
        ],
        medium_engagement: [
          "That's nice! Can you tell me more details?",
          "Interesting! What do you think about that?",
          "I see. How long have you been interested in this?",
          "That's good to know. What's your favorite part?"
        ],
        low_engagement: [
          "Can you tell me more? I'd love to hear your thoughts.",
          "What do you think about this topic?",
          "I'm curious to learn more. Can you share some details?",
          "That's a start! What else comes to mind?"
        ]
      };
      
      // Determine engagement level
      const engagementLevel = analysis.wordCount > 15 && analysis.vocabularyDiversity > 60 
        ? 'high_engagement'
        : analysis.wordCount > 8 
        ? 'medium_engagement' 
        : 'low_engagement';
      
      const responseOptions = responses[engagementLevel];
      const randomResponse = responseOptions[Math.floor(Math.random() * responseOptions.length)];
      
      return randomResponse;
      
    } catch (error) {
      console.error('Failed to generate AI response:', error);
      return "That's interesting! Can you tell me more?";
    }
  };

  // Update session statistics
  const updateSessionStats = async () => {
    if (!sessionId) return;
    
    try {
      const stats = await conversationEngagementService.getSessionStats(sessionId);
      setSessionStats(stats);
      
      // Update progress metrics
      const turnsProgress = Math.min(100, (stats.turns / requirements.minTurns) * 100);
      const durationProgress = Math.min(100, (stats.duration / requirements.minDuration) * 100);
      const engagementProgress = Math.min(100, (stats.engagementScore / requirements.minEngagement) * 100);
      
      setProgressMetrics({
        turnsProgress: Math.round(turnsProgress),
        durationProgress: Math.round(durationProgress),
        engagementProgress: Math.round(engagementProgress)
      });
      
      // Check if requirements are met
      if (turnsProgress >= 100 && durationProgress >= 100 && engagementProgress >= 100) {
        await handleEngagementMet(stats);
      }
      
    } catch (error) {
      console.error('Failed to update session stats:', error);
    }
  };

  // Handle engagement requirements met
  const handleEngagementMet = async (stats) => {
    try {
      await conversationEngagementService.endSession(sessionId, {
        completed: true,
        requirementsMet: true,
        finalStats: stats
      });
      
      toast({
        title: "Engagement Requirements Met!",
        description: "Great job! You've completed the conversation requirements.",
        variant: "default"
      });
      
      if (onEngagementMet) {
        onEngagementMet(stats);
      }
      
    } catch (error) {
      console.error('Failed to complete engagement:', error);
    }
  };

  // End conversation session
  const endConversation = async () => {
    if (!sessionId) return;
    
    try {
      const finalStats = await conversationEngagementService.endSession(sessionId, {
        completed: false,
        requirementsMet: false,
        finalStats: sessionStats
      });
      
      setIsActive(false);
      setSessionId(null);
      
      toast({
        title: "Conversation Ended",
        description: `Session completed with ${finalStats.engagementScore}% engagement.`,
        variant: "default"
      });
      
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update duration timer
  useEffect(() => {
    if (!isActive || !startTime) return;
    
    const timer = setInterval(() => {
      const currentDuration = Math.floor((Date.now() - startTime) / 1000);
      setSessionStats(prev => ({ ...prev, duration: currentDuration }));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isActive, startTime]);

  // Auto-update session stats
  useEffect(() => {
    if (!isActive || !sessionId) return;
    
    const interval = setInterval(() => {
      updateSessionStats();
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, [isActive, sessionId]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span>Conversation Practice</span>
            </CardTitle>
            
            {isActive && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm">
                  <Timer className="h-4 w-4" />
                  <span>{formatDuration(sessionStats.duration)}</span>
                </div>
                
                <Badge variant={sessionStats.engagementScore >= requiredEngagement ? 'default' : 'secondary'}>
                  {sessionStats.engagementScore}% Engagement
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {!isActive ? (
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                Practice conversation to meet progression requirements
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{requirements.minTurns}</div>
                  <div className="text-gray-600">Min Turns</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">{formatDuration(requirements.minDuration)}</div>
                  <div className="text-gray-600">Min Duration</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-purple-600">{requirements.minEngagement}%</div>
                  <div className="text-gray-600">Min Engagement</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Input
                  placeholder="Enter conversation topic (optional)"
                  value={conversationTopic}
                  onChange={(e) => setConversationTopic(e.target.value)}
                  className="max-w-md mx-auto"
                />
                
                <Button 
                  onClick={() => startConversation(conversationTopic)}
                  disabled={loading}
                  className="w-full max-w-md"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Conversation
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progress Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Turns</span>
                    <span>{sessionStats.turns}/{requirements.minTurns}</span>
                  </div>
                  <Progress value={progressMetrics.turnsProgress} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Duration</span>
                    <span>{formatDuration(sessionStats.duration)}</span>
                  </div>
                  <Progress value={progressMetrics.durationProgress} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Engagement</span>
                    <span>{sessionStats.engagementScore}%</span>
                  </div>
                  <Progress value={progressMetrics.engagementProgress} className="h-2" />
                </div>
              </div>
              
              {/* Requirements Status */}
              {(progressMetrics.turnsProgress >= 100 && 
                progressMetrics.durationProgress >= 100 && 
                progressMetrics.engagementProgress >= 100) && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Congratulations! You've met all conversation requirements.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Interface */}
      {isActive && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Chat with {aiPartner.name}</CardTitle>
              
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={endConversation}>
                  End Conversation
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {/* Messages */}
              <div className="h-64 overflow-y-auto border rounded-lg p-4 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      
                      {message.analysis && message.sender === 'user' && (
                        <div className="mt-2 text-xs opacity-75">
                          <div className="flex space-x-2">
                            <span>Words: {message.analysis.wordCount}</span>
                            <span>Vocab: {message.analysis.vocabularyDiversity}%</span>
                            <span>Grammar: {message.analysis.grammarScore}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Message Input */}
              <div className="flex space-x-2">
                <Textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={2}
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                
                <Button 
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || loading}
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Statistics */}
      {isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Performance Metrics</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {sessionStats.avgResponseLength}
                </div>
                <div className="text-sm text-gray-600">Avg Response Length</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {sessionStats.vocabularyDiversity}%
                </div>
                <div className="text-sm text-gray-600">Vocabulary Diversity</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {sessionStats.grammarScore}%
                </div>
                <div className="text-sm text-gray-600">Grammar Score</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {sessionStats.topicRelevance}%
                </div>
                <div className="text-sm text-gray-600">Topic Relevance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConversationTracker;