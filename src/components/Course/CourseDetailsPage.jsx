import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Clock, 
  Users, 
  Star, 
  Calendar, 
  Globe, 
  DollarSign,
  User,
  Mail,
  ArrowLeft,
  Play,
  Lock,
  CheckCircle,
  Trophy,
  Zap,
  Target,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../renderer/components/ui/Card';
import { Badge } from '../../renderer/components/ui/Badge';
import Button from '../../renderer/components/ui/Button';
import { Progress } from '../../renderer/components/ui/Progress';
import { supabase } from '../../renderer/config/supabaseConfig';
import AuthContext from '../../renderer/contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';

const CourseDetailsPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
      fetchLessons();
    }
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) {
        console.error('Error fetching course details:', error);
        setError('Failed to load course details');
        return;
      }

      setCourse(data);
    } catch (err) {
      console.error('Exception fetching course details:', err);
      setError('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async () => {
    if (!courseId) return;
    
    setLoadingLessons(true);
    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Get user profile ID
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile) {
        console.error('User profile not found');
        return;
      }

      // Fetch terms for this course
      const { data: terms, error: termsError } = await supabase
        .from('terms')
        .select('*')
        .eq('course_id', courseId)
        .order('order_number', { ascending: true });

      if (termsError) {
        console.error('Error fetching terms:', termsError);
        return;
      }

      // Fetch lessons for each term with completion status
      const allLessons = [];
      for (const term of terms || []) {
        const { data: termLessons, error: lessonsError } = await supabase
          .from('lessons')
          .select(`
            *,
            user_lesson_progress!inner(
              completed_at,
              xp_earned,
              time_spent_minutes
            )
          `)
          .eq('term_id', term.id)
          .eq('user_lesson_progress.user_id', userProfile.id)
          .order('order_number', { ascending: true });

        // Also fetch lessons without progress to show locked/incomplete lessons
        const { data: allTermLessons, error: allLessonsError } = await supabase
          .from('lessons')
          .select('*')
          .eq('term_id', term.id)
          .order('order_number', { ascending: true });

        if (!allLessonsError && allTermLessons) {
          // Get completed lesson IDs
          const completedLessonIds = new Set(
            (termLessons || []).map(lesson => lesson.id)
          );

          allTermLessons.forEach((lesson, index) => {
            const completedLesson = termLessons?.find(cl => cl.id === lesson.id);
            const isCompleted = completedLessonIds.has(lesson.id);
            const globalOrder = allLessons.length + index + 1;
            
            // Simple logic: first lesson is unlocked, subsequent lessons unlock after previous is completed
            const isLocked = globalOrder > 1 && !allLessons[globalOrder - 2]?.isCompleted;

            allLessons.push({
              ...lesson,
              termName: term.name,
              globalOrder,
              isCompleted,
              isLocked,
              xpReward: completedLesson?.user_lesson_progress?.[0]?.xp_earned || 75,
              estimatedTime: completedLesson?.user_lesson_progress?.[0]?.time_spent_minutes 
                ? `${completedLesson.user_lesson_progress[0].time_spent_minutes} min`
                : `${8 + Math.floor(Math.random() * 12)} min`
            });
          });
        }
      }

      setLessons(allLessons);
    } catch (err) {
      console.error('Exception fetching lessons:', err);
    } finally {
      setLoadingLessons(false);
    }
  };

  const formatDuration = (weeks, hoursPerWeek) => {
    if (weeks && hoursPerWeek) {
      return `${weeks} weeks • ${hoursPerWeek} hours/week`;
    }
    if (weeks) {
      return `${weeks} weeks`;
    }
    return 'Duration not specified';
  };

  const formatPrice = (price, currency) => {
    if (price === 0 || price === null) {
      return 'Free';
    }
    return `${currency || 'USD'} ${price}`;
  };

  const completeLesson = async (lessonId, xpEarned = 75, timeSpent = 10) => {
    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile) return;

      // Insert or update lesson progress
      const { error } = await supabase
        .from('user_lesson_progress')
        .upsert({
          user_id: userProfile.id,
          lesson_id: lessonId,
          xp_earned: xpEarned,
          time_spent_minutes: timeSpent,
          score: 85.0,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,lesson_id'
        });

      if (error) {
        console.error('Error completing lesson:', error);
        return;
      }

      // Refresh lessons to show updated progress
      await fetchLessons();
    } catch (err) {
      console.error('Exception completing lesson:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading course details...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-destructive text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Course Not Found</h2>
          <p className="text-muted-foreground mb-6">{error || 'The requested course could not be found.'}</p>
          <Button onClick={() => navigate('/courses')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-card shadow-lg border-b"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/courses')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          </div>

          {/* Course Header */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Course Info */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                    {course.language || 'Language'}
                  </Badge>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    {course.cefr_level || course.level || 'A1'}
                  </Badge>
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                    {course.category || 'General'}
                  </Badge>
                </div>
                
                <h1 className="text-4xl font-bold text-foreground mb-4">
                  {course.title || course.name || 'Untitled Course'}
                </h1>
                
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  {course.description || 'No description available for this course.'}
                </p>

                {/* Course Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">{formatDuration(course.duration_weeks, course.hours_per_week)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-5 h-5 text-green-500" />
                    <span className="text-sm">Max {course.max_students || 20} students</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm">{formatPrice(course.price, course.currency)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    <span className="text-sm">
                      {course.start_date ? new Date(course.start_date).toLocaleDateString() : 'Flexible start'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Course Actions & Info */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="bg-card border">
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="text-3xl font-bold text-primary mb-2">
                        {formatPrice(course.price, course.currency)}
                      </div>
                      {course.enrollment_deadline && (
                        <p className="text-sm text-muted-foreground">
                          Enrollment ends: {new Date(course.enrollment_deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <Button className="w-full mb-4">
                      {course.price > 0 ? 'Enroll Now' : 'Start Learning'}
                    </Button>
                    
                    <div className="space-y-3 text-sm">
                      {course.instructor_name && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{course.instructor_name}</span>
                        </div>
                      )}
                      {course.instructor_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-primary">{course.instructor_email}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Course Details Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    Course Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed">
                    {course.long_description || course.description || 'Embark on your language learning journey with structured lessons designed to build your skills progressively.'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Learning Path Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-500" />
                    Learning Path
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingLessons ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-2 text-muted-foreground">Loading lessons...</span>
                    </div>
                  ) : lessons.length > 0 ? (
                    <div className="space-y-6">
                      {/* Progress Overview */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-foreground">Overall Progress</h4>
                          <Badge variant="outline" className="bg-white/50">
                            {Math.floor((lessons.filter(l => l.isCompleted).length / lessons.length) * 100)}% Complete
                          </Badge>
                        </div>
                        <Progress 
                          value={(lessons.filter(l => l.isCompleted).length / lessons.length) * 100} 
                          className="h-3"
                        />
                        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                          <span>{lessons.filter(l => l.isCompleted).length} of {lessons.length} lessons completed</span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            {lessons.filter(l => l.isCompleted).reduce((sum, l) => sum + l.xpReward, 0)} XP earned
                          </span>
                        </div>
                      </div>

                      {/* Interactive Timeline */}
                      <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200 dark:from-blue-800 dark:via-purple-800 dark:to-green-800"></div>
                        
                        {/* Lessons */}
                        <div className="space-y-4">
                          {lessons.map((lesson, index) => {
                            const isCompleted = lesson.isCompleted;
                            const isLocked = lesson.isLocked && !isCompleted;
                            const isCurrent = !isCompleted && !isLocked;
                            
                            return (
                              <motion.div
                                key={lesson.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative flex items-start gap-4"
                              >
                                {/* Timeline Node */}
                                <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 transition-all duration-300 ${
                                  isCompleted 
                                    ? 'bg-green-500 border-green-300 shadow-lg shadow-green-200' 
                                    : isCurrent 
                                    ? 'bg-blue-500 border-blue-300 shadow-lg shadow-blue-200 animate-pulse' 
                                    : 'bg-gray-200 border-gray-300 dark:bg-gray-700 dark:border-gray-600'
                                }`}>
                                  {isCompleted ? (
                                    <CheckCircle className="w-8 h-8 text-white" />
                                  ) : isCurrent ? (
                                    <Play className="w-8 h-8 text-white" />
                                  ) : (
                                    <Lock className="w-6 h-6 text-gray-500" />
                                  )}
                                </div>

                                {/* Lesson Card */}
                                <motion.div
                                  whileHover={!isLocked ? { scale: 1.02, y: -2 } : {}}
                                  className={`flex-1 transition-all duration-200 ${
                                    isLocked ? 'opacity-60' : 'cursor-pointer'
                                  }`}
                                >
                                  <Card className={`border-2 transition-all duration-200 ${
                                    isCompleted 
                                      ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' 
                                      : isCurrent 
                                      ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20 hover:border-blue-300' 
                                      : 'border-gray-200 dark:border-gray-700'
                                  }`}>
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="text-xs">
                                              {lesson.termName}
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs">
                                              Lesson {lesson.globalOrder}
                                            </Badge>
                                          </div>
                                          
                                          <h4 className={`font-semibold mb-1 ${
                                            isLocked ? 'text-muted-foreground' : 'text-foreground'
                                          }`}>
                                            {lesson.name || `Lesson ${lesson.globalOrder}`}
                                          </h4>
                                          
                                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                              <Clock className="w-4 h-4" />
                                              {lesson.estimatedTime}
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Zap className="w-4 h-4 text-yellow-500" />
                                              {lesson.xpReward} XP
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Target className="w-4 h-4 text-blue-500" />
                                              {lesson.level}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          {isCompleted && (
                                            <motion.div
                                              initial={{ scale: 0 }}
                                              animate={{ scale: 1 }}
                                              transition={{ type: "spring", delay: 0.2 }}
                                            >
                                              <Trophy className="w-5 h-5 text-yellow-500" />
                                            </motion.div>
                                          )}
                                          
                                          {!isLocked && (
                                            <Button 
                                              size="sm" 
                                              variant={isCurrent ? "default" : "outline"}
                                              className="flex items-center gap-1"
                                              onClick={() => completeLesson(lesson.id, lesson.xpReward, Math.floor(Math.random() * 15) + 5)}
                                            >
                                              {isCompleted ? 'Review' : 'Start'}
                                              <ChevronRight className="w-4 h-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                      <h4 className="text-md font-medium text-foreground mb-2">No Lessons Available</h4>
                      <p className="text-muted-foreground text-sm">
                        This course doesn't have any lessons yet. Check back later or contact your instructor.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">

            {/* Skills Focus */}
            {course.skills_focus && course.skills_focus.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      Skills Focus
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {course.skills_focus.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Required Materials */}
            {course.required_materials && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-500" />
                      Required Materials
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground text-sm leading-relaxed">{course.required_materials}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Instructor Bio */}
            {course.instructor_bio && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-purple-500" />
                      About the Instructor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground text-sm leading-relaxed">{course.instructor_bio}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailsPage;