// Test System Component
// Implements comprehensive testing with adaptive difficulty and progression requirements

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target, 
  BookOpen, 
  Brain, 
  MessageSquare, 
  Award,
  AlertTriangle,
  RotateCcw,
  Send,
  Timer,
  TrendingUp,
  Volume2,
  Mic,
  Play,
  Pause
} from 'lucide-react';
import useProgression from '../../hooks/useProgression';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import textSimplificationService from '../../services/textSimplification';
import unifiedLevelService from '../../services/unifiedLevelService';
import { analyzeTextComplexity } from '../../utils/readability';

const TestSystem = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const {
    updateModuleProgress,
    loading: progressionLoading
  } = useProgression();

  // State
  const [test, setTest] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [userLevel, setUserLevel] = useState('A1');
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState(true);
  const [currentDifficulty, setCurrentDifficulty] = useState(1);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    accuracy: 0,
    speed: 0,
    consistency: 0
  });
  const [audioRecording, setAudioRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedAudio, setRecordedAudio] = useState({});

  // Load test data
  useEffect(() => {
    const loadTest = async () => {
      if (!testId) return;
      
      try {
        setLoading(true);
        
        // Import supabaseService
        const { default: supabaseService } = await import('../../renderer/services/supabaseService.js');
        
        // Fetch test from Supabase
        const result = await supabaseService.getTest(testId);
        if (!result.success) {
          throw new Error(result.error || 'Test not found');
        }
        
        const testData = {
          id: result.data.id,
          title: result.data.title,
          description: result.data.description,
          questions: result.data.content?.questions || [],
          time_limit_minutes: result.data.estimated_duration_minutes,
          language: result.data.language,
          cefr_level: result.data.cefr_level,
          min_score_required: result.data.min_score_required
        };
        setTest(testData);
        
        // Set timer if test has time limit
        if (testData.time_limit_minutes) {
          setTimeRemaining(testData.time_limit_minutes * 60);
        }
        
        setStartTime(Date.now());
        
        // Get user's proficiency level
        await loadUserLevel();
        
        // Initialize adaptive difficulty
        if (adaptiveDifficulty) {
          setCurrentDifficulty(mapLevelToDifficulty(userLevel));
        }
        
      } catch (error) {
        console.error('Failed to load test:', error);
        toast({
          title: "Error",
          description: "Failed to load test. Please try again.",
          variant: "destructive"
        });
        navigate('/learn');
      } finally {
        setLoading(false);
      }
    };
    
    loadTest();
  }, [testId, navigate, toast, adaptiveDifficulty]);

  // Load user's proficiency level
  const loadUserLevel = async () => {
    try {
      const response = await fetch(`/api/users/${user.id}/profile`);
      if (response.ok) {
        const profile = await response.json();
        setUserLevel(profile.placement_level || 'A1');
      }
    } catch (error) {
      console.error('Failed to load user level:', error);
    }
  };

  // Map CEFR level to difficulty scale (1-5)
  const mapLevelToDifficulty = (level) => {
    const mapping = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 5 };
    return mapping[level] || 1;
  };

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || submitted) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining, submitted]);

  // Adaptive difficulty adjustment
  const adjustDifficulty = useCallback((isCorrect, responseTime) => {
    if (!adaptiveDifficulty) return;
    
    const avgResponseTime = 30; // seconds
    const speedFactor = responseTime / avgResponseTime;
    
    let adjustment = 0;
    
    if (isCorrect) {
      // Increase difficulty if answer is correct and fast
      if (speedFactor < 0.7) {
        adjustment = 0.2;
      } else if (speedFactor < 1.0) {
        adjustment = 0.1;
      }
    } else {
      // Decrease difficulty if answer is incorrect
      adjustment = -0.3;
    }
    
    setCurrentDifficulty(prev => {
      const newDifficulty = Math.max(1, Math.min(5, prev + adjustment));
      return Math.round(newDifficulty * 10) / 10; // Round to 1 decimal
    });
  }, [adaptiveDifficulty]);

  // Handle answer change with performance tracking
  const handleAnswerChange = (questionIndex, answer) => {
    const questionStartTime = Date.now();
    
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionIndex]: {
          answer: answer,
          timestamp: questionStartTime,
          responseTime: questionStartTime - (prev[questionIndex]?.startTime || startTime)
        }
      };
      
      // Track performance metrics
      updatePerformanceMetrics(newAnswers);
      
      return newAnswers;
    });
  };

  // Update performance metrics
  const updatePerformanceMetrics = (currentAnswers) => {
    const answeredQuestions = Object.keys(currentAnswers).length;
    if (answeredQuestions === 0) return;
    
    // Calculate accuracy (for questions we can immediately evaluate)
    let correctCount = 0;
    let evaluableCount = 0;
    
    Object.entries(currentAnswers).forEach(([index, answerData]) => {
      const question = test.questions[parseInt(index)];
      if (question && question.type !== 'essay' && question.type !== 'speaking') {
        evaluableCount++;
        if (isAnswerCorrect(question, answerData.answer)) {
          correctCount++;
        }
      }
    });
    
    const accuracy = evaluableCount > 0 ? (correctCount / evaluableCount) * 100 : 0;
    
    // Calculate average response time
    const responseTimes = Object.values(currentAnswers)
      .map(a => a.responseTime)
      .filter(t => t > 0);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    // Calculate consistency (lower variance in response times = higher consistency)
    const variance = responseTimes.length > 1 
      ? responseTimes.reduce((acc, time) => acc + Math.pow(time - avgResponseTime, 2), 0) / responseTimes.length
      : 0;
    const consistency = Math.max(0, 100 - (Math.sqrt(variance) / 1000)); // Normalize to 0-100
    
    setPerformanceMetrics({
      accuracy: Math.round(accuracy),
      speed: Math.max(0, 100 - (avgResponseTime / 1000)), // Normalize to 0-100
      consistency: Math.round(consistency)
    });
  };

  // Check if answer is correct (for immediate evaluation)
  const isAnswerCorrect = (question, answer) => {
    switch (question.type) {
      case 'multiple_choice':
      case 'true_false':
        return answer === question.correct_answer;
      case 'fill_blank':
        const correctAnswers = Array.isArray(question.correct_answer) 
          ? question.correct_answer 
          : [question.correct_answer];
        return correctAnswers.some(ans => 
          ans.toLowerCase().trim() === (answer || '').toLowerCase().trim()
        );
      default:
        return false;
    }
  };

  // Start audio recording for speaking questions
  const startRecording = async (questionIndex) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks = [];
      
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setRecordedAudio(prev => ({
          ...prev,
          [questionIndex]: {
            blob: audioBlob,
            url: audioUrl,
            duration: Date.now() - startTime
          }
        }));
        
        handleAnswerChange(questionIndex, audioBlob);
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setAudioRecording(true);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorder && audioRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setAudioRecording(false);
      setMediaRecorder(null);
    }
  };

  // Navigate between questions
  const goToQuestion = (questionIndex) => {
    if (questionIndex >= 0 && questionIndex < test.questions.length) {
      setCurrentQuestion(questionIndex);
      
      // Mark question start time for performance tracking
      setAnswers(prev => ({
        ...prev,
        [questionIndex]: {
          ...prev[questionIndex],
          startTime: Date.now()
        }
      }));
    }
  };

  // Submit test
  const handleSubmit = async (autoSubmit = false) => {
    if (submitted) return;
    
    try {
      setLoading(true);
      setSubmitted(true);
      
      const endTime = Date.now();
      const timeSpent = (endTime - startTime) / 1000;
      
      // Calculate comprehensive score
      const score = await calculateComprehensiveScore();
      
      // Submit to API
      const submissionData = {
        test_id: testId,
        user_id: user.id,
        answers: answers,
        recorded_audio: recordedAudio,
        score: score.overallScore,
        skill_scores: score.skillScores,
        performance_metrics: performanceMetrics,
        adaptive_difficulty_used: adaptiveDifficulty,
        final_difficulty_level: currentDifficulty,
        time_spent_seconds: timeSpent,
        submitted_at: new Date().toISOString(),
        auto_submitted: autoSubmit
      };
      
      const response = await fetch('/api/test-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit test');
      }
      
      const result = await response.json();
      setResults({
        ...score,
        submissionId: result.id,
        timeSpent: timeSpent,
        autoSubmitted: autoSubmit,
        performanceMetrics: performanceMetrics
      });
      
      // Update progression if test passed
      if (score.overallScore >= test.passing_score) {
        await updateTestProgress(score);
      }
      
      toast({
        title: autoSubmit ? "Time's Up!" : "Test Submitted",
        description: `Overall Score: ${score.overallScore}%`,
        variant: score.overallScore >= test.passing_score ? "default" : "destructive"
      });
      
    } catch (error) {
      console.error('Failed to submit test:', error);
      setSubmitted(false);
      toast({
        title: "Submission Error",
        description: "Failed to submit test. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate comprehensive score with skill breakdown
  const calculateComprehensiveScore = async () => {
    const skillScores = {
      reading: 0,
      writing: 0,
      listening: 0,
      speaking: 0,
      grammar: 0,
      vocabulary: 0
    };
    
    const skillCounts = {
      reading: 0,
      writing: 0,
      listening: 0,
      speaking: 0,
      grammar: 0,
      vocabulary: 0
    };
    
    let totalScore = 0;
    let totalQuestions = 0;
    const questionResults = [];
    const aiAssessments = [];
    
    for (let i = 0; i < test.questions.length; i++) {
      const question = test.questions[i];
      const answerData = answers[i];
      let score = 0;
      let isCorrect = false;
      let aiAssessment = null;
      
      if (!answerData) {
        questionResults.push({
          questionIndex: i,
          score: 0,
          isCorrect: false,
          skipped: true
        });
        continue;
      }
      
      switch (question.type) {
        case 'multiple_choice':
        case 'true_false':
        case 'fill_blank':
          isCorrect = isAnswerCorrect(question, answerData.answer);
          score = isCorrect ? 100 : 0;
          break;
          
        case 'essay':
        case 'short_answer':
          // Use AI evaluation for text responses
          const evaluation = await evaluateTextResponse(question, answerData.answer);
          score = evaluation.score;
          isCorrect = score >= 70;
          aiAssessment = {
            skillScores: evaluation.skillScores,
            cefrLevel: evaluation.cefrLevel,
            errorExamples: evaluation.errorExamples,
            feedback: evaluation.feedback
          };
          aiAssessments.push({ questionIndex: i, assessment: aiAssessment });
          break;
          
        case 'speaking':
          // Use AI evaluation for audio responses
          score = await evaluateAudioResponse(question, answerData.answer);
          isCorrect = score >= 70;
          break;
          
        case 'listening':
          isCorrect = isAnswerCorrect(question, answerData.answer);
          score = isCorrect ? 100 : 0;
          break;
          
        default:
          score = 0;
      }
      
      // Apply adaptive difficulty bonus/penalty
      if (adaptiveDifficulty) {
        const difficultyMultiplier = currentDifficulty / 3; // Normalize around 1.0
        score = Math.min(100, score * difficultyMultiplier);
      }
      
      // Track performance for adaptive difficulty
      if (answerData.responseTime) {
        adjustDifficulty(isCorrect, answerData.responseTime / 1000);
      }
      
      // Categorize by skill (use AI assessment if available)
      if (aiAssessment && aiAssessment.skillScores) {
        Object.keys(aiAssessment.skillScores).forEach(skill => {
          if (skillScores.hasOwnProperty(skill)) {
            skillScores[skill] += aiAssessment.skillScores[skill];
            skillCounts[skill]++;
          }
        });
      } else {
        // Fallback to question skills
        const skills = question.skills || ['grammar']; // Default to grammar if not specified
        skills.forEach(skill => {
          if (skillScores.hasOwnProperty(skill)) {
            skillScores[skill] += score;
            skillCounts[skill]++;
          }
        });
      }
      
      totalScore += score;
      totalQuestions++;
      
      questionResults.push({
        questionIndex: i,
        score: Math.round(score),
        isCorrect: isCorrect,
        responseTime: answerData.responseTime,
        skills: question.skills || ['grammar'],
        aiAssessment: aiAssessment
      });
    }
    
    // Calculate average scores by skill
    Object.keys(skillScores).forEach(skill => {
      if (skillCounts[skill] > 0) {
        skillScores[skill] = Math.round(skillScores[skill] / skillCounts[skill]);
      }
    });
    
    // Calculate overall CEFR level from AI assessments
    const cefrLevels = aiAssessments
      .map(a => a.assessment?.cefrLevel)
      .filter(level => level);
    const overallCefrLevel = cefrLevels.length > 0 
      ? getMostCommonCefrLevel(cefrLevels)
      : mapScoreToCefr(totalScore / totalQuestions);
    
    const overallScore = totalQuestions > 0 ? Math.round(totalScore / totalQuestions) : 0;
    
    return {
      overallScore,
      skillScores,
      questionResults,
      totalQuestions,
      adaptiveDifficultyUsed: adaptiveDifficulty,
      finalDifficulty: currentDifficulty,
      cefrLevel: overallCefrLevel,
      aiAssessments
    };
  };
  
  // Helper function to get most common CEFR level
  const getMostCommonCefrLevel = (levels) => {
    const counts = levels.reduce((acc, level) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});
    
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  };
  
  // Helper function to map score to CEFR level using unified level service
  const mapScoreToCefr = (score, textContent = null, isConversational = false) => {
    // If we have text content, use FK-based analysis for structured content
    if (textContent && !isConversational) {
      const levelAnalysis = unifiedLevelService.assignUnifiedLevel(textContent, false);
      return levelAnalysis.cefr;
    }
    
    // For conversational content, always return A1 (Basic level)
    if (isConversational) {
      return 'A1';
    }
    
    // Fallback to traditional score-based mapping for structured content
    if (score >= 90) return 'C2';
    if (score >= 80) return 'C1';
    if (score >= 70) return 'B2';
    if (score >= 60) return 'B1';
    if (score >= 40) return 'A2';
    return 'A1';
  };

  // Evaluate text response using Gemini AI
  const evaluateTextResponse = async (question, answer) => {
    if (!answer || answer.trim().length === 0) return { score: 0, feedback: 'No answer provided' };
    
    try {
      // Import services
      const { default: geminiService } = await import('../../../renderer/services/geminiService.js');
      const { default: aiService } = await import('../../../renderer/services/aiService.js');
      
      // Build assessment prompt for Gemini AI
      const assessmentPrompt = `
You are an expert language assessment specialist. Evaluate the following response according to CEFR standards.

Question: ${question.question}
Expected Level: ${userLevel}
User Response: ${answer}

Provide a detailed assessment including:
1. Overall score (0-100)
2. CEFR level estimate (A1, A2, B1, B2, C1, C2)
3. Skill breakdown scores:
   - Grammar (0-100)
   - Vocabulary (0-100)
   - Fluency (0-100)
   - Accuracy (0-100)
   - Content Relevance (0-100)
4. Specific feedback for improvement
5. Error examples with corrections

Format your response as JSON:
{
  "overall_score": number,
  "cefr_level": "string",
  "skill_scores": {
    "grammar": number,
    "vocabulary": number,
    "fluency": number,
    "accuracy": number,
    "content_relevance": number
  },
  "feedback": "detailed feedback string",
  "error_examples": [{"error": "string", "correction": "string", "explanation": "string"}]
}

Only return the JSON, no additional text.`;
      
      let aiResponse;
      
      // Use Gemini if available, fallback to other AI service
      if (geminiService.isReady()) {
        aiResponse = await geminiService.sendMessage(assessmentPrompt);
      } else if (aiService.isGeminiAvailable()) {
        aiResponse = await aiService.generateResponse(assessmentPrompt);
      } else {
        // Fallback to basic evaluation
        return evaluateTextResponseFallback(question, answer);
      }
      
      // Parse AI response
      const analysis = parseAIAssessment(aiResponse);
      
      return {
        score: analysis.overall_score || 50,
        feedback: analysis.feedback || 'Assessment completed',
        skillScores: analysis.skill_scores || {},
        cefrLevel: analysis.cefr_level || 'B1',
        errorExamples: analysis.error_examples || []
      };
      
    } catch (error) {
      console.error('Failed to evaluate text response with AI:', error);
      // Fallback to basic evaluation
      return evaluateTextResponseFallback(question, answer);
    }
  };
  
  // Fallback evaluation method
  const evaluateTextResponseFallback = (question, answer) => {
    const complexity = analyzeTextComplexity(answer);
    
    // Basic scoring based on length, complexity, and relevance
    let score = 0;
    
    // Length score (minimum expected length)
    const minLength = question.min_length || 50;
    const lengthScore = Math.min(100, (answer.length / minLength) * 40);
    
    // Complexity score (appropriate for level)
    const targetLevel = mapLevelToDifficulty(userLevel);
    const complexityScore = Math.max(0, 40 - Math.abs(complexity.level - targetLevel) * 10);
    
    // Content relevance (basic keyword matching)
    const keywords = question.keywords || [];
    const keywordMatches = keywords.filter(keyword => 
      answer.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    const relevanceScore = keywords.length > 0 ? (keywordMatches / keywords.length) * 20 : 20;
    
    score = lengthScore + complexityScore + relevanceScore;
    
    return {
      score: Math.min(100, Math.max(0, score)),
      feedback: 'Basic assessment completed. For detailed AI feedback, please ensure Gemini AI is configured.',
      skillScores: {
        grammar: score * 0.9,
        vocabulary: score * 0.8,
        fluency: score * 0.7,
        accuracy: score,
        content_relevance: relevanceScore
      },
      cefrLevel: score > 80 ? 'B2' : score > 60 ? 'B1' : score > 40 ? 'A2' : 'A1',
      errorExamples: []
    };
  };
  
  // Parse AI assessment response
  const parseAIAssessment = (aiResponse) => {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse AI assessment:', error);
    }
    
    // Fallback parsing from text
    const scoreMatch = aiResponse.match(/score[:\s]*(\d+)/i);
    const cefrMatch = aiResponse.match(/([ABC][12])/i);
    
    return {
      overall_score: scoreMatch ? parseInt(scoreMatch[1]) : 60,
      cefr_level: cefrMatch ? cefrMatch[1].toUpperCase() : 'B1',
      skill_scores: {
        grammar: 60,
        vocabulary: 60,
        fluency: 60,
        accuracy: 60,
        content_relevance: 60
      },
      feedback: aiResponse.substring(0, 500) + '...',
      error_examples: []
    };
  };

  // Evaluate audio response (placeholder for speech recognition)
  const evaluateAudioResponse = async (question, audioBlob) => {
    if (!audioBlob) return 0;
    
    try {
      // Placeholder for speech-to-text and evaluation
      // In a real implementation, this would use speech recognition APIs
      
      // Basic scoring based on audio duration
      const minDuration = question.min_duration || 10; // seconds
      const audioDuration = recordedAudio[currentQuestion]?.duration || 0;
      
      const durationScore = Math.min(100, (audioDuration / (minDuration * 1000)) * 100);
      
      return Math.max(30, durationScore); // Minimum 30% for attempting
      
    } catch (error) {
      console.error('Failed to evaluate audio response:', error);
      return 30; // Minimum score for attempting
    }
  };

  // Update progression after successful test completion
  const updateTestProgress = async (scoreData) => {
    try {
      await updateModuleProgress(test.module_id, {
        test_completed: true,
        test_score: scoreData.overallScore,
        skill_scores: scoreData.skillScores,
        last_accessed_at: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to update test progress:', error);
    }
  };

  // Retry test
  const retryTest = () => {
    setAnswers({});
    setCurrentQuestion(0);
    setSubmitted(false);
    setResults(null);
    setShowReview(false);
    setRecordedAudio({});
    setStartTime(Date.now());
    setCurrentDifficulty(mapLevelToDifficulty(userLevel));
    setPerformanceMetrics({ accuracy: 0, speed: 0, consistency: 0 });
    
    if (test.time_limit_minutes) {
      setTimeRemaining(test.time_limit_minutes * 60);
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !test) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Results view
  if (submitted && results) {
    const passed = results.overallScore >= test.passing_score;
    
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Card>
          <CardHeader>
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {passed ? <Award className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
              </div>
              
              <CardTitle className="text-2xl mb-2">
                {passed ? 'Test Completed Successfully!' : 'Test Not Passed'}
              </CardTitle>
              
              <div className="text-lg font-semibold mb-2">
                Overall Score: {results.overallScore}%
              </div>
              
              {results.cefrLevel && (
                <div className="text-md text-gray-600 mb-4">
                  CEFR Level: <span className="font-semibold text-blue-600">{results.cefrLevel}</span>
                </div>
              )}
              
              {passed ? (
                <Alert className="mb-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Excellent work! You've passed this test and unlocked new content.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You need {test.passing_score}% to pass. Review your weak areas and try again.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Skill Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Skill Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(results.skillScores).map(([skill, score]) => (
                      score > 0 && (
                        <div key={skill}>
                          <div className="flex justify-between mb-1">
                            <span className="capitalize">{skill}</span>
                            <span className="font-semibold">{score}%</span>
                          </div>
                          <Progress value={score} className="h-2" />
                        </div>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Accuracy</span>
                        <span className="font-semibold">{results.performanceMetrics.accuracy}%</span>
                      </div>
                      <Progress value={results.performanceMetrics.accuracy} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Speed</span>
                        <span className="font-semibold">{results.performanceMetrics.speed}%</span>
                      </div>
                      <Progress value={results.performanceMetrics.speed} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Consistency</span>
                        <span className="font-semibold">{results.performanceMetrics.consistency}%</span>
                      </div>
                      <Progress value={results.performanceMetrics.consistency} className="h-2" />
                    </div>
                    
                    {results.adaptiveDifficultyUsed && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between">
                          <span>Final Difficulty Level</span>
                          <Badge variant="outline">{results.finalDifficulty}/5</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* AI Assessment Feedback */}
            {results.aiAssessments && results.aiAssessments.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Assessment Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {results.aiAssessments.map((assessment, index) => {
                      const questionIndex = assessment.questionIndex || assessment.questionId;
                      const question = test.questions[questionIndex] || test.questions.find(q => q.id === questionIndex);
                      const aiData = assessment.assessment;
                      
                      if (!aiData) return null;
                      
                      return (
                        <div key={index} className="border-l-4 border-blue-500 pl-4">
                          <h4 className="font-semibold mb-2">
                            Question {typeof questionIndex === 'number' ? questionIndex + 1 : questionIndex}: {question?.question?.substring(0, 50)}...
                          </h4>
                          
                          {aiData.feedback && (
                            <div className="mb-3">
                              <p className="text-sm text-gray-700">{aiData.feedback}</p>
                            </div>
                          )}
                          
                          {aiData.errorExamples && aiData.errorExamples.length > 0 && (
                            <div className="mb-3">
                              <h5 className="font-medium text-sm mb-2">Corrections:</h5>
                              <div className="space-y-2">
                                {aiData.errorExamples.map((example, idx) => (
                                  <div key={idx} className="bg-gray-50 p-2 rounded text-sm">
                                    <div className="text-red-600">
                                      <strong>Error:</strong> {example.error}
                                    </div>
                                    <div className="text-green-600">
                                      <strong>Correction:</strong> {example.correction}
                                    </div>
                                    {example.explanation && (
                                      <div className="text-gray-600 mt-1">
                                        <strong>Explanation:</strong> {example.explanation}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {aiData.cefrLevel && (
                            <div className="text-sm text-blue-600">
                              <strong>CEFR Level for this response:</strong> {aiData.cefrLevel}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="flex justify-center space-x-4 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowReview(true)}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Review Answers
              </Button>
              
              {!passed && (
                <Button onClick={retryTest}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake Test
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/learn')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestionData = test.questions[currentQuestion];

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
          <p className="text-gray-600">{test.description}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {adaptiveDifficulty && (
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Difficulty: {currentDifficulty}/5</span>
            </div>
          )}
          
          {timeRemaining !== null && (
            <div className="flex items-center space-x-2 text-lg font-semibold">
              <Timer className={`h-5 w-5 ${
                timeRemaining < 300 ? 'text-red-500' : 'text-blue-500'
              }`} />
              <span className={timeRemaining < 300 ? 'text-red-500' : 'text-blue-500'}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600">
                {currentQuestion + 1} of {test.questions.length}
              </span>
            </div>
            <Progress 
              value={((currentQuestion + 1) / test.questions.length) * 100} 
              className="h-2" 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Accuracy</span>
              <span className="text-sm font-semibold">{performanceMetrics.accuracy}%</span>
            </div>
            <Progress value={performanceMetrics.accuracy} className="h-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Speed</span>
              <span className="text-sm font-semibold">{performanceMetrics.speed}%</span>
            </div>
            <Progress value={performanceMetrics.speed} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 lg:grid-cols-1 gap-2">
                {test.questions.map((question, index) => (
                  <Button
                    key={index}
                    variant={index === currentQuestion ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() => goToQuestion(index)}
                  >
                    <div className="flex items-center space-x-2">
                      {answers[index] !== undefined ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <span>{index + 1}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Question Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  Question {currentQuestion + 1}
                </CardTitle>
                
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {currentQuestionData.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  
                  {currentQuestionData.skills && (
                    <div className="flex space-x-1">
                      {currentQuestionData.skills.map(skill => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-6">
                {/* Audio for listening questions */}
                {currentQuestionData.type === 'listening' && currentQuestionData.audio_url && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Button size="sm">
                        <Volume2 className="h-4 w-4 mr-2" />
                        Play Audio
                      </Button>
                      <span className="text-sm text-gray-600">
                        Listen carefully and answer the question below.
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Reading passage */}
                {currentQuestionData.passage && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Reading Passage:</h4>
                    <p className="text-gray-700 leading-relaxed">
                      {currentQuestionData.passage}
                    </p>
                  </div>
                )}
                
                {/* Question Text */}
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    {currentQuestionData.question_text}
                  </h3>
                  
                  {/* Answer Input based on question type */}
                  {currentQuestionData.type === 'multiple_choice' && (
                    <RadioGroup
                      value={answers[currentQuestion]?.answer || ''}
                      onValueChange={(value) => handleAnswerChange(currentQuestion, value)}
                    >
                      {currentQuestionData.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`option-${index}`} />
                          <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  
                  {currentQuestionData.type === 'true_false' && (
                    <RadioGroup
                      value={answers[currentQuestion]?.answer || ''}
                      onValueChange={(value) => handleAnswerChange(currentQuestion, value)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="true" />
                        <Label htmlFor="true" className="cursor-pointer">True</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="false" />
                        <Label htmlFor="false" className="cursor-pointer">False</Label>
                      </div>
                    </RadioGroup>
                  )}
                  
                  {currentQuestionData.type === 'fill_blank' && (
                    <Input
                      value={answers[currentQuestion]?.answer || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                      placeholder="Enter your answer..."
                      className="max-w-md"
                    />
                  )}
                  
                  {(currentQuestionData.type === 'short_answer' || currentQuestionData.type === 'essay') && (
                    <Textarea
                      value={answers[currentQuestion]?.answer || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                      placeholder="Enter your answer..."
                      rows={currentQuestionData.type === 'essay' ? 8 : 4}
                    />
                  )}
                  
                  {currentQuestionData.type === 'speaking' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-800 mb-2">
                          <strong>Speaking Question:</strong> Record your response to the prompt above.
                        </p>
                        <p className="text-xs text-yellow-700">
                          Minimum duration: {currentQuestionData.min_duration || 30} seconds
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {!audioRecording ? (
                          <Button 
                            onClick={() => startRecording(currentQuestion)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Mic className="h-4 w-4 mr-2" />
                            Start Recording
                          </Button>
                        ) : (
                          <Button 
                            onClick={stopRecording}
                            variant="outline"
                            className="border-red-500 text-red-500"
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Stop Recording
                          </Button>
                        )}
                        
                        {recordedAudio[currentQuestion] && (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">Recording saved</span>
                            <audio 
                              controls 
                              src={recordedAudio[currentQuestion].url}
                              className="h-8"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {currentQuestionData.type === 'listening' && (
                    <RadioGroup
                      value={answers[currentQuestion]?.answer || ''}
                      onValueChange={(value) => handleAnswerChange(currentQuestion, value)}
                    >
                      {currentQuestionData.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`listening-option-${index}`} />
                          <Label htmlFor={`listening-option-${index}`} className="flex-1 cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </div>
                
                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => goToQuestion(currentQuestion - 1)}
                    disabled={currentQuestion === 0}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex space-x-2">
                    {currentQuestion < test.questions.length - 1 ? (
                      <Button onClick={() => goToQuestion(currentQuestion + 1)}>
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleSubmit()}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Submit Test
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TestSystem;