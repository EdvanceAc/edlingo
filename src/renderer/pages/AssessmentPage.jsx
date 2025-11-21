import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Assessment from '../components/Assessment';
import { useAuth } from '../contexts/AuthContext';
import supabaseService from '../services/supabaseService';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { CheckCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { useTheme } from '../providers/ThemeProvider';
import { useProgress } from '../providers/ProgressProvider';

const AssessmentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme } = useTheme();
  const { updateProgress } = useProgress();

  // Determine if user explicitly wants to retake via query param
  const searchParams = new URLSearchParams(location.search);
  const isRetake = (searchParams.get('retake') === '1') || (searchParams.get('retake') === 'true');
  const [didRedirect, setDidRedirect] = useState(false);
  const fetchedUserIdRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Prevent repeated fetches if user object reference changes but id is the same
    if (fetchedUserIdRef.current === user.id) {
      return;
    }
    fetchedUserIdRef.current = user.id;

    const fetchUserProfile = async () => {
      // If DB not connected, use local fallback profile
      try {
        if (!supabaseService.getConnectionStatus || !supabaseService.getConnectionStatus()) {
          const fallbackProfile = {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            target_language: 'English',
            native_language: 'Unknown',
            learning_level: 'beginner',
            assessment_completed: false
          };
          setUserProfile(fallbackProfile);
          setIsLoading(false);
          return;
        }
      } catch (_) {
        // ignore, continue with best effort
      }

      try {
        const res = await supabaseService.getUserProfile();
        if (res.success && res.data) {
          setUserProfile(res.data);
          setIsLoading(false);
          return;
        }
        // Ensure a profile row exists, then try once more
        await supabaseService.updateUserProfile({}); // upsert minimal row
        const retry = await supabaseService.getUserProfile();
        if (retry.success) {
          setUserProfile(retry.data || null);
        }
      } catch (err) {
        console.error('Profile load error:', err);
        setError('Failed to load user profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [user?.id, navigate]);

  // If user already assessed and not explicitly retaking, redirect once to courses
  useEffect(() => {
    if (isLoading || didRedirect || isRetake) return;
    const alreadyAssessed = Boolean(userProfile?.assessment_completed)
      || Boolean(userProfile?.placement_level)
      || Boolean(userProfile?.initial_assessment_date);
    if (alreadyAssessed) {
      setDidRedirect(true);
      navigate('/courses', { replace: true });
    }
  }, [isLoading, didRedirect, isRetake, userProfile?.assessment_completed, userProfile?.placement_level, userProfile?.initial_assessment_date, navigate]);

  const handleAssessmentComplete = async (results) => {
    try {
      const record = await supabaseService.recordAssessmentPlacement({
        cefrLevel: results.cefrLevel,
        overallScore: results.overallScore,
        sessionId: results.sessionId,
        skillBreakdown: results.skillBreakdown,
        targetLanguage: userProfile?.target_language
      });
      if (!record.success) {
        console.warn('Failed to record assessment placement:', record.error);
      }

      // Update in-memory progress so other features can consume immediately
      updateProgress({
        cefrLevel: results.cefrLevel
      });

      // Navigate to dashboard
      navigate('/dashboard', { 
        state: { 
          assessmentResults: results,
          showWelcome: true 
        } 
      });
    } catch (err) {
      console.error('Error completing assessment:', err);
      // Still navigate to dashboard even if update fails
      navigate('/dashboard');
    }
  };

  const handleRetakeAssessment = () => {
    setUserProfile(prev => ({
      ...prev,
      assessment_completed: false
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="w-full">
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // If user has already completed assessment, show completion status
  if (userProfile?.assessment_completed) {
    return (
      <div className={`min-h-screen py-8 px-4 relative ${theme === 'dark' ? 'dark' : ''}`}> 
        <div className="pointer-events-none absolute inset-0 opacity-70 bg-gradient-to-br from-indigo-100 via-fuchsia-100 to-emerald-100 dark:from-slate-900/40 dark:via-indigo-900/30 dark:to-transparent" />
        <div className="max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="mb-6 flex items-center space-x-2 rounded-xl bg-white dark:bg-white/10 backdrop-blur-xl ring-1 ring-indigo-200 dark:ring-white/25 hover:bg-indigo-50 dark:hover:bg-white/15 transition-colors shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Card className="card card-premium relative overflow-hidden p-8 rounded-2xl bg-white dark:bg-white/10 backdrop-blur-xl ring-1 ring-indigo-200 dark:ring-white/25 shadow-2xl">
              <div className="pointer-events-none absolute inset-0 opacity-20 bg-gradient-to-br from-indigo-300/20 via-fuchsia-300/16 to-emerald-300/20 dark:from-white/5 dark:via-white/10 dark:to-transparent" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/30 to-emerald-500/30 ring-1 ring-indigo-200 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              
              <h1 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-800 to-fuchsia-800 dark:from-indigo-300 dark:to-fuchsia-300">
                Assessment Already Completed
              </h1>
              
              <div className="space-y-4 mb-6">
                <p className="text-gray-700 dark:text-gray-300">
                  You completed your initial language proficiency assessment on{' '}
                  {new Date(userProfile.initial_assessment_date).toLocaleDateString()}.
                </p>
                
                <div className="rounded-xl p-4 bg-gradient-to-r from-indigo-500/30 via-cyan-500/30 to-fuchsia-500/30 backdrop-blur-md ring-1 ring-indigo-200 dark:bg-white/10 dark:ring-white/25 shadow-md">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                        Current Level
                      </div>
                      <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-fuchsia-700 to-emerald-700 dark:from-indigo-300 dark:via-fuchsia-300 dark:to-emerald-300">
                        {userProfile.placement_level || userProfile.learning_level}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/courses')}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white hover:from-indigo-700 hover:to-fuchsia-700 shadow-xl"
                >
                  Continue Learning
                </Button>
                
                <Button 
                  onClick={handleRetakeAssessment}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 text-white hover:from-amber-700 hover:to-rose-700 shadow-xl font-semibold"
                >
                  <span className="inline-flex items-center justify-center space-x-2">
                    <RotateCcw className="w-4 h-4" />
                    <span>Retake Assessment</span>
                  </span>
                </Button>
              </div>
              
              <p className="text-xs text-gray-800 dark:text-gray-200 mt-4">
                Note: Retaking the assessment will update your current proficiency level
                and may affect your learning path.
              </p>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Show the assessment component
  return (
    <div className="relative">
      {/* Header with navigation */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 rounded-xl bg-white dark:bg-white/10 backdrop-blur-sm ring-1 ring-indigo-200 dark:ring-white/25 hover:bg-indigo-50 dark:hover:bg-white/15 shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Button>
      </div>
      
      <Assessment 
        onComplete={handleAssessmentComplete}
        targetLanguage={userProfile?.target_language || 'English'}
      />
    </div>
  );
};

export default AssessmentPage;