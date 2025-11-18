// Assignment System Component
// Manages assignments, quizzes, and tests required for progression

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
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target, 
  BookOpen, 
  PenTool, 
  MessageSquare, 
  Award,
  AlertTriangle,
  RotateCcw,
  Send,
  Timer,
  Brain
} from 'lucide-react';
import useProgression from '../../hooks/useProgression';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import textSimplificationService from '../../services/textSimplification';
import unifiedLevelService from '../../services/unifiedLevelService';

const AssignmentSystem = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const {
    updateModuleProgress,
    loading: progressionLoading
  } = useProgression();

  // State
  const [assignment, setAssignment] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [userLevel, setUserLevel] = useState('A1');
  const [adaptiveMode, setAdaptiveMode] = useState(true);

  // Load assignment data
  useEffect(() => {
    const loadAssignment = async () => {
      if (!assignmentId) return;
      
      try {
        setLoading(true);
        
        // Import supabaseService
        const { default: supabaseService } = await import('../../renderer/services/supabaseService.js');
        
        // Fetch assignment from Supabase
        const result = await supabaseService.getAssignment(assignmentId);
        if (!result.success) {
          throw new Error(result.error || 'Assignment not found');
        }
        
        const assignmentData = {
          id: result.data.id,
          title: result.data.title,
          description: result.data.description,
          questions: result.data.content?.questions || [],
          time_limit_minutes: result.data.estimated_duration_minutes,
          language: result.data.language,
          cefr_level: result.data.cefr_level,
          min_score_required: result.data.min_score_required
        };
        setAssignment(assignmentData);
        
        // Set timer if assignment has time limit
        if (assignmentData.time_limit_minutes) {
          setTimeRemaining(assignmentData.time_limit_minutes * 60);
        }
        
        setStartTime(Date.now());
        
        // Get user's proficiency level for adaptive content
        await loadUserLevel();
        
        // Adapt assignment content if needed
        if (adaptiveMode) {
          await adaptAssignmentContent(assignmentData);
        }
        
      } catch (error) {
        console.error('Failed to load assignment:', error);
        toast({
          title: "Error",
          description: "Failed to load assignment. Please try again.",
          variant: "destructive"
        });
        navigate('/learn');
      } finally {
        setLoading(false);
      }
    };
    
    loadAssignment();
  }, [assignmentId, navigate, toast, adaptiveMode]);

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

  // Adapt assignment content based on user level
  const adaptAssignmentContent = async (assignmentData) => {
    if (!assignmentData.questions || !adaptiveMode) return;
    
    try {
      const adaptedQuestions = await Promise.all(
        assignmentData.questions.map(async (question) => {
          if (question.type === 'reading_comprehension' || question.type === 'essay') {
            // Simplify question text and passages
            const simplifiedQuestion = await textSimplificationService.simplifyText(
              question.question_text,
              userLevel,
              { preserveKeyTerms: question.key_terms || [] }
            );
            
            let simplifiedPassage = null;
            if (question.passage) {
              simplifiedPassage = await textSimplificationService.simplifyText(
                question.passage,
                userLevel,
                { preserveKeyTerms: question.key_terms || [] }
              );
            }
            
            return {
              ...question,
              question_text: simplifiedQuestion.text,
              passage: simplifiedPassage ? simplifiedPassage.text : question.passage,
              adapted: true,
              original_complexity: simplifiedQuestion.originalComplexity
            };
          }
          return question;
        })
      );
      
      setAssignment(prev => ({
        ...prev,
        questions: adaptedQuestions
      }));
      
    } catch (error) {
      console.error('Failed to adapt assignment content:', error);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || submitted) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining, submitted]);

  // Handle answer change
  const handleAnswerChange = (questionIndex, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  // Navigate between questions
  const goToQuestion = (questionIndex) => {
    if (questionIndex >= 0 && questionIndex < assignment.questions.length) {
      setCurrentQuestion(questionIndex);
    }
  };

  // Submit assignment
  const handleSubmit = async (autoSubmit = false) => {
    if (submitted) return;
    
    try {
      setLoading(true);
      setSubmitted(true);
      
      const endTime = Date.now();
      const timeSpent = (endTime - startTime) / 1000; // in seconds
      
      // Calculate score with AI assessment
      const score = await calculateScore();
      
      // Submit to API
      const submissionData = {
        assignment_id: assignmentId,
        user_id: user.id,
        answers: answers,
        score: score.percentage,
        time_spent_seconds: timeSpent,
        ai_assessments: score.aiAssessments || [],
        flesch_kincaid_analyses: score.fleschKincaidAnalyses || [],
        overall_fk_analysis: score.overallFKAnalysis,
        unified_level: score.unifiedLevel,
        submitted_at: new Date().toISOString(),
        auto_submitted: autoSubmit
      };
      
      const response = await fetch('/api/assignment-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit assignment');
      }
      
      const result = await response.json();
      setResults({
        ...score,
        submissionId: result.id,
        timeSpent: timeSpent,
        autoSubmitted: autoSubmit
      });
      
      // Update progression if assignment passed
      if (score.percentage >= assignment.passing_score) {
        await updateAssignmentProgress();
      }
      
      toast({
        title: autoSubmit ? "Time's Up!" : "Assignment Submitted",
        description: `You scored ${score.percentage}% (${score.correct}/${score.total} correct)`,
        variant: score.percentage >= assignment.passing_score ? "default" : "destructive"
      });
      
    } catch (error) {
      console.error('Failed to submit assignment:', error);
      setSubmitted(false);
      toast({
        title: "Submission Error",
        description: "Failed to submit assignment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate assignment score with unified level system
  const calculateScore = async () => {
    let correct = 0;
    let total = assignment.questions.length;
    const questionResults = [];
    const aiAssessments = [];
    const fleschKincaidAnalyses = [];
    
    for (let index = 0; index < assignment.questions.length; index++) {
      const question = assignment.questions[index];
      const userAnswer = answers[index];
      let isCorrect = false;
      let aiAssessment = null;
      let fkAnalysis = null;
      
      switch (question.type) {
        case 'multiple_choice':
          isCorrect = userAnswer === question.correct_answer;
          break;
        case 'true_false':
          isCorrect = userAnswer === question.correct_answer;
          break;
        case 'fill_blank':
          // Case-insensitive comparison, trim whitespace
          const correctAnswers = Array.isArray(question.correct_answer) 
            ? question.correct_answer 
            : [question.correct_answer];
          isCorrect = correctAnswers.some(ans => 
            ans.toLowerCase().trim() === (userAnswer || '').toLowerCase().trim()
          );
          break;
        case 'essay':
        case 'short_answer':
          // Use AI evaluation with Flesch-Kincaid analysis for text-based questions
          if (userAnswer && userAnswer.trim().length > 0) {
            // Perform Flesch-Kincaid analysis
            fkAnalysis = unifiedLevelService.analyzeTextComplexity(userAnswer, 'structured');
            
            // Get AI assessment with FK context
            aiAssessment = await evaluateTextResponseWithAI(question, userAnswer, fkAnalysis);
            
            if (aiAssessment) {
              // Enhanced scoring considering both AI assessment and FK level
              const baseScore = aiAssessment.overall_score;
              const fkBonus = fkAnalysis.appropriateForLevel ? 5 : 0; // Small bonus for appropriate complexity
              const finalScore = Math.min(100, baseScore + fkBonus);
              
              isCorrect = finalScore >= 70;
              aiAssessments.push({
                questionIndex: index,
                ...aiAssessment,
                finalScore,
                fleschKincaidAnalysis: fkAnalysis
              });
              
              fleschKincaidAnalyses.push({
                questionIndex: index,
                ...fkAnalysis
              });
            } else {
              // Fallback: use FK analysis for basic scoring
              const expectedLevel = unifiedLevelService.cefrToUnifiedLevel(userLevel);
              isCorrect = fkAnalysis.level === expectedLevel && userAnswer.trim().length > 20;
            }
          } else {
            isCorrect = false;
          }
          break;
        default:
          isCorrect = false;
      }
      
      if (isCorrect) correct++;
      
      questionResults.push({
        questionIndex: index,
        userAnswer,
        correctAnswer: question.correct_answer,
        isCorrect,
        explanation: question.explanation,
        aiAssessment,
        fleschKincaidAnalysis: fkAnalysis
      });
    }
    
    // Calculate overall Flesch-Kincaid metrics for the assignment
    const overallFKAnalysis = fleschKincaidAnalyses.length > 0 ? {
      averageScore: fleschKincaidAnalyses.reduce((sum, fk) => sum + (fk.fleschKincaid || 0), 0) / fleschKincaidAnalyses.length,
      levelDistribution: fleschKincaidAnalyses.reduce((dist, fk) => {
        dist[fk.level] = (dist[fk.level] || 0) + 1;
        return dist;
      }, {}),
      appropriatenessRate: fleschKincaidAnalyses.filter(fk => fk.appropriateForLevel).length / fleschKincaidAnalyses.length
    } : null;
    
    return {
      correct,
      total,
      percentage: Math.round((correct / total) * 100),
      questionResults,
      aiAssessments,
      fleschKincaidAnalyses,
      overallFKAnalysis,
      unifiedLevel: unifiedLevelService.cefrToUnifiedLevel(userLevel)
    };
  };

  // AI evaluation function for text-based questions with FK analysis
  const evaluateTextResponseWithAI = async (question, answer, fkAnalysis = null) => {
    if (!answer || answer.trim().length === 0) {
      return { overall_score: 0, feedback: 'No answer provided', cefr_level: 'A1', unified_level: 'Basic' };
    }
    
    try {
      // Import services
      const { default: geminiService } = await import('../../../renderer/services/geminiService.js');
      const { default: aiService } = await import('../../../renderer/services/aiService.js');
      
      // Build enhanced assessment prompt with FK analysis
      const fkContext = fkAnalysis ? `

Flesch-Kincaid Analysis:
- FK Score: ${fkAnalysis.fleschKincaid}
- Unified Level: ${fkAnalysis.level}
- Appropriate for student level: ${fkAnalysis.appropriateForLevel ? 'Yes' : 'No'}
- Readability: ${fkAnalysis.readability}
- Sentence complexity: Average ${fkAnalysis.averageSentenceLength} words per sentence
- Word complexity: Average ${fkAnalysis.averageSyllablesPerWord} syllables per word` : '';
      
      const assessmentPrompt = `
You are an expert language assessment specialist using the EdLingo unified level system. Evaluate the following response according to both CEFR standards and Flesch-Kincaid complexity analysis.

Question: ${question.question}
Expected Answer/Context: ${question.correct_answer || 'Open-ended question'}
User Response: ${answer}
Student's Current Level: ${userLevel} (CEFR) / ${unifiedLevelService.cefrToUnifiedLevel(userLevel)} (Unified)${fkContext}

Please provide a detailed assessment in JSON format:
{
  "overall_score": (0-100),
  "cefr_level": "A1|A2|B1|B2|C1|C2",
  "unified_level": "Basic|Elementary|Pre-Intermediate|Intermediate|Upper-Intermediate|Advanced",
  "flesch_kincaid_score": (FK score from your analysis),
  "complexity_appropriateness": "appropriate|too_simple|too_complex",
  "skill_breakdown": {
    "grammar": (0-100),
    "vocabulary": (0-100),
    "coherence": (0-100),
    "relevance": (0-100),
    "complexity": (0-100)
  },
  "feedback": "Detailed constructive feedback including complexity guidance",
  "error_examples": [
    {
      "error": "specific error found",
      "correction": "suggested correction",
      "explanation": "why this is better"
    }
  ],
  "complexity_suggestions": "Suggestions for improving text complexity to match student level"
}

Focus on:
1. Accuracy and relevance to the question
2. Language complexity appropriate for the student's level
3. Grammar, vocabulary, and coherence
4. Whether the response demonstrates progression in the unified level system
5. Flesch-Kincaid score alignment with expected level ranges`;
      
      let aiResponse;
      
      // Try Gemini first, then fallback to aiService
      if (geminiService && geminiService.isReady && geminiService.isReady()) {
        aiResponse = await geminiService.analyzeText(answer, assessmentPrompt);
      } else if (aiService && aiService.generateResponse) {
        aiResponse = await aiService.generateResponse(assessmentPrompt);
      } else {
        console.warn('No AI service available for assessment');
        return null;
      }
      
      // Parse AI response
      return parseAIAssessment(aiResponse);
      
    } catch (error) {
      console.error('AI evaluation failed:', error);
      return null;
    }
  };
  
  // Parse AI assessment response with unified level support
  const parseAIAssessment = (aiResponse) => {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Ensure unified_level is present
        if (!parsed.unified_level && parsed.cefr_level) {
          parsed.unified_level = unifiedLevelService.cefrToUnifiedLevel(parsed.cefr_level);
        }
        return parsed;
      }
    } catch (error) {
      console.error('Failed to parse AI assessment:', error);
    }
    
    // Fallback parsing from text
    const scoreMatch = aiResponse.match(/score[:\s]*(\d+)/i);
    const cefrMatch = aiResponse.match(/([ABC][12])/i);
    const unifiedMatch = aiResponse.match(/(Basic|Elementary|Pre-Intermediate|Intermediate|Upper-Intermediate|Advanced)/i);
    const fkMatch = aiResponse.match(/flesch[\s-]*kincaid[:\s]*(\d+\.?\d*)/i);
    
    const cefrLevel = cefrMatch ? cefrMatch[1].toUpperCase() : 'B1';
    const unifiedLevel = unifiedMatch ? unifiedMatch[1] : unifiedLevelService.cefrToUnifiedLevel(cefrLevel);
    
    return {
      overall_score: scoreMatch ? parseInt(scoreMatch[1]) : 60,
      cefr_level: cefrLevel,
      unified_level: unifiedLevel,
      flesch_kincaid_score: fkMatch ? parseFloat(fkMatch[1]) : null,
      complexity_appropriateness: 'appropriate',
      skill_breakdown: {
        grammar: 60,
        vocabulary: 60,
        coherence: 60,
        relevance: 60,
        complexity: 60
      },
      feedback: aiResponse.substring(0, 200) + '...',
      error_examples: [],
      complexity_suggestions: 'Continue practicing at your current level.'
    };
  };

  // Update progression after successful assignment completion
  const updateAssignmentProgress = async () => {
    try {
      // Mark assignment as completed in user progress
      await updateModuleProgress(assignment.module_id, {
        assignments_completed: true,
        last_assignment_score: results?.percentage || 0,
        last_accessed_at: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to update assignment progress:', error);
    }
  };

  // Retry assignment
  const retryAssignment = () => {
    setAnswers({});
    setCurrentQuestion(0);
    setSubmitted(false);
    setResults(null);
    setShowReview(false);
    setStartTime(Date.now());
    
    if (assignment.time_limit_minutes) {
      setTimeRemaining(assignment.time_limit_minutes * 60);
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !assignment) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Results view
  if (submitted && results) {
    const passed = results.percentage >= assignment.passing_score;
    
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {passed ? <Award className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
              </div>
              
              <CardTitle className="text-2xl mb-2">
                {passed ? 'Assignment Completed!' : 'Assignment Failed'}
              </CardTitle>
              
              <div className="text-lg font-semibold mb-4">
                Score: {results.percentage}% ({results.correct}/{results.total} correct)
              </div>
              
              {passed ? (
                <Alert className="mb-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Congratulations! You've passed this assignment and unlocked new content.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You need {assignment.passing_score}% to pass. Review the material and try again.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatTime(Math.floor(results.timeSpent))}
                  </div>
                  <div className="text-sm text-gray-600">Time Spent</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {assignment.passing_score}%
                  </div>
                  <div className="text-sm text-gray-600">Required Score</div>
                </div>
              </div>
              
              <div className="flex justify-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowReview(true)}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Review Answers
                </Button>
                
                {!passed && (
                  <Button onClick={retryAssignment}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Again
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
            </div>
          </CardContent>
        </Card>
        
        {/* Review Modal */}
        {showReview && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Answer Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {results.questionResults.map((result, index) => (
                  <div key={index} className="border-b pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">Question {index + 1}</h4>
                      <Badge variant={result.isCorrect ? 'default' : 'destructive'}>
                        {result.isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-700 mb-2">
                      {assignment.questions[index].question_text}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Your Answer:</span>
                        <p className={result.isCorrect ? 'text-green-600' : 'text-red-600'}>
                          {result.userAnswer || 'No answer'}
                        </p>
                      </div>
                      
                      {!result.isCorrect && (
                        <div>
                          <span className="font-medium">Correct Answer:</span>
                          <p className="text-green-600">
                            {Array.isArray(result.correctAnswer) 
                              ? result.correctAnswer.join(', ') 
                              : result.correctAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {result.explanation && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <span className="font-medium text-blue-800">Explanation:</span>
                        <p className="text-blue-700">{result.explanation}</p>
                      </div>
                    )}
                    
                    {/* AI Assessment Feedback for text-based questions */}
                    {result.aiAssessment && (
                      <div className="mt-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center mb-2">
                          <Brain className="h-4 w-4 text-purple-600 mr-2" />
                          <span className="font-medium text-purple-800">AI Assessment</span>
                          <div className="ml-2 flex space-x-2">
                            <Badge variant="outline">
                              {result.aiAssessment.cefr_level}
                            </Badge>
                            {result.aiAssessment.unified_level && (
                              <Badge variant="secondary">
                                {result.aiAssessment.unified_level}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-sm space-y-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="font-medium text-purple-700">Score:</span>
                              <span className="ml-2 text-purple-600">{result.aiAssessment.finalScore || result.aiAssessment.overall_score}/100</span>
                            </div>
                            {result.aiAssessment.flesch_kincaid_score && (
                              <div>
                                <span className="font-medium text-purple-700">FK Score:</span>
                                <span className="ml-2 text-purple-600">{result.aiAssessment.flesch_kincaid_score}</span>
                              </div>
                            )}
                          </div>
                          
                          {result.aiAssessment.complexity_appropriateness && (
                            <div>
                              <span className="font-medium text-purple-700">Complexity:</span>
                              <Badge 
                                variant={result.aiAssessment.complexity_appropriateness === 'appropriate' ? 'default' : 'destructive'}
                                className="ml-2"
                              >
                                {result.aiAssessment.complexity_appropriateness.replace('_', ' ')}
                              </Badge>
                            </div>
                          )}
                          
                          {result.aiAssessment.feedback && (
                            <div>
                              <span className="font-medium text-purple-700">Feedback:</span>
                              <p className="text-purple-600 mt-1">{result.aiAssessment.feedback}</p>
                            </div>
                          )}
                          
                          {result.aiAssessment.complexity_suggestions && (
                            <div>
                              <span className="font-medium text-purple-700">Complexity Guidance:</span>
                              <p className="text-purple-600 mt-1 text-xs">{result.aiAssessment.complexity_suggestions}</p>
                            </div>
                          )}
                          
                          {result.aiAssessment.skill_breakdown && (
                            <div>
                              <span className="font-medium text-purple-700">Skill Breakdown:</span>
                              <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                                {Object.entries(result.aiAssessment.skill_breakdown).map(([skill, score]) => (
                                  <div key={skill} className="flex justify-between">
                                    <span className="capitalize">{skill}:</span>
                                    <span>{score}/100</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {result.aiAssessment.error_examples && result.aiAssessment.error_examples.length > 0 && (
                            <div>
                              <span className="font-medium text-purple-700">Error Examples:</span>
                              <div className="mt-1 space-y-1">
                                {result.aiAssessment.error_examples.map((error, errorIndex) => (
                                  <div key={errorIndex} className="text-xs bg-white p-2 rounded border">
                                    <div><strong>Error:</strong> {error.error}</div>
                                    <div><strong>Correction:</strong> {error.correction}</div>
                                    <div><strong>Explanation:</strong> {error.explanation}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Flesch-Kincaid Analysis for text-based questions */}
                    {result.fleschKincaidAnalysis && (
                      <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center mb-2">
                          <Target className="h-4 w-4 text-blue-600 mr-2" />
                          <span className="font-medium text-blue-800">Text Complexity Analysis</span>
                          <Badge 
                            variant={result.fleschKincaidAnalysis.appropriateForLevel ? 'default' : 'secondary'}
                            className="ml-2"
                          >
                            {result.fleschKincaidAnalysis.level}
                          </Badge>
                        </div>
                        
                        <div className="text-sm space-y-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="font-medium text-blue-700">FK Score:</span>
                              <span className="ml-2 text-blue-600">{result.fleschKincaidAnalysis.fleschKincaid}</span>
                            </div>
                            <div>
                              <span className="font-medium text-blue-700">Readability:</span>
                              <span className="ml-2 text-blue-600">{result.fleschKincaidAnalysis.readability}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="font-medium text-blue-700">Avg Sentence Length:</span>
                              <span className="ml-2 text-blue-600">{result.fleschKincaidAnalysis.averageSentenceLength} words</span>
                            </div>
                            <div>
                              <span className="font-medium text-blue-700">Avg Syllables/Word:</span>
                              <span className="ml-2 text-blue-600">{result.fleschKincaidAnalysis.averageSyllablesPerWord}</span>
                            </div>
                          </div>
                          
                          {!result.fleschKincaidAnalysis.appropriateForLevel && (
                            <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
                              <span className="font-medium text-yellow-800">Suggestion:</span>
                              <span className="text-yellow-700 ml-1">
                                {result.fleschKincaidAnalysis.level === 'Basic' 
                                  ? 'Try using simpler words and shorter sentences.'
                                  : 'Consider using more complex vocabulary and varied sentence structures.'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Flesch-Kincaid Overall Analysis */}
        {results.overallFKAnalysis && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 text-blue-600 mr-2" />
                Text Complexity Summary
                <Badge variant="outline" className="ml-2">
                  {results.unifiedLevel}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {results.overallFKAnalysis.averageScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-blue-700">Average FK Score</div>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(results.overallFKAnalysis.appropriatenessRate * 100)}%
                    </div>
                    <div className="text-sm text-green-700">Appropriate Complexity</div>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {Object.keys(results.overallFKAnalysis.levelDistribution).length}
                    </div>
                    <div className="text-sm text-purple-700">Complexity Levels Used</div>
                  </div>
                </div>
                
                {Object.keys(results.overallFKAnalysis.levelDistribution).length > 1 && (
                  <div>
                    <h4 className="font-medium mb-2">Level Distribution:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(results.overallFKAnalysis.levelDistribution).map(([level, count]) => (
                        <div key={level} className="flex justify-between p-2 bg-gray-50 rounded">
                          <span>{level}:</span>
                          <span className="font-medium">{count} response{count !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Complexity Guidance:</strong> 
                    {results.overallFKAnalysis.appropriatenessRate >= 0.8 
                      ? ' Excellent! Your writing complexity is well-matched to your level.'
                      : results.overallFKAnalysis.appropriatenessRate >= 0.6
                      ? ' Good progress! Try to maintain consistent complexity in your responses.'
                      : ' Focus on writing at an appropriate complexity level for better assessment results.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* AI Assessment Summary */}
        {results.aiAssessments && results.aiAssessments.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 text-purple-600 mr-2" />
                AI Assessment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.aiAssessments.map((assessment, index) => (
                  <div key={index} className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Question {assessment.questionIndex + 1}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{assessment.cefr_level}</Badge>
                        {assessment.unified_level && (
                          <Badge variant="secondary">{assessment.unified_level}</Badge>
                        )}
                        <span className="text-sm font-medium">{assessment.finalScore || assessment.overall_score}/100</span>
                      </div>
                    </div>
                    
                    {assessment.feedback && (
                      <p className="text-sm text-gray-700 mb-2">{assessment.feedback}</p>
                    )}
                    
                    {assessment.complexity_suggestions && (
                      <p className="text-xs text-blue-600 mb-2 italic">{assessment.complexity_suggestions}</p>
                    )}
                    
                    {assessment.skill_breakdown && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                        {Object.entries(assessment.skill_breakdown).map(([skill, score]) => (
                          <div key={skill} className="flex justify-between p-2 bg-white rounded">
                            <span className="capitalize">{skill}:</span>
                            <span className="font-medium">{score}/100</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const currentQuestionData = assignment.questions[currentQuestion];

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
          <p className="text-gray-600">{assignment.description}</p>
        </div>
        
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

      {/* Progress */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-gray-600">
              Question {currentQuestion + 1} of {assignment.questions.length}
            </span>
          </div>
          <Progress 
            value={((currentQuestion + 1) / assignment.questions.length) * 100} 
            className="h-2" 
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 lg:grid-cols-1 gap-2">
                {assignment.questions.map((_, index) => (
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
                
                <Badge variant="outline">
                  {currentQuestionData.type.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-6">
                {/* Reading Passage */}
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
                  
                  {/* Answer Input */}
                  {currentQuestionData.type === 'multiple_choice' && (
                    <RadioGroup
                      value={answers[currentQuestion] || ''}
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
                      value={answers[currentQuestion] || ''}
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
                      value={answers[currentQuestion] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                      placeholder="Enter your answer..."
                      className="max-w-md"
                    />
                  )}
                  
                  {(currentQuestionData.type === 'short_answer' || currentQuestionData.type === 'essay') && (
                    <Textarea
                      value={answers[currentQuestion] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                      placeholder="Enter your answer..."
                      rows={currentQuestionData.type === 'essay' ? 8 : 4}
                    />
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
                    {currentQuestion < assignment.questions.length - 1 ? (
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
                        Submit Assignment
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

export default AssignmentSystem;