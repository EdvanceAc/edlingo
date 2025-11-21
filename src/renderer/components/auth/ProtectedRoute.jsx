import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import supabaseService from '../../services/supabaseService';
import LoadingSpinner from '../ui/LoadingSpinner';

const ProtectedRoute = ({ children, allowWithoutAssessment = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [assessmentStatus, setAssessmentStatus] = useState({
    loading: true,
    completed: false
  });

  useEffect(() => {
    let isMounted = true;

    const checkAssessment = async () => {
      if (!user?.id) {
        if (isMounted) setAssessmentStatus({ loading: false, completed: false });
        return;
      }

      try {
        if (isMounted) setAssessmentStatus({ loading: true, completed: false });
        const result = await supabaseService.getUserProfile();
        if (!isMounted) return;

        if (!result.success) {
          setAssessmentStatus({ loading: false, completed: true });
          return;
        }

        // Consider completed if we have any reliable indicator from profile
        const completed = (result.data?.assessment_completed === true)
          || Boolean(result.data?.placement_level)
          || Boolean(result.data?.initial_assessment_date);
        setAssessmentStatus({ loading: false, completed });
      } catch (error) {
        console.warn('Assessment check failed, allowing access:', error);
        if (isMounted) setAssessmentStatus({ loading: false, completed: true });
      }
    };

    checkAssessment();

    return () => {
      isMounted = false;
    };
  }, [user?.id, allowWithoutAssessment]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // While checking, avoid mounting heavy children (especially on /assessment)
  if (assessmentStatus.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Checking assessment status...</p>
        </div>
      </div>
    );
  }

  // If user already completed assessment and is on /assessment (without explicit retake),
  // redirect away before mounting the assessment page.
  if (location.pathname === '/assessment') {
    const params = new URLSearchParams(location.search || '');
    const wantsRetake = params.get('retake') === '1' || params.get('retake') === 'true';
    if (assessmentStatus.completed && !wantsRetake) {
      return <Navigate to="/courses" replace />;
    }
  }

  // If route requires assessment completion, enforce redirect to /assessment
  if (!allowWithoutAssessment && !assessmentStatus.completed && location.pathname !== '/assessment') {
    return <Navigate to="/assessment" state={{ from: location, reason: 'assessment-required' }} replace />;
  }

  return children;
};

export default ProtectedRoute;
