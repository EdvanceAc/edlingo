import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Search, Filter, Star, Volume2, Eye, EyeOff, RotateCcw, CheckCircle, XCircle, Brain, Target } from 'lucide-react';
import { useProgress } from '../providers/ProgressProvider';
import { useAudio } from '../providers/AudioProvider';

const Vocabulary = () => {
  const [words, setWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [showDefinition, setShowDefinition] = useState(false);
  const [studyMode, setStudyMode] = useState('flashcards'); // flashcards, quiz, review
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [studyStats, setStudyStats] = useState({ correct: 0, total: 0 });
  const [showAddWord, setShowAddWord] = useState(false);
  const [newWord, setNewWord] = useState({ word: '', definition: '', category: 'general', difficulty: 'beginner' });
  const { addXP, updateProgress } = useProgress();
  const { speakText } = useAudio();

  // Sample vocabulary data
  const sampleWords = [
    {
      id: 1,
      word: 'serendipity',
      definition: 'The occurrence and development of events by chance in a happy or beneficial way',
      category: 'advanced',
      difficulty: 'advanced',
      example: 'Meeting my best friend was pure serendipity.',
      pronunciation: '/ˌserənˈdɪpəti/',
      learned: false,
      lastReviewed: null,
      correctCount: 0,
      totalAttempts: 0
    },
    {
      id: 2,
      word: 'ubiquitous',
      definition: 'Present, appearing, or found everywhere',
      category: 'academic',
      difficulty: 'advanced',
      example: 'Smartphones have become ubiquitous in modern society.',
      pronunciation: '/juːˈbɪkwɪtəs/',
      learned: false,
      lastReviewed: null,
      correctCount: 0,
      totalAttempts: 0
    },
    {
      id: 3,
      word: 'ephemeral',
      definition: 'Lasting for a very short time',
      category: 'literature',
      difficulty: 'intermediate',
      example: 'The beauty of cherry blossoms is ephemeral.',
      pronunciation: '/ɪˈfemərəl/',
      learned: true,
      lastReviewed: new Date(),
      correctCount: 3,
      totalAttempts: 4
    },
    {
      id: 4,
      word: 'resilient',
      definition: 'Able to withstand or recover quickly from difficult conditions',
      category: 'general',
      difficulty: 'intermediate',
      example: 'Children are remarkably resilient.',
      pronunciation: '/rɪˈzɪliənt/',
      learned: true,
      lastReviewed: new Date(),
      correctCount: 5,
      totalAttempts: 6
    },
    {
      id: 5,
      word: 'meticulous',
      definition: 'Showing great attention to detail; very careful and precise',
      category: 'professional',
      difficulty: 'intermediate',
      example: 'She was meticulous in her research.',
      pronunciation: '/məˈtɪkjələs/',
      learned: false,
      lastReviewed: null,
      correctCount: 1,
      totalAttempts: 3
    },
    {
      id: 6,
      word: 'ambiguous',
      definition: 'Open to more than one interpretation; having a double meaning',
      category: 'academic',
      difficulty: 'intermediate',
      example: 'The politician\'s statement was deliberately ambiguous.',
      pronunciation: '/æmˈbɪɡjuəs/',
      learned: false,
      lastReviewed: null,
      correctCount: 0,
      totalAttempts: 2
    }
  ];

  useEffect(() => {
    // Load words from storage or use sample data
    try {
      const savedWords = localStorage.getItem('vocabularyWords');
      if (savedWords) {
        const parsedWords = JSON.parse(savedWords);
        setWords(parsedWords);
      } else {
        setWords(sampleWords);
        localStorage.setItem('vocabularyWords', JSON.stringify(sampleWords));
      }
    } catch (error) {
      console.warn('Failed to load vocabulary from localStorage:', error);
      // Use sample data as fallback
      setWords(sampleWords);
      try {
        localStorage.setItem('vocabularyWords', JSON.stringify(sampleWords));
      } catch (storageError) {
        console.error('Failed to save vocabulary to localStorage:', storageError);
      }
    }
  }, []);

  useEffect(() => {
    if (words.length > 0 && !currentWord) {
      selectNextWord();
    }
  }, [words, selectedCategory, difficulty]);

  const saveWords = (updatedWords) => {
    setWords(updatedWords);
    try {
      localStorage.setItem('vocabularyWords', JSON.stringify(updatedWords));
    } catch (error) {
      console.error('Failed to save vocabulary to localStorage:', error);
      // Could show user notification here if needed
    }
  };

  const filteredWords = words.filter(word => {
    const matchesCategory = selectedCategory === 'all' || word.category === selectedCategory;
    const matchesDifficulty = difficulty === 'all' || word.difficulty === difficulty;
    const matchesSearch = word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         word.definition.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  const selectNextWord = () => {
    const availableWords = filteredWords.filter(word => {
      if (studyMode === 'review') {
        return word.learned && word.lastReviewed;
      }
      return !word.learned || word.correctCount < 3;
    });

    if (availableWords.length === 0) {
      setCurrentWord(null);
      return;
    }

    // Prioritize words that haven't been reviewed recently or have lower success rates
    const prioritizedWords = availableWords.sort((a, b) => {
      const aSuccessRate = a.totalAttempts > 0 ? a.correctCount / a.totalAttempts : 0;
      const bSuccessRate = b.totalAttempts > 0 ? b.correctCount / b.totalAttempts : 0;
      
      if (aSuccessRate !== bSuccessRate) {
        return aSuccessRate - bSuccessRate; // Lower success rate first
      }
      
      const aLastReviewed = a.lastReviewed ? new Date(a.lastReviewed).getTime() : 0;
      const bLastReviewed = b.lastReviewed ? new Date(b.lastReviewed).getTime() : 0;
      
      return aLastReviewed - bLastReviewed; // Older reviews first
    });

    setCurrentWord(prioritizedWords[0]);
    setShowDefinition(false);
    setQuizAnswer('');
    setQuizFeedback(null);
  };

  const handleCardFlip = () => {
    setShowDefinition(!showDefinition);
  };

  const handleKnowWord = (known) => {
    if (!currentWord) return;

    const updatedWords = words.map(word => {
      if (word.id === currentWord.id) {
        const newCorrectCount = known ? word.correctCount + 1 : word.correctCount;
        const newTotalAttempts = word.totalAttempts + 1;
        const newLearned = newCorrectCount >= 3;
        
        return {
          ...word,
          correctCount: newCorrectCount,
          totalAttempts: newTotalAttempts,
          learned: newLearned,
          lastReviewed: new Date()
        };
      }
      return word;
    });

    saveWords(updatedWords);
    
    // Update study stats
    setStudyStats(prev => ({
      correct: prev.correct + (known ? 1 : 0),
      total: prev.total + 1
    }));

    // Award XP
    addXP(known ? 10 : 5, 'vocabulary');
    
    if (known && currentWord.correctCount + 1 >= 3) {
      updateProgress('learnedWords', 1);
    }

    selectNextWord();
  };

  const handleQuizSubmit = () => {
    if (!currentWord || !quizAnswer.trim()) return;

    const isCorrect = quizAnswer.toLowerCase().trim() === currentWord.word.toLowerCase();
    
    setQuizFeedback({
      correct: isCorrect,
      message: isCorrect 
        ? 'Correct! Well done!' 
        : `Incorrect. The answer was "${currentWord.word}".`
    });

    setTimeout(() => {
      handleKnowWord(isCorrect);
    }, 2000);
  };

  const handleAddWord = () => {
    if (!newWord.word.trim() || !newWord.definition.trim()) return;

    const wordToAdd = {
      id: Date.now(),
      ...newWord,
      learned: false,
      lastReviewed: null,
      correctCount: 0,
      totalAttempts: 0,
      pronunciation: '',
      example: ''
    };

    const updatedWords = [...words, wordToAdd];
    saveWords(updatedWords);
    
    setNewWord({ word: '', definition: '', category: 'general', difficulty: 'beginner' });
    setShowAddWord(false);
    
    addXP(5, 'vocabulary');
  };

  const speakWord = (word) => {
    speakText(word, { lang: 'en-US', rate: 0.8 });
  };

  const categories = ['all', 'general', 'academic', 'professional', 'literature', 'advanced'];
  const difficulties = ['all', 'beginner', 'intermediate', 'advanced'];

  return (
    <div className="flex flex-col h-full bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Vocabulary Builder</h1>
          <p className="text-muted-foreground">Expand your vocabulary with spaced repetition</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Study Stats */}
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <div className="text-sm text-muted-foreground">Session Progress</div>
            <div className="text-lg font-semibold">
              {studyStats.correct}/{studyStats.total}
              {studyStats.total > 0 && (
                <span className="text-sm text-muted-foreground ml-2">
                  ({Math.round((studyStats.correct / studyStats.total) * 100)}%)
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={() => setShowAddWord(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Word</span>
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Study Mode */}
        <div>
          <label className="text-sm font-medium mb-2 block">Study Mode</label>
          <select
            value={studyMode}
            onChange={(e) => setStudyMode(e.target.value)}
            className="w-full p-2 rounded border border-input bg-background"
          >
            <option value="flashcards">Flashcards</option>
            <option value="quiz">Definition Quiz</option>
            <option value="review">Review Learned</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-2 rounded border border-input bg-background"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full p-2 rounded border border-input bg-background"
          >
            {difficulties.map(diff => (
              <option key={diff} value={diff}>
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="text-sm font-medium mb-2 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search words..."
              className="w-full pl-10 pr-4 py-2 rounded border border-input bg-background"
            />
          </div>
        </div>
      </div>

      {/* Main Study Area */}
      <div className="flex-1 flex items-center justify-center">
        {currentWord ? (
          <div className="w-full max-w-2xl">
            {studyMode === 'flashcards' && (
              <motion.div
                key={currentWord.id}
                initial={{ opacity: 0, rotateY: 180 }}
                animate={{ opacity: 1, rotateY: 0 }}
                className="relative"
              >
                {/* Flashcard */}
                <div
                  onClick={handleCardFlip}
                  className="bg-card border border-border rounded-2xl p-8 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 min-h-[300px] flex flex-col justify-center"
                  style={{ perspective: '1000px' }}
                >
                  <AnimatePresence mode="wait">
                    {!showDefinition ? (
                      <motion.div
                        key="front"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center"
                      >
                        <div className="flex items-center justify-center mb-4">
                          <h2 className="text-4xl font-bold">{currentWord.word}</h2>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              speakWord(currentWord.word);
                            }}
                            className="ml-4 p-2 rounded-full hover:bg-accent transition-colors"
                          >
                            <Volume2 className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {currentWord.pronunciation && (
                          <p className="text-lg text-muted-foreground mb-4">
                            {currentWord.pronunciation}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-center space-x-2 mb-4">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                            {currentWord.category}
                          </span>
                          <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm">
                            {currentWord.difficulty}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-center text-muted-foreground">
                          <Eye className="w-4 h-4 mr-2" />
                          <span>Click to reveal definition</span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="back"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center"
                      >
                        <h3 className="text-2xl font-semibold mb-4">{currentWord.word}</h3>
                        <p className="text-lg mb-6">{currentWord.definition}</p>
                        
                        {currentWord.example && (
                          <div className="bg-muted rounded-lg p-4 mb-6">
                            <p className="text-sm text-muted-foreground mb-1">Example:</p>
                            <p className="italic">"{currentWord.example}"</p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-center text-muted-foreground">
                          <EyeOff className="w-4 h-4 mr-2" />
                          <span>Click to hide definition</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Action Buttons */}
                {showDefinition && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center space-x-4 mt-6"
                  >
                    <button
                      onClick={() => handleKnowWord(false)}
                      className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>Don't Know</span>
                    </button>
                    
                    <button
                      onClick={() => handleKnowWord(true)}
                      className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>Know It</span>
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {studyMode === 'quiz' && (
              <motion.div
                key={currentWord.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-8 shadow-lg"
              >
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-4">What word matches this definition?</h3>
                  <div className="bg-muted rounded-lg p-6">
                    <p className="text-lg">{currentWord.definition}</p>
                    {currentWord.example && (
                      <p className="text-sm text-muted-foreground mt-4 italic">
                        Example: "{currentWord.example}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={quizAnswer}
                    onChange={(e) => setQuizAnswer(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleQuizSubmit()}
                    placeholder="Type the word..."
                    className="w-full p-4 text-center text-lg rounded-lg border border-input bg-background"
                    disabled={!!quizFeedback}
                  />
                  
                  {!quizFeedback && (
                    <button
                      onClick={handleQuizSubmit}
                      disabled={!quizAnswer.trim()}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Submit Answer
                    </button>
                  )}
                </div>

                {quizFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 p-4 rounded-lg text-center ${
                      quizFeedback.correct 
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-2">
                      {quizFeedback.correct ? (
                        <CheckCircle className="w-6 h-6 mr-2" />
                      ) : (
                        <XCircle className="w-6 h-6 mr-2" />
                      )}
                      <span className="font-semibold">{quizFeedback.message}</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No words to study</h3>
            <p className="text-muted-foreground mb-4">
              {filteredWords.length === 0 
                ? 'No words match your current filters.' 
                : 'You\'ve mastered all words in this category!'}
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setDifficulty('all');
                setSearchTerm('');
              }}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Add Word Modal */}
      <AnimatePresence>
        {showAddWord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAddWord(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold mb-4">Add New Word</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Word</label>
                  <input
                    type="text"
                    value={newWord.word}
                    onChange={(e) => setNewWord(prev => ({ ...prev, word: e.target.value }))}
                    className="w-full p-2 rounded border border-input bg-background"
                    placeholder="Enter the word"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Definition</label>
                  <textarea
                    value={newWord.definition}
                    onChange={(e) => setNewWord(prev => ({ ...prev, definition: e.target.value }))}
                    className="w-full p-2 rounded border border-input bg-background h-20 resize-none"
                    placeholder="Enter the definition"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Category</label>
                    <select
                      value={newWord.category}
                      onChange={(e) => setNewWord(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-2 rounded border border-input bg-background"
                    >
                      {categories.filter(cat => cat !== 'all').map(category => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Difficulty</label>
                    <select
                      value={newWord.difficulty}
                      onChange={(e) => setNewWord(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full p-2 rounded border border-input bg-background"
                    >
                      {difficulties.filter(diff => diff !== 'all').map(difficulty => (
                        <option key={difficulty} value={difficulty}>
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddWord(false)}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddWord}
                  disabled={!newWord.word.trim() || !newWord.definition.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Word
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Vocabulary;