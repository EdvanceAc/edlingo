import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Play, Pause, RotateCcw, CheckCircle, XCircle, Target, Award } from 'lucide-react';
import { useAudio } from '../providers/AudioProvider';
import { useProgress } from '../providers/ProgressProvider';

const Pronunciation = () => {
  const [currentWord, setCurrentWord] = useState(null);
  const [userRecording, setUserRecording] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('common');
  const [difficulty, setDifficulty] = useState('beginner');
  const [audioWaveform, setAudioWaveform] = useState([]);
  const { isRecording, startRecording, stopRecording, speakText } = useAudio();
  const { addXP, updateProgress } = useProgress();
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Sample pronunciation exercises
  const pronunciationWords = {
    common: {
      beginner: [
        { word: 'hello', phonetic: '/həˈloʊ/', difficulty: 1 },
        { word: 'water', phonetic: '/ˈwɔːtər/', difficulty: 2 },
        { word: 'beautiful', phonetic: '/ˈbjuːtɪfəl/', difficulty: 3 },
        { word: 'computer', phonetic: '/kəmˈpjuːtər/', difficulty: 2 },
        { word: 'important', phonetic: '/ɪmˈpɔːrtənt/', difficulty: 3 }
      ],
      intermediate: [
        { word: 'pronunciation', phonetic: '/prəˌnʌnsiˈeɪʃən/', difficulty: 4 },
        { word: 'comfortable', phonetic: '/ˈkʌmftərbəl/', difficulty: 4 },
        { word: 'development', phonetic: '/dɪˈveləpmənt/', difficulty: 3 },
        { word: 'responsibility', phonetic: '/rɪˌspɑːnsəˈbɪləti/', difficulty: 5 },
        { word: 'communication', phonetic: '/kəˌmjuːnɪˈkeɪʃən/', difficulty: 4 }
      ],
      advanced: [
        { word: 'entrepreneurship', phonetic: '/ˌɑːntrəprəˈnɜːrʃɪp/', difficulty: 5 },
        { word: 'pharmaceutical', phonetic: '/ˌfɑːrməˈsuːtɪkəl/', difficulty: 5 },
        { word: 'conscientious', phonetic: '/ˌkɑːnʃiˈenʃəs/', difficulty: 4 },
        { word: 'deteriorate', phonetic: '/dɪˈtɪriəreɪt/', difficulty: 4 },
        { word: 'incomprehensible', phonetic: '/ɪnˌkɑːmprɪˈhensəbəl/', difficulty: 5 }
      ]
    },
    sounds: {
      beginner: [
        { word: 'think', phonetic: '/θɪŋk/', difficulty: 2, focus: 'th sound' },
        { word: 'ship', phonetic: '/ʃɪp/', difficulty: 2, focus: 'sh sound' },
        { word: 'red', phonetic: '/red/', difficulty: 1, focus: 'r sound' },
        { word: 'light', phonetic: '/laɪt/', difficulty: 2, focus: 'l sound' },
        { word: 'very', phonetic: '/ˈveri/', difficulty: 2, focus: 'v sound' }
      ],
      intermediate: [
        { word: 'through', phonetic: '/θru/', difficulty: 3, focus: 'th + r sounds' },
        { word: 'measure', phonetic: '/ˈmeʒər/', difficulty: 3, focus: 'zh sound' },
        { word: 'rural', phonetic: '/ˈrʊrəl/', difficulty: 4, focus: 'multiple r sounds' },
        { word: 'clothes', phonetic: '/kloʊðz/', difficulty: 3, focus: 'th + z sounds' },
        { word: 'sixth', phonetic: '/sɪksθ/', difficulty: 4, focus: 'ks + th sounds' }
      ],
      advanced: [
        { word: 'thoroughly', phonetic: '/ˈθɜːroʊli/', difficulty: 4, focus: 'th + r combination' },
        { word: 'strength', phonetic: '/streŋθ/', difficulty: 5, focus: 'str + ng + th' },
        { word: 'squirrel', phonetic: '/ˈskwɜːrəl/', difficulty: 4, focus: 'skw + r sounds' },
        { word: 'brewery', phonetic: '/ˈbruːəri/', difficulty: 3, focus: 'br + oo sounds' },
        { word: 'rhythm', phonetic: '/ˈrɪðəm/', difficulty: 4, focus: 'r + th sounds' }
      ]
    }
  };

  useEffect(() => {
    selectRandomWord();
  }, [selectedCategory, difficulty]);

  useEffect(() => {
    if (isRecording) {
      startWaveformAnimation();
    } else {
      stopWaveformAnimation();
    }
    return () => stopWaveformAnimation();
  }, [isRecording]);

  const selectRandomWord = () => {
    const words = pronunciationWords[selectedCategory][difficulty];
    const randomWord = words[Math.floor(Math.random() * words.length)];
    setCurrentWord(randomWord);
    setFeedback(null);
    setScore(null);
    setAttempts(0);
    setUserRecording(null);
  };

  const startWaveformAnimation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Generate random waveform data
      const bars = 50;
      const barWidth = width / bars;
      
      for (let i = 0; i < bars; i++) {
        const barHeight = Math.random() * height * 0.8 + 10;
        const x = i * barWidth;
        const y = (height - barHeight) / 2;
        
        ctx.fillStyle = `hsl(${200 + Math.random() * 60}, 70%, ${50 + Math.random() * 30}%)`;
        ctx.fillRect(x, y, barWidth - 2, barHeight);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  };

  const stopWaveformAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
      setUserRecording(null);
      setFeedback(null);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      const recording = await stopRecording();
      setUserRecording(recording);
      setAttempts(prev => prev + 1);
      
      // Simulate pronunciation analysis
      setTimeout(() => {
        analyzePronunciation();
      }, 1000);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const analyzePronunciation = () => {
    // Simulate pronunciation analysis with random but weighted results
    const baseScore = Math.random() * 40 + 40; // 40-80 base score
    const difficultyPenalty = currentWord.difficulty * 5;
    const attemptBonus = Math.max(0, (3 - attempts) * 5);
    
    const finalScore = Math.min(100, Math.max(0, baseScore - difficultyPenalty + attemptBonus + Math.random() * 20));
    
    setScore(Math.round(finalScore));
    
    let feedbackText = '';
    let feedbackType = 'good';
    
    if (finalScore >= 85) {
      feedbackText = 'Excellent pronunciation! You nailed it!';
      feedbackType = 'excellent';
      addXP(25, 'pronunciation');
    } else if (finalScore >= 70) {
      feedbackText = 'Good job! Your pronunciation is quite clear.';
      feedbackType = 'good';
      addXP(15, 'pronunciation');
    } else if (finalScore >= 50) {
      feedbackText = 'Not bad, but there\'s room for improvement. Try focusing on the stressed syllables.';
      feedbackType = 'okay';
      addXP(10, 'pronunciation');
    } else {
      feedbackText = 'Keep practicing! Listen to the example again and try to match the rhythm.';
      feedbackType = 'needs-work';
      addXP(5, 'pronunciation');
    }
    
    setFeedback({ text: feedbackText, type: feedbackType });
    
    // Update pronunciation progress
    updateProgress('pronunciationAccuracy', finalScore);
  };

  const playExample = () => {
    if (currentWord) {
      speakText(currentWord.word, { lang: 'en-US', rate: 0.8 });
    }
  };

  const playUserRecording = () => {
    if (userRecording) {
      // In a real app, you would play the actual recording
      console.log('Playing user recording...');
    }
  };

  const getFeedbackColor = (type) => {
    switch (type) {
      case 'excellent': return 'text-green-600 dark:text-green-400';
      case 'good': return 'text-blue-600 dark:text-blue-400';
      case 'okay': return 'text-yellow-600 dark:text-yellow-400';
      case 'needs-work': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="flex flex-col h-full bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Pronunciation Practice</h1>
        <p className="text-muted-foreground">Improve your pronunciation with AI-powered feedback</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-3 rounded-lg border border-input bg-background"
          >
            <option value="common">Common Words</option>
            <option value="sounds">Difficult Sounds</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Difficulty</label>
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
      </div>

      {/* Main Practice Area */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        {currentWord && (
          <motion.div
            key={currentWord.word}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            {/* Word Display */}
            <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
              <h2 className="text-4xl font-bold mb-2">{currentWord.word}</h2>
              <p className="text-xl text-muted-foreground mb-4">{currentWord.phonetic}</p>
              {currentWord.focus && (
                <p className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full inline-block">
                  Focus: {currentWord.focus}
                </p>
              )}
              
              {/* Difficulty Indicator */}
              <div className="flex items-center justify-center mt-4 space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < currentWord.difficulty 
                        ? 'bg-yellow-400' 
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  Difficulty: {currentWord.difficulty}/5
                </span>
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={playExample}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Volume2 className="w-5 h-5" />
                <span>Listen</span>
              </button>
              
              {userRecording && (
                <button
                  onClick={playUserRecording}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  <span>Your Recording</span>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Recording Area */}
        <div className="w-full max-w-md">
          {/* Waveform Visualization */}
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <canvas
              ref={canvasRef}
              width={400}
              height={100}
              className="w-full h-20 rounded"
            />
            {!isRecording && (
              <div className="flex items-center justify-center h-20 text-muted-foreground">
                <Mic className="w-8 h-8" />
                <span className="ml-2">Ready to record</span>
              </div>
            )}
          </div>

          {/* Recording Button */}
          <div className="flex justify-center">
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse scale-110'
                  : 'bg-primary text-primary-foreground hover:scale-105'
              }`}
            >
              {isRecording ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
          </div>
          
          <p className="text-center text-sm text-muted-foreground mt-2">
            {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
          </p>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <div className="bg-card border border-border rounded-lg p-6 text-center">
                {score !== null && (
                  <div className="mb-4">
                    <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
                      {score}%
                    </div>
                    <div className="flex items-center justify-center mt-2">
                      {score >= 85 ? (
                        <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                      ) : score >= 50 ? (
                        <Target className="w-6 h-6 text-yellow-500 mr-2" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-500 mr-2" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        Attempt {attempts}
                      </span>
                    </div>
                  </div>
                )}
                
                <p className={`text-sm ${getFeedbackColor(feedback.type)}`}>
                  {feedback.text}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={selectRandomWord}
            className="flex items-center space-x-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            <span>New Word</span>
          </button>
          
          {score && score >= 85 && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={selectRandomWord}
              className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Award className="w-5 h-5" />
              <span>Next Challenge</span>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pronunciation;