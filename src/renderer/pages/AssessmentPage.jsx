import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Assessment from '../components/Assessment';
import { useAuth } from '../contexts/AuthContext';
import supabaseService from '../services/supabaseService';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { CheckCircle, ArrowLeft } from 'lucide-react';

const AssessmentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchUserProfile = async () => {
      // Guard: if Supabase is not connected (e.g., missing anon key), avoid making network calls
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
      } catch (statusErr) {
        // In case of unexpected error when checking status, still proceed with fallback
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

      try {
        console.log('Fetching profile for user:', user.id, 'Email:', user.email);
        const { data, error } = await supabaseService.client
          .from('user_profiles')
          .select('id,email,full_name,preferred_language,target_language,native_language,learning_level,assessment_completed,created_at,updated_at,initial_assessment_date,placement_level')
          .eq('id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // User profile doesn't exist, try to create one using the helper function
            console.log('User profile not found, creating new profile for user:', user.id, 'Email:', user.email);
            
            try {
              // Try using the helper function first
              const { data: functionResult, error: functionError } = await supabaseService.client
                .rpc('create_missing_user_profile', {
                  user_id: user.id,
                  user_email: user.email,
                  user_name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
                });
              
              if (functionError) {
                console.log('Helper function error:', functionError.message, 'Trying direct insert with proper auth context');
                
                // Fallback: Create profile with proper auth context
                const newProfile = {
                  id: user.id,
                  email: user.email,
                  full_name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                  preferred_language: 'en',
                  target_languages: '{}',
                  target_language: 'English',
                  native_language: 'Unknown',
                  learning_level: 'beginner',
                  assessment_completed: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                
                console.log('Creating profile with data:', newProfile);
                
                // Use upsert instead of insert to handle conflicts
                const { data: createdProfile, error: createError } = await supabaseService.client
                  .from('user_profiles')
                  .upsert([newProfile], { onConflict: 'id' })
                  .select('id,email,full_name,preferred_language,target_language,native_language,learning_level,assessment_completed,created_at,updated_at,initial_assessment_date,placement_level')
                  .single();
                  
                if (createError) {
                  console.error('Error creating user profile:', createError);
                  // Create a minimal profile for the session
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
                  console.log('Using fallback profile for session');
                } else {
                  setUserProfile(createdProfile);
                }
              } else {
                // Function succeeded, now fetch the created profile
                const { data: fetchedProfile, error: fetchError } = await supabaseService.client
                  .from('user_profiles')
                  .select('id,email,full_name,preferred_language,target_language,native_language,learning_level,assessment_completed,created_at,updated_at,initial_assessment_date,placement_level')
                  .eq('id', user.id)
                  .single();
                  
                if (fetchError) {
                  console.error('Error fetching created profile:', fetchError);
                  setError('Profile created but failed to load');
                } else {
                  setUserProfile(fetchedProfile);
                }
              }
            } catch (err) {
              console.error('Error in profile creation process:', err);
              // Create a minimal profile for the session
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
              console.log('Using fallback profile due to creation error');
            }
          } else {
            console.error('Error fetching user profile:', error);
            setError('Failed to load user profile');
          }
        } else {
          setUserProfile(data);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [user, navigate]);

  const handleAssessmentComplete = async (results) => {
    try {
      // Update user profile with assessment results
      const { error } = await supabaseService.client
        .from('user_profiles')
        .update({
          assessment_completed: true,
          initial_assessment_date: new Date().toISOString(),
          placement_level: results.cefrLevel,
          learning_level: results.cefrLevel
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating user profile:', error);
      }

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="mb-6 flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Card className="p-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Assessment Already Completed
              </h1>
              
              <div className="space-y-4 mb-6">
                <p className="text-gray-600 dark:text-gray-300">
                  You completed your initial language proficiency assessment on{' '}
                  {new Date(userProfile.initial_assessment_date).toLocaleDateString()}.
                </p>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                        Current Level
                      </div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {userProfile.placement_level || userProfile.learning_level}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full"
                >
                  Continue Learning
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleRetakeAssessment}
                  className="w-full"
                >
                  Retake Assessment
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
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
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 bg-white shadow-sm"
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