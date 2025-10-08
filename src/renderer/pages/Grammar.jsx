import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, XCircle, RotateCcw, Lightbulb, Target, Award, Brain, ArrowRight } from 'lucide-react';
import { useProgress } from '../providers/ProgressProvider';

const Grammar = () => {
  const [currentExercise, setCurrentExercise] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [exerciseType, setExerciseType] = useState('multiple-choice');
  const [grammarTopic, setGrammarTopic] = useState('all');
  const [difficulty, setDifficulty] = useState('beginner');
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [showExplanation, setShowExplanation] = useState(false);
  const [userInput, setUserInput] = useState('');
  const { addXP, updateProgress } = useProgress();

  // Grammar exercises database
  const grammarExercises = {
    'present-tense': {
      beginner: [
        {
          id: 1,
          type: 'multiple-choice',
          question: 'She _____ to school every day.',
          options: ['go', 'goes', 'going', 'gone'],
          correct: 'goes',
          explanation: 'Use "goes" with third person singular (he, she, it) in present simple tense.',
          topic: 'Present Simple',
          difficulty: 'beginner'
        },
        {
          id: 2,
          type: 'fill-blank',
          question: 'I _____ (work) in an office.',
          correct: 'work',
          explanation: 'Use the base form of the verb with "I" in present simple tense.',
          topic: 'Present Simple',
          difficulty: 'beginner'
        },
        {
          id: 3,
          type: 'multiple-choice',
          question: 'They _____ playing football right now.',
          options: ['is', 'are', 'am', 'be'],
          correct: 'are',
          explanation: 'Use "are" with plural subjects (they, we) in present continuous tense.',
          topic: 'Present Continuous',
          difficulty: 'beginner'
        }
      ],
      intermediate: [
        {
          id: 4,
          type: 'multiple-choice',
          question: 'She _____ been working here for five years.',
          options: ['have', 'has', 'had', 'having'],
          correct: 'has',
          explanation: 'Use "has" with third person singular in present perfect tense.',
          topic: 'Present Perfect',
          difficulty: 'intermediate'
        },
        {
          id: 5,
          type: 'sentence-correction',
          question: 'I am knowing the answer.',
          correct: 'I know the answer.',
          explanation: 'Stative verbs like "know" are not used in continuous tenses.',
          topic: 'Stative Verbs',
          difficulty: 'intermediate'
        }
      ]
    },
    'past-tense': {
      beginner: [
        {
          id: 6,
          type: 'multiple-choice',
          question: 'Yesterday, I _____ to the store.',
          options: ['go', 'went', 'going', 'gone'],
          correct: 'went',
          explanation: 'Use the past form "went" for past simple tense.',
          topic: 'Past Simple',
          difficulty: 'beginner'
        },
        {
          id: 7,
          type: 'fill-blank',
          question: 'She _____ (study) all night yesterday.',
          correct: 'studied',
          explanation: 'Add "-ed" to regular verbs to form past simple tense.',
          topic: 'Past Simple',
          difficulty: 'beginner'
        }
      ],
      intermediate: [
        {
          id: 8,
          type: 'multiple-choice',
          question: 'When I arrived, they _____ already left.',
          options: ['have', 'has', 'had', 'having'],
          correct: 'had',
          explanation: 'Use past perfect (had + past participle) for actions completed before another past action.',
          topic: 'Past Perfect',
          difficulty: 'intermediate'
        }
      ]
    },
    'articles': {
      beginner: [
        {
          id: 9,
          type: 'multiple-choice',
          question: 'I saw _____ elephant at the zoo.',
          options: ['a', 'an', 'the', 'no article'],
          correct: 'an',
          explanation: 'Use "an" before words starting with vowel sounds.',
          topic: 'Indefinite Articles',
          difficulty: 'beginner'
        },
        {
          id: 10,
          type: 'multiple-choice',
          question: '_____ sun rises in the east.',
          options: ['A', 'An', 'The', 'No article'],
          correct: 'The',
          explanation: 'Use "the" with unique objects like the sun, moon, earth.',
          topic: 'Definite Articles',
          difficulty: 'beginner'
        }
      ],
      intermediate: [
        {
          id: 11,
          type: 'sentence-correction',
          question: 'I love the music.',
          correct: 'I love music.',
          explanation: 'Don\'t use "the" with uncountable nouns when speaking generally.',
          topic: 'Articles with Uncountable Nouns',
          difficulty: 'intermediate'
        }
      ]
    },
    'prepositions': {
      beginner: [
        {
          id: 12,
          type: 'multiple-choice',
          question: 'The book is _____ the table.',
          options: ['in', 'on', 'at', 'by'],
          correct: 'on',
          explanation: 'Use "on" for surfaces.',
          topic: 'Prepositions of Place',
          difficulty: 'beginner'
        },
        {
          id: 13,
          type: 'multiple-choice',
          question: 'I wake up _____ 7 o\'clock.',
          options: ['in', 'on', 'at', 'by'],
          correct: 'at',
          explanation: 'Use "at" with specific times.',
          topic: 'Prepositions of Time',
          difficulty: 'beginner'
        }
      ],
      intermediate: [
        {
          id: 14,
          type: 'fill-blank',
          question: 'She is good _____ mathematics.',
          correct: 'at',
          explanation: 'Use "good at" for skills and abilities.',
          topic: 'Dependent Prepositions',
          difficulty: 'intermediate'
        }
      ]
    }
  };

  const topics = {
    'all': 'All Topics',
    'present-tense': 'Present Tense',
    'past-tense': 'Past Tense',
    'articles': 'Articles',
    'prepositions': 'Prepositions'
  };

  useEffect(() => {
    selectNextExercise();
  }, [grammarTopic, difficulty, exerciseType]);

  const getAllExercises = () => {
    let exercises = [];
    
    if (grammarTopic === 'all') {
      Object.values(grammarExercises).forEach(topicExercises => {
        if (topicExercises[difficulty]) {
          exercises = exercises.concat(topicExercises[difficulty]);
        }
      });
    } else {
      if (grammarExercises[grammarTopic] && grammarExercises[grammarTopic][difficulty]) {
        exercises = grammarExercises[grammarTopic][difficulty];
      }
    }
    
    return exercises.filter(ex => exerciseType === 'all' || ex.type === exerciseType);
  };

  const selectNextExercise = () => {
    const availableExercises = getAllExercises();
    
    if (availableExercises.length === 0) {
      setCurrentExercise(null);
      return;
    }
    
    const randomExercise = availableExercises[Math.floor(Math.random() * availableExercises.length)];
    setCurrentExercise(randomExercise);
    setSelectedAnswer('');
    setUserInput('');
    setShowFeedback(false);
    setShowExplanation(false);
  };

  const handleAnswerSubmit = () => {
    if (!currentExercise) return;
    
    let isCorrect = false;
    let userAnswer = '';
    
    if (currentExercise.type === 'multiple-choice') {
      userAnswer = selectedAnswer;
      isCorrect = selectedAnswer === currentExercise.correct;
    } else if (currentExercise.type === 'fill-blank' || currentExercise.type === 'sentence-correction') {
      userAnswer = userInput.trim();
      isCorrect = userAnswer.toLowerCase() === currentExercise.correct.toLowerCase();
    }
    
    setShowFeedback(true);
    
    // Update session stats
    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));
    
    // Award XP
    const xpAmount = isCorrect ? 15 : 5;
    addXP(xpAmount, 'grammar');
    
    if (isCorrect) {
      updateProgress('completedLessons', 1);
    }
  };

  const handleNextExercise = () => {
    selectNextExercise();
  };

  const renderExercise = () => {
    if (!currentExercise) {
      return (
        <div className="text-center">
          <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No exercises available</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters to find exercises.
          </p>
          <button
            onClick={() => {
              setGrammarTopic('all');
              setDifficulty('beginner');
              setExerciseType('multiple-choice');
            }}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      );
    }

    return (
      <motion.div
        key={currentExercise.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-8 shadow-lg max-w-2xl mx-auto"
      >
        {/* Exercise Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">{currentExercise.topic}</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {currentExercise.type.replace('-', ' ')} • {currentExercise.difficulty}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Progress</div>
            <div className="text-lg font-semibold">
              {sessionStats.correct}/{sessionStats.total}
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <h2 className="text-xl font-medium mb-4">{currentExercise.question}</h2>
          
          {/* Answer Options */}
          {currentExercise.type === 'multiple-choice' && (
            <div className="space-y-3">
              {currentExercise.options.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedAnswer === option
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  } ${
                    showFeedback
                      ? option === currentExercise.correct
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : selectedAnswer === option && option !== currentExercise.correct
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'opacity-50'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={selectedAnswer === option}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    disabled={showFeedback}
                    className="mr-3"
                  />
                  <span className="flex-1">{option}</span>
                  {showFeedback && option === currentExercise.correct && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {showFeedback && selectedAnswer === option && option !== currentExercise.correct && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </label>
              ))}
            </div>
          )}

          {/* Fill in the blank */}
          {(currentExercise.type === 'fill-blank' || currentExercise.type === 'sentence-correction') && (
            <div className="space-y-4">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !showFeedback && handleAnswerSubmit()}
                placeholder={currentExercise.type === 'fill-blank' ? 'Fill in the blank...' : 'Correct the sentence...'}
                disabled={showFeedback}
                className={`w-full p-4 text-lg rounded-lg border transition-all ${
                  showFeedback
                    ? userInput.toLowerCase().trim() === currentExercise.correct.toLowerCase()
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-input bg-background'
                }`}
              />
              
              {showFeedback && userInput.toLowerCase().trim() !== currentExercise.correct.toLowerCase() && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span className="font-medium text-green-700 dark:text-green-300">Correct Answer:</span>
                  </div>
                  <p className="text-green-600 dark:text-green-400">{currentExercise.correct}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className={`p-4 rounded-lg border ${
                (currentExercise.type === 'multiple-choice' && selectedAnswer === currentExercise.correct) ||
                ((currentExercise.type === 'fill-blank' || currentExercise.type === 'sentence-correction') && 
                 userInput.toLowerCase().trim() === currentExercise.correct.toLowerCase())
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-center mb-2">
                  {(currentExercise.type === 'multiple-choice' && selectedAnswer === currentExercise.correct) ||
                   ((currentExercise.type === 'fill-blank' || currentExercise.type === 'sentence-correction') && 
                    userInput.toLowerCase().trim() === currentExercise.correct.toLowerCase()) ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span className="font-medium text-green-700 dark:text-green-300">Correct!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-500 mr-2" />
                      <span className="font-medium text-red-700 dark:text-red-300">Incorrect</span>
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <Lightbulb className="w-4 h-4 mr-1" />
                  {showExplanation ? 'Hide' : 'Show'} Explanation
                </button>
                
                <AnimatePresence>
                  {showExplanation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-current/20"
                    >
                      <p className="text-sm">{currentExercise.explanation}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          {!showFeedback ? (
            <button
              onClick={handleAnswerSubmit}
              disabled={
                (currentExercise.type === 'multiple-choice' && !selectedAnswer) ||
                ((currentExercise.type === 'fill-blank' || currentExercise.type === 'sentence-correction') && !userInput.trim())
              }
              className="flex items-center space-x-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Target className="w-5 h-5" />
              <span>Submit Answer</span>
            </button>
          ) : (
            <button
              onClick={handleNextExercise}
              className="flex items-center space-x-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span>Next Exercise</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          
          <button
            onClick={selectNextExercise}
            className="flex items-center space-x-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Skip</span>
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Grammar Exercises</h1>
          <p className="text-muted-foreground">Master English grammar with interactive exercises</p>
        </div>
        
        {/* Session Stats */}
        <div className="bg-card border border-border rounded-lg px-4 py-2">
          <div className="text-sm text-muted-foreground">Session Score</div>
          <div className="text-lg font-semibold">
            {sessionStats.correct}/{sessionStats.total}
            {sessionStats.total > 0 && (
              <span className="text-sm text-muted-foreground ml-2">
                ({Math.round((sessionStats.correct / sessionStats.total) * 100)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Topic Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Grammar Topic</label>
          <select
            value={grammarTopic}
            onChange={(e) => setGrammarTopic(e.target.value)}
            className="w-full p-3 rounded-lg border border-input bg-background"
          >
            {Object.entries(topics).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Difficulty Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Difficulty Level</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full p-3 rounded-lg border border-input bg-background"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Exercise Type Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Exercise Type</label>
          <select
            value={exerciseType}
            onChange={(e) => setExerciseType(e.target.value)}
            className="w-full p-3 rounded-lg border border-input bg-background"
          >
            <option value="multiple-choice">Multiple Choice</option>
            <option value="fill-blank">Fill in the Blank</option>
            <option value="sentence-correction">Sentence Correction</option>
            <option value="all">All Types</option>
          </select>
        </div>
      </div>

      {/* Exercise Area */}
      <div className="flex-1 flex items-center justify-center">
        {renderExercise()}
      </div>
    </div>
  );
};

export default Grammar;