import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle, Lock, Star, BookOpen, Clock, Target, Award, ArrowRight, Volume2, RotateCcw } from 'lucide-react';
import { useProgress } from '../providers/ProgressProvider';
import { useAudio } from '../providers/AudioProvider';

const Lessons = () => {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [lessonProgress, setLessonProgress] = useState({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const { progress, addXP, updateProgress } = useProgress();
  const { speak } = useAudio();

  // Lessons database
  const lessonsData = {
    unit1: {
      id: 'unit1',
      title: 'Basic Greetings',
      description: 'Learn essential greetings and introductions',
      difficulty: 'beginner',
      estimatedTime: '15 min',
      lessons: [
        {
          id: 'lesson1',
          title: 'Hello and Goodbye',
          description: 'Basic greeting expressions',
          slides: [
            {
              type: 'introduction',
              title: 'Welcome to Basic Greetings!',
              content: 'In this lesson, you\'ll learn the most common ways to greet people in English.',
              image: '👋'
            },
            {
              type: 'vocabulary',
              title: 'Common Greetings',
              words: [
                { word: 'Hello', pronunciation: '/həˈloʊ/', meaning: 'A greeting used when meeting someone', audio: 'hello' },
                { word: 'Hi', pronunciation: '/haɪ/', meaning: 'An informal greeting', audio: 'hi' },
                { word: 'Good morning', pronunciation: '/ɡʊd ˈmɔrnɪŋ/', meaning: 'Greeting used before noon', audio: 'good-morning' },
                { word: 'Good afternoon', pronunciation: '/ɡʊd ˌæftərˈnun/', meaning: 'Greeting used after noon', audio: 'good-afternoon' },
                { word: 'Good evening', pronunciation: '/ɡʊd ˈivnɪŋ/', meaning: 'Greeting used in the evening', audio: 'good-evening' }
              ]
            },
            {
              type: 'dialogue',
              title: 'Sample Conversation',
              dialogue: [
                { speaker: 'Person A', text: 'Good morning! How are you?', audio: 'dialogue1a' },
                { speaker: 'Person B', text: 'Good morning! I\'m fine, thank you. How are you?', audio: 'dialogue1b' },
                { speaker: 'Person A', text: 'I\'m doing well, thanks!', audio: 'dialogue1c' }
              ]
            },
            {
              type: 'practice',
              title: 'Practice Time',
              content: 'Now let\'s practice what you\'ve learned. Try saying these greetings out loud.',
              exercises: [
                { text: 'Hello', instruction: 'Say this greeting' },
                { text: 'Good morning', instruction: 'Use this greeting before noon' },
                { text: 'Good evening', instruction: 'Use this greeting in the evening' }
              ]
            }
          ],
          quiz: [
            {
              question: 'Which greeting would you use at 2 PM?',
              options: ['Good morning', 'Good afternoon', 'Good evening', 'Good night'],
              correct: 'Good afternoon'
            },
            {
              question: 'What is an informal way to say hello?',
              options: ['Good morning', 'Hi', 'Good evening', 'Goodbye'],
              correct: 'Hi'
            },
            {
              question: 'When do you say "Good evening"?',
              options: ['In the morning', 'At noon', 'In the afternoon', 'In the evening'],
              correct: 'In the evening'
            }
          ]
        },
        {
          id: 'lesson2',
          title: 'Introducing Yourself',
          description: 'Learn how to introduce yourself and others',
          slides: [
            {
              type: 'introduction',
              title: 'Introducing Yourself',
              content: 'Learn how to tell people your name and basic information about yourself.',
              image: '🤝'
            },
            {
              type: 'vocabulary',
              title: 'Introduction Phrases',
              words: [
                { word: 'My name is...', pronunciation: '/maɪ neɪm ɪz/', meaning: 'Used to tell someone your name', audio: 'my-name-is' },
                { word: 'I\'m...', pronunciation: '/aɪm/', meaning: 'Contraction of "I am"', audio: 'im' },
                { word: 'Nice to meet you', pronunciation: '/naɪs tu mit ju/', meaning: 'Polite phrase when meeting someone new', audio: 'nice-to-meet-you' },
                { word: 'Where are you from?', pronunciation: '/wɛr ɑr ju frʌm/', meaning: 'Question about someone\'s origin', audio: 'where-are-you-from' },
                { word: 'I\'m from...', pronunciation: '/aɪm frʌm/', meaning: 'Used to tell where you\'re from', audio: 'im-from' }
              ]
            },
            {
              type: 'dialogue',
              title: 'Introduction Conversation',
              dialogue: [
                { speaker: 'Sarah', text: 'Hi! My name is Sarah. What\'s your name?', audio: 'intro-dialogue1a' },
                { speaker: 'John', text: 'Hello Sarah! I\'m John. Nice to meet you.', audio: 'intro-dialogue1b' },
                { speaker: 'Sarah', text: 'Nice to meet you too, John. Where are you from?', audio: 'intro-dialogue1c' },
                { speaker: 'John', text: 'I\'m from Canada. How about you?', audio: 'intro-dialogue1d' },
                { speaker: 'Sarah', text: 'I\'m from the United States.', audio: 'intro-dialogue1e' }
              ]
            }
          ],
          quiz: [
            {
              question: 'How do you ask someone\'s name?',
              options: ['Where are you from?', 'What\'s your name?', 'How are you?', 'Nice to meet you'],
              correct: 'What\'s your name?'
            },
            {
              question: 'What do you say when meeting someone for the first time?',
              options: ['Goodbye', 'See you later', 'Nice to meet you', 'How are you?'],
              correct: 'Nice to meet you'
            }
          ]
        }
      ]
    },
    unit2: {
      id: 'unit2',
      title: 'Numbers and Time',
      description: 'Learn numbers, dates, and telling time',
      difficulty: 'beginner',
      estimatedTime: '20 min',
      lessons: [
        {
          id: 'lesson3',
          title: 'Numbers 1-20',
          description: 'Basic numbers and counting',
          slides: [
            {
              type: 'introduction',
              title: 'Learning Numbers',
              content: 'Numbers are essential for everyday communication. Let\'s start with 1-20.',
              image: '🔢'
            },
            {
              type: 'vocabulary',
              title: 'Numbers 1-10',
              words: [
                { word: 'One', pronunciation: '/wʌn/', meaning: 'The number 1', audio: 'one' },
                { word: 'Two', pronunciation: '/tu/', meaning: 'The number 2', audio: 'two' },
                { word: 'Three', pronunciation: '/θri/', meaning: 'The number 3', audio: 'three' },
                { word: 'Four', pronunciation: '/fɔr/', meaning: 'The number 4', audio: 'four' },
                { word: 'Five', pronunciation: '/faɪv/', meaning: 'The number 5', audio: 'five' }
              ]
            },
            {
              type: 'practice',
              title: 'Count with Me',
              content: 'Let\'s practice counting from 1 to 10. Click each number to hear it.',
              exercises: [
                { text: '1 - One', instruction: 'Click to hear pronunciation' },
                { text: '2 - Two', instruction: 'Click to hear pronunciation' },
                { text: '3 - Three', instruction: 'Click to hear pronunciation' },
                { text: '4 - Four', instruction: 'Click to hear pronunciation' },
                { text: '5 - Five', instruction: 'Click to hear pronunciation' }
              ]
            }
          ],
          quiz: [
            {
              question: 'How do you say the number 3?',
              options: ['Tree', 'Three', 'Free', 'Thee'],
              correct: 'Three'
            },
            {
              question: 'What comes after four?',
              options: ['Three', 'Five', 'Six', 'Two'],
              correct: 'Five'
            }
          ]
        }
      ]
    },
    unit3: {
      id: 'unit3',
      title: 'Family and Relationships',
      description: 'Learn about family members and relationships',
      difficulty: 'intermediate',
      estimatedTime: '25 min',
      lessons: [
        {
          id: 'lesson4',
          title: 'Family Members',
          description: 'Vocabulary for family relationships',
          slides: [
            {
              type: 'introduction',
              title: 'Family Vocabulary',
              content: 'Learn the words for different family members and relationships.',
              image: '👨‍👩‍👧‍👦'
            },
            {
              type: 'vocabulary',
              title: 'Immediate Family',
              words: [
                { word: 'Mother', pronunciation: '/ˈmʌðər/', meaning: 'Female parent', audio: 'mother' },
                { word: 'Father', pronunciation: '/ˈfɑðər/', meaning: 'Male parent', audio: 'father' },
                { word: 'Sister', pronunciation: '/ˈsɪstər/', meaning: 'Female sibling', audio: 'sister' },
                { word: 'Brother', pronunciation: '/ˈbrʌðər/', meaning: 'Male sibling', audio: 'brother' },
                { word: 'Daughter', pronunciation: '/ˈdɔtər/', meaning: 'Female child', audio: 'daughter' },
                { word: 'Son', pronunciation: '/sʌn/', meaning: 'Male child', audio: 'son' }
              ]
            }
          ],
          quiz: [
            {
              question: 'What do you call your female parent?',
              options: ['Sister', 'Mother', 'Daughter', 'Aunt'],
              correct: 'Mother'
            },
            {
              question: 'What do you call your male sibling?',
              options: ['Father', 'Son', 'Brother', 'Uncle'],
              correct: 'Brother'
            }
          ]
        }
      ]
    }
  };

  useEffect(() => {
    // Load lesson progress from localStorage
    const savedProgress = localStorage.getItem('lessonProgress');
    if (savedProgress) {
      setLessonProgress(JSON.parse(savedProgress));
    }
  }, []);

  const saveProgress = (unitId, lessonId, completed = false) => {
    const newProgress = {
      ...lessonProgress,
      [`${unitId}-${lessonId}`]: {
        completed,
        completedAt: completed ? new Date().toISOString() : null,
        currentSlide: completed ? 0 : currentSlide
      }
    };
    setLessonProgress(newProgress);
    localStorage.setItem('lessonProgress', JSON.stringify(newProgress));
  };

  const isLessonCompleted = (unitId, lessonId) => {
    return lessonProgress[`${unitId}-${lessonId}`]?.completed || false;
  };

  const isLessonUnlocked = (unitId, lessonIndex) => {
    if (lessonIndex === 0) return true;
    const unit = lessonsData[unitId];
    const previousLesson = unit.lessons[lessonIndex - 1];
    return isLessonCompleted(unitId, previousLesson.id);
  };

  const handleLessonComplete = () => {
    if (selectedUnit && selectedLesson) {
      saveProgress(selectedUnit.id, selectedLesson.id, true);
      addXP(50, 'lessons');
      updateProgress('completedLessons', 1);
      
      // Reset lesson state
      setCurrentSlide(0);
      setShowQuiz(false);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setSelectedLesson(null);
    }
  };

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);
    
    // Calculate score
    let correct = 0;
    selectedLesson.quiz.forEach((question, index) => {
      if (quizAnswers[index] === question.correct) {
        correct++;
      }
    });
    
    const score = (correct / selectedLesson.quiz.length) * 100;
    
    // Award XP based on score
    const xpAmount = Math.round(score / 10) * 5; // 5 XP per 10% score
    addXP(xpAmount, 'lessons');
    
    if (score >= 70) {
      // Complete lesson if score is 70% or higher
      setTimeout(() => {
        handleLessonComplete();
      }, 2000);
    }
  };

  const renderSlide = () => {
    if (!selectedLesson || !selectedLesson.slides[currentSlide]) return null;
    
    const slide = selectedLesson.slides[currentSlide];
    
    switch (slide.type) {
      case 'introduction':
        return (
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="text-6xl mb-6">{slide.image}</div>
            <h2 className="text-3xl font-bold mb-4">{slide.title}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{slide.content}</p>
          </motion.div>
        );
        
      case 'vocabulary':
        return (
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold mb-6 text-center">{slide.title}</h2>
            <div className="grid gap-4 max-w-4xl mx-auto">
              {slide.words.map((wordData, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-xl font-semibold">{wordData.word}</h3>
                      <button
                        onClick={() => speak(wordData.word)}
                        className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                      >
                        <Volume2 className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                    <span className="text-sm text-muted-foreground font-mono">
                      {wordData.pronunciation}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{wordData.meaning}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
        
      case 'dialogue':
        return (
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold mb-6 text-center">{slide.title}</h2>
            <div className="max-w-3xl mx-auto space-y-4">
              {slide.dialogue.map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: line.speaker === 'Person A' || line.speaker === 'Sarah' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.3 }}
                  className={`flex ${line.speaker === 'Person A' || line.speaker === 'Sarah' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    line.speaker === 'Person A' || line.speaker === 'Sarah'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-accent-foreground'
                  }`}>
                    <div className="text-xs font-medium mb-1">{line.speaker}</div>
                    <div className="flex items-center justify-between">
                      <p>{line.text}</p>
                      <button
                        onClick={() => speak(line.text)}
                        className="ml-2 p-1 rounded opacity-70 hover:opacity-100 transition-opacity"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
        
      case 'practice':
        return (
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold mb-4 text-center">{slide.title}</h2>
            <p className="text-center text-muted-foreground mb-8">{slide.content}</p>
            <div className="grid gap-4 max-w-2xl mx-auto">
              {slide.exercises.map((exercise, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => speak(exercise.text)}
                  className="p-6 bg-card border border-border rounded-lg hover:shadow-lg transition-all hover:scale-105 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-lg font-semibold mb-1">{exercise.text}</div>
                      <div className="text-sm text-muted-foreground">{exercise.instruction}</div>
                    </div>
                    <Volume2 className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        );
        
      default:
        return null;
    }
  };

  const renderQuiz = () => {
    if (!selectedLesson?.quiz) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center mb-8">
          <Award className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Lesson Quiz</h2>
          <p className="text-muted-foreground">Test your understanding of this lesson</p>
        </div>
        
        <div className="space-y-6">
          {selectedLesson.quiz.map((question, questionIndex) => (
            <div key={questionIndex} className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                {questionIndex + 1}. {question.question}
              </h3>
              
              <div className="space-y-2">
                {question.options.map((option, optionIndex) => {
                  const isSelected = quizAnswers[questionIndex] === option;
                  const isCorrect = option === question.correct;
                  const showResult = quizSubmitted;
                  
                  return (
                    <label
                      key={optionIndex}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected && !showResult
                          ? 'border-primary bg-primary/5'
                          : showResult
                          ? isCorrect
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : isSelected && !isCorrect
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-border opacity-50'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${questionIndex}`}
                        value={option}
                        checked={isSelected}
                        onChange={(e) => setQuizAnswers(prev => ({
                          ...prev,
                          [questionIndex]: e.target.value
                        }))}
                        disabled={quizSubmitted}
                        className="mr-3"
                      />
                      <span className="flex-1">{option}</span>
                      {showResult && isCorrect && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {!quizSubmitted ? (
          <div className="text-center mt-8">
            <button
              onClick={handleQuizSubmit}
              disabled={Object.keys(quizAnswers).length < selectedLesson.quiz.length}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Submit Quiz
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-8 p-6 bg-card border border-border rounded-lg"
          >
            <div className="mb-4">
              {(() => {
                let correct = 0;
                selectedLesson.quiz.forEach((question, index) => {
                  if (quizAnswers[index] === question.correct) correct++;
                });
                const score = (correct / selectedLesson.quiz.length) * 100;
                
                return (
                  <>
                    <div className="text-3xl font-bold mb-2">{score.toFixed(0)}%</div>
                    <div className="text-muted-foreground">
                      {correct} out of {selectedLesson.quiz.length} correct
                    </div>
                    {score >= 70 ? (
                      <div className="text-green-600 dark:text-green-400 mt-2">
                        🎉 Great job! Lesson completed!
                      </div>
                    ) : (
                      <div className="text-yellow-600 dark:text-yellow-400 mt-2">
                        Keep practicing to improve your score!
                      </div>
                    )}
                  </>
                );
              })()
            }
            </div>
            
            <button
              onClick={() => {
                setShowQuiz(false);
                setQuizAnswers({});
                setQuizSubmitted(false);
                setCurrentSlide(0);
              }}
              className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors mr-4"
            >
              Review Lesson
            </button>
            
            <button
              onClick={() => setSelectedLesson(null)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Back to Lessons
            </button>
          </motion.div>
        )}
      </motion.div>
    );
  };

  if (selectedLesson) {
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Lesson Header */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setSelectedLesson(null);
                  setCurrentSlide(0);
                  setShowQuiz(false);
                  setQuizAnswers({});
                  setQuizSubmitted(false);
                }}
                className="p-2 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <div>
                <h1 className="text-xl font-bold">{selectedLesson.title}</h1>
                <p className="text-sm text-muted-foreground">{selectedLesson.description}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {!showQuiz && (
                <div className="text-sm text-muted-foreground">
                  Slide {currentSlide + 1} of {selectedLesson.slides.length}
                </div>
              )}
              
              <button
                onClick={() => {
                  setCurrentSlide(0);
                  setShowQuiz(false);
                  setQuizAnswers({});
                  setQuizSubmitted(false);
                }}
                className="p-2 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Lesson Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {showQuiz ? renderQuiz() : renderSlide()}
          </AnimatePresence>
        </div>
        
        {/* Navigation */}
        {!showQuiz && (
          <div className="bg-card border-t border-border px-6 py-4">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
                className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <div className="flex space-x-2">
                {selectedLesson.slides.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentSlide ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              
              {currentSlide < selectedLesson.slides.length - 1 ? (
                <button
                  onClick={() => setCurrentSlide(currentSlide + 1)}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => setShowQuiz(true)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Take Quiz
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Structured Lessons</h1>
        <p className="text-muted-foreground">Follow our carefully designed curriculum to master English step by step</p>
      </div>

      {/* Units Grid */}
      <div className="grid gap-6">
        {Object.values(lessonsData).map((unit, unitIndex) => (
          <motion.div
            key={unit.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: unitIndex * 0.1 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-lg"
          >
            {/* Unit Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold mb-2">{unit.title}</h2>
                <p className="text-muted-foreground mb-2">{unit.description}</p>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{unit.estimatedTime}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target className="w-4 h-4" />
                    <span className="capitalize">{unit.difficulty}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">Progress</div>
                <div className="text-lg font-semibold">
                  {unit.lessons.filter(lesson => isLessonCompleted(unit.id, lesson.id)).length}/{unit.lessons.length}
                </div>
              </div>
            </div>
            
            {/* Lessons */}
            <div className="grid gap-3">
              {unit.lessons.map((lesson, lessonIndex) => {
                const isCompleted = isLessonCompleted(unit.id, lesson.id);
                const isUnlocked = isLessonUnlocked(unit.id, lessonIndex);
                
                return (
                  <motion.button
                    key={lesson.id}
                    onClick={() => isUnlocked && setSelectedLesson(lesson)}
                    disabled={!isUnlocked}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all text-left ${
                      isCompleted
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                        : isUnlocked
                        ? 'border-border hover:border-primary/50 hover:shadow-md'
                        : 'border-border opacity-50 cursor-not-allowed'
                    }`}
                    whileHover={isUnlocked ? { scale: 1.02 } : {}}
                    whileTap={isUnlocked ? { scale: 0.98 } : {}}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isUnlocked
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : isUnlocked ? (
                          <Play className="w-5 h-5" />
                        ) : (
                          <Lock className="w-5 h-5" />
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-semibold">{lesson.title}</h3>
                        <p className="text-sm text-muted-foreground">{lesson.description}</p>
                      </div>
                    </div>
                    
                    {isCompleted && (
                      <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">Completed</span>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Lessons;