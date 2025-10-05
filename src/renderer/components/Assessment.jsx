import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import Button from './ui/Button';
import LoadingSpinner from './ui/LoadingSpinner';
import { Progress } from './ui/Progress';
import assessmentService from '../services/assessmentService';
import { useAuth } from '../contexts/AuthContext';
import { Mic, MicOff, Play, Pause, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';

const Assessment = ({ onComplete, targetLanguage = 'English' }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState('intro');
  const [sessionId, setSessionId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startAssessment = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await assessmentService.startAssessment(
        user.id, 
        targetLanguage, 
        'initial'
      );
      
      if (result.success) {
        setSessionId(result.sessionId);
        setTasks(result.tasks);
        setCurrentStep('assessment');
        setCurrentTaskIndex(0);
        startTaskTimer(result.tasks[0]);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to start assessment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startTaskTimer = (task) => {
    if (task.expected_duration_minutes) {
      setTimeRemaining(task.expected_duration_minutes * 60);
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const stopTaskTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeRemaining(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const submitTaskResponse = async () => {
    const currentTask = tasks[currentTaskIndex];
    const response = responses[currentTask.id] || '';
    
    if (!response.trim() && !audioBlob) {
      setError('Please provide a response before continuing.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      let audioUrl = null;
      if (audioBlob) {
        // In a real implementation, you would upload the audio file
        // For now, we'll create a local URL
        audioUrl = URL.createObjectURL(audioBlob);
      }
      
      const result = await assessmentService.submitTaskResponse(
        currentTask.id,
        response,
        audioUrl
      );
      
      if (result.success) {
        stopTaskTimer();
        
        // Move to next task or complete assessment
        if (currentTaskIndex < tasks.length - 1) {
          setCurrentTaskIndex(currentTaskIndex + 1);
          setAudioBlob(null);
          startTaskTimer(tasks[currentTaskIndex + 1]);
        } else {
          // Complete assessment
          const completionResult = await assessmentService.completeAssessment();
          if (completionResult.success) {
            setResults(completionResult.results);
            setCurrentStep('results');
          } else {
            setError(completionResult.error);
          }
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to submit response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponseChange = (value) => {
    const currentTask = tasks[currentTaskIndex];
    setResponses(prev => ({
      ...prev,
      [currentTask.id]: value
    }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to safely parse and validate question_data
  const getQuestionData = (task) => {
    try {
      let questionData = task.question_data;
      
      // If question_data is a string, parse it
      if (typeof questionData === 'string') {
        questionData = JSON.parse(questionData);
      }
      
      // Ensure it's an object
      if (!questionData || typeof questionData !== 'object') {
        return null;
      }
      
      return questionData;
    } catch (error) {
      console.error('Error parsing question_data:', error);
      return null;
    }
  };

  // Helper function to safely get options array
  const getQuestionOptions = (task) => {
    const questionData = getQuestionData(task);
    if (!questionData || !questionData.options) {
      return [];
    }
    
    // Ensure options is an array
    if (Array.isArray(questionData.options)) {
      return questionData.options;
    }
    
    // If options is a string, try to parse it
    if (typeof questionData.options === 'string') {
      try {
        const parsed = JSON.parse(questionData.options);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error('Error parsing options:', error);
        return [];
      }
    }
    
    return [];
  };

  const getTaskIcon = (taskType) => {
    switch (taskType) {
      case 'conversation': return '💬';
      case 'writing': return '✍️';
      case 'grammar': return '📝';
      case 'vocabulary': return '📚';
      case 'pronunciation': return '🗣️';
      case 'multiple-choice': return '☑️';
      case 'true-false': return '✅';
      case 'speaking': return '🗣️';
      default: return '📋';
    }
  };

  const getCEFRColor = (level) => {
    const colors = {
      'A1': 'text-red-600',
      'A2': 'text-orange-600',
      'B1': 'text-yellow-600',
      'B2': 'text-green-600',
      'C1': 'text-blue-600',
      'C2': 'text-purple-600'
    };
    return colors[level] || 'text-gray-600';
  };

  const renderIntroduction = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto text-center"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Language Proficiency Assessment
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
          This assessment will help us determine your current {targetLanguage} proficiency level 
          and create a personalized learning path for you.
        </p>
      </div>
      
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">What to Expect</h2>
        <div className="grid md:grid-cols-2 gap-4 text-left">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">💬</span>
              <span>Conversation practice (3 minutes)</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">✍️</span>
              <span>Writing sample (5 minutes)</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📝</span>
              <span>Grammar exercises (2 minutes)</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📚</span>
              <span>Vocabulary assessment (4 minutes)</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🗣️</span>
              <span>Pronunciation check (2 minutes)</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⏱️</span>
              <span>Total time: ~15 minutes</span>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-left">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Before You Begin</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Ensure you have a quiet environment</li>
              <li>• Allow microphone access for speaking tasks</li>
              <li>• Answer naturally and honestly</li>
              <li>• Don't worry about making mistakes</li>
            </ul>
          </div>
        </div>
      </div>
      
      <Button 
        onClick={startAssessment} 
        disabled={isLoading}
        className="px-8 py-3 text-lg"
      >
        {isLoading ? <LoadingSpinner size="sm" message="" className="w-5 h-5 mr-2" /> : null}
        Start Assessment
      </Button>
    </motion.div>
  );

  const renderAssessmentTask = () => {
    const currentTask = tasks[currentTaskIndex];
    const progress = ((currentTaskIndex + 1) / tasks.length) * 100;
    const isAudioTask = currentTask.task_type === 'conversation' || currentTask.task_type === 'pronunciation';
    
    return (
      <motion.div
        key={currentTaskIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="max-w-4xl mx-auto"
      >
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Task {currentTaskIndex + 1} of {tasks.length}
            </span>
            {timeRemaining !== null && (
              <span className={`text-sm font-medium ${
                timeRemaining < 60 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'
              }`}>
                Time remaining: {formatTime(timeRemaining)}
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Task Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{getTaskIcon(currentTask.task_type)}</span>
              <div>
                <h2 className="text-xl font-semibold capitalize">
                  {currentTask.task_type} Assessment
                </h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>Expected time: {currentTask.expected_duration_minutes} minutes</span>
                  {currentTask.cefr_level && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
                      {currentTask.cefr_level}
                    </span>
                  )}
                  {currentTask.skill_type && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium capitalize">
                      {currentTask.skill_type}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Instructions (if separate from question) */}
          {(() => {
            const questionData = getQuestionData(currentTask);
            return questionData?.instructions && questionData.instructions !== questionData?.question_text && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Instructions:</h3>
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-sm">
                  {questionData.instructions}
                </p>
              </div>
            );
          })()}
          
          {/* Question/Prompt */}
          <div className="mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                {getQuestionData(currentTask)?.question_text || currentTask.prompt}
              </p>
            </div>
          </div>
          
          {/* Response Area */}
          <div className="space-y-4">
            {isAudioTask ? (
              <div className="space-y-4">
                {/* Audio Recording Controls */}
                <div className="flex items-center justify-center space-x-4 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? 'destructive' : 'default'}
                    className="flex items-center space-x-2"
                  >
                    {isRecording ? (
                      <><MicOff className="w-4 h-4" /> Stop Recording</>
                    ) : (
                      <><Mic className="w-4 h-4" /> Start Recording</>
                    )}
                  </Button>
                  
                  {audioBlob && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-600 dark:text-green-400">Recording saved</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAudioBlob(null)}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Optional Text Response */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Additional notes (optional):
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={responses[currentTask.id] || ''}
                    onChange={(e) => handleResponseChange(e.target.value)}
                    placeholder="Add any additional thoughts or notes here..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              </div>
            ) : currentTask.task_type === 'multiple-choice' ? (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select the best answer:
                </label>
                <div className="space-y-3">
                  {getQuestionOptions(currentTask).map((option, index) => (
                    <label key={index} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${currentTask.id}`}
                        value={option}
                        checked={responses[currentTask.id] === option}
                        onChange={(e) => handleResponseChange(e.target.value)}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : currentTask.task_type === 'true-false' ? (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select True or False:
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${currentTask.id}`}
                      value="true"
                      checked={responses[currentTask.id] === 'true'}
                      onChange={(e) => handleResponseChange(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">True</span>
                  </label>
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${currentTask.id}`}
                      value="false"
                      checked={responses[currentTask.id] === 'false'}
                      onChange={(e) => handleResponseChange(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">False</span>
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your response:
                </label>
                <textarea
                  ref={textareaRef}
                  value={responses[currentTask.id] || ''}
                  onChange={(e) => handleResponseChange(e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={6}
                  required
                />
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Word count: {(responses[currentTask.id] || '').split(' ').filter(w => w).length}
                </div>
              </div>
            )}
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}
          
          <div className="mt-6 flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (currentTaskIndex > 0) {
                  setCurrentTaskIndex(currentTaskIndex - 1);
                  stopTaskTimer();
                  startTaskTimer(tasks[currentTaskIndex - 1]);
                }
              }}
              disabled={currentTaskIndex === 0 || isLoading}
            >
              Previous
            </Button>
            
            <Button
              onClick={submitTaskResponse}
              disabled={isLoading || (!responses[currentTask.id] && !audioBlob)}
            >
              {isLoading ? (
                <LoadingSpinner size="sm" message="" className="w-4 h-4 mr-2" />
              ) : null}
              {currentTaskIndex === tasks.length - 1 ? 'Complete Assessment' : 'Next Task'}
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  };

  const renderResults = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Assessment Complete!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Here are your results and personalized recommendations.
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Overall Score */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Overall Results</h2>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {results.overallScore}/100
              </div>
              <div className={`text-2xl font-semibold ${getCEFRColor(results.cefrLevel)}`}>
                {results.cefrLevel} Level
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                IELTS Equivalent: {results.ieltsEquivalent}
              </div>
            </div>
          </div>
        </Card>
        
        {/* Skill Breakdown */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Skill Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(results.skillBreakdown).map(([skill, score]) => (
              <div key={skill} className="flex items-center justify-between">
                <span className="capitalize text-sm font-medium">{skill}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8">{Math.round(score)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      
      {/* Recommendations */}
      {results.recommendations && (
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Personalized Recommendations</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Focus Areas</h3>
              <ul className="space-y-1">
                {results.recommendations.focusAreas.map((area, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                    • {area}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Suggested Activities</h3>
              <ul className="space-y-1">
                {results.recommendations.suggestedActivities.map((activity, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-300">
                    • {activity}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
      
      <div className="text-center">
        <Button
          onClick={() => onComplete && onComplete(results)}
          className="px-8 py-3 text-lg"
        >
          Continue to Learning Dashboard
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <AnimatePresence mode="wait">
        {currentStep === 'intro' && renderIntroduction()}
        {currentStep === 'assessment' && renderAssessmentTask()}
        {currentStep === 'results' && renderResults()}
      </AnimatePresence>
    </div>
  );
};

export default Assessment;