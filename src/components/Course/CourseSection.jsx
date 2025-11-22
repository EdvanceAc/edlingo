import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Play, 
  Lock, 
  CheckCircle, 
  Star, 
  Trophy, 
  Target,
  ArrowRight,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../renderer/components/ui/Card';
import { Progress } from '../../renderer/components/ui/Progress';
import { Badge } from '../../renderer/components/ui/Badge';
import Button from '../../renderer/components/ui/Button';
import { supabase } from '../../renderer/config/supabaseConfig';
import CourseProgressCard from '../../renderer/components/Course/CourseProgressCard';
import { useProgress } from '../../renderer/providers/ProgressProvider';

const CourseSection = () => {
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userProgress, getProgressStats } = useProgress();
  
  // Get dynamic data from ProgressProvider
  const stats = getProgressStats();
  const currentStreak = stats.streak || 0;
  const totalXP = stats.xp || 0;
  const nextLevelXP = Math.pow(stats.level, 2) * 100; // Calculate next level XP

  useEffect(() => {
    loadCourses();
  }, [userProgress]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      
      // Fetch courses from Supabase
      const { data: supabaseCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id,title,description,is_active,duration_weeks,price,category,level,created_at')
        .order('created_at', { ascending: true });

      if (coursesError) {
        console.warn('Supabase courses not available, using mock data:', coursesError.message);
        setUnits(getMockCourses());
        return;
      }

      // Fetch user enrollments to get progress data
      let userEnrollments = [];
      if (userProgress) {
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('user_course_enrollments')
          .select('course_id,progress_percentage,status,completed_at');
        
        if (!enrollmentError && enrollments) {
          userEnrollments = enrollments;
        } else if (enrollmentError) {
          console.warn('Could not fetch user enrollments:', enrollmentError.message);
        }
      }

      // Transform and merge Supabase data with user progress
      const transformedCourses = supabaseCourses.map(course => {
        const enrollment = userEnrollments.find(e => e.course_id === course.id);
        
        // Map course category/title to icon
        const getIconForCourse = (title, category) => {
          const titleLower = (title || '').toLowerCase();
          const categoryLower = (category || '').toLowerCase();
          
          if (titleLower.includes('greet')) return '👋';
          if (titleLower.includes('family') || titleLower.includes('friend')) return '👨‍👩‍👧‍👦';
          if (titleLower.includes('food') || titleLower.includes('dining') || titleLower.includes('restaurant')) return '🍽️';
          if (titleLower.includes('travel') || titleLower.includes('transport')) return '✈️';
          if (titleLower.includes('work') || titleLower.includes('business')) return '💼';
          if (titleLower.includes('home') || titleLower.includes('house')) return '🏠';
          if (categoryLower.includes('conversation')) return '💬';
          if (categoryLower.includes('grammar')) return '📝';
          if (categoryLower.includes('vocabulary')) return '📚';
          return '📚'; // Default icon
        };
        
        return {
          id: course.id,
          title: course.title,
          description: course.description,
          icon: getIconForCourse(course.title, course.category),
          progress: enrollment ? Math.round(enrollment.progress_percentage || 0) : 0,
          isUnlocked: course.is_active !== false,
          isCompleted: enrollment?.status === 'completed' || enrollment?.completed_at != null,
          lessons: course.duration_weeks || 4,
          xp: Math.round(course.price || 100)
        };
      });
      
      setUnits(transformedCourses.length > 0 ? transformedCourses : getMockCourses());
    } catch (error) {
      console.error('Error loading courses:', error);
      setUnits(getMockCourses());
    } finally {
      setLoading(false);
    }
  };

  // Derived progress values for premium progress card
  const overallPct = Math.min(100, Math.max(0, Math.round((totalXP / nextLevelXP) * 100) || 0));
  const remainingXP = Math.max(0, nextLevelXP - totalXP);

  const getMockCourses = () => [
    {
      id: 1,
      title: "Basic Greetings",
      icon: "👋",
      progress: 100,
      isUnlocked: true,
      isCompleted: true,
      lessons: 5,
      xp: 150
    },
    {
      id: 2,
      title: "Family & Friends",
      icon: "👨‍👩‍👧‍👦",
      progress: 60,
      isUnlocked: true,
      isCompleted: false,
      lessons: 8,
      xp: 120
    },
    {
      id: 3,
      title: "Food & Dining",
      icon: "🍽️",
      progress: 0,
      isUnlocked: true,
      isCompleted: false,
      lessons: 6,
      xp: 0
    },
    {
      id: 4,
      title: "Travel & Transport",
      icon: "✈️",
      progress: 0,
      isUnlocked: false,
      isCompleted: false,
      lessons: 7,
      xp: 0
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  const UnitCard = ({ unit, index }) => {
    const isLocked = !unit.isUnlocked;
    
    return (
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: isLocked ? 1 : 1.02 }}
        whileTap={{ scale: isLocked ? 1 : 0.98 }}
        className={`relative ${
          isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <Card className={`card card-premium card-hover relative overflow-hidden h-full transition-all duration-300 rounded-xl ${
          isLocked 
            ? 'bg-muted/50 border-border opacity-60' 
            : 'border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent hover:border-primary/30 hover:shadow-soft ring-1 ring-primary/20 backdrop-blur-sm'
        }`} onClick={() => { if (!isLocked) navigate(`/courses/${unit.id}`); }}>
          {!isLocked && (
            <div className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 rounded-full bg-primary/20 blur-2xl" />
          )}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                  isLocked ? 'bg-muted' : 'bg-white/20 backdrop-blur-sm ring-1 ring-primary/30 shadow-soft'
                }`}>
                  {isLocked ? <Lock className="w-6 h-6 text-muted-foreground" /> : unit.icon}
                </div>
                <div>
                  <CardTitle className={`text-xl font-semibold tracking-tight ${
                    isLocked ? 'text-muted-foreground' : 'text-foreground'
                  }`}>
                    {unit.title}
                  </CardTitle>
                  <p className={`text-sm ${
                    isLocked ? 'text-muted-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {unit.lessons} lessons
                  </p>
                </div>
              </div>
              
              {unit.isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                >
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </motion.div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={isLocked ? 'text-muted-foreground/70' : 'text-muted-foreground'}>
                    Progress
                  </span>
                  <span className={`font-semibold ${
                    isLocked ? 'text-muted-foreground/70' : 'text-primary'
                  }`}>
                    {unit.progress}%
                  </span>
                </div>
                <div className={`progress-modern ${isLocked ? 'opacity-50' : ''}`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${unit.progress}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + index * 0.05 }}
                    className="progress-modern-bar"
                  />
                </div>
              </div>
              
              {/* XP and Action */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className={`w-4 h-4 ${
                    isLocked ? 'text-muted-foreground' : 'text-yellow-500'
                  }`} />
                  <span className={`text-xs ${isLocked ? 'text-muted-foreground/70' : 'text-foreground'}`}>XP</span>
                  <span className={`text-xs font-semibold rounded-md px-2 py-1 ${
                    isLocked ? 'bg-muted text-muted-foreground/70' : 'glass text-primary'
                  }`}>
                    {unit.xp}
                  </span>
                </div>
                
                {!isLocked && (
                  <Button 
                    size="sm" 
                    variant={unit.progress > 0 ? "outline" : "outline"}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-white bg-gradient-to-b from-white/50 to-white/30 backdrop-blur-md ring-1 ring-white/40 shadow-soft shadow-inner hover:from-white/60 hover:to-white/40 transition-all"
                    onClick={(e) => { e.stopPropagation(); navigate(`/courses/${unit.id}`); }}
                  >
                    {unit.progress > 0 ? (
                      <>
                        Continue
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </>
                    ) : (
                      <>
                        Start
                        <Play className="w-3 h-3 ml-1" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Course Progress (Premium Redesign) */}
      <motion.div
        variants={itemVariants}
        className="relative"
      >
        <CourseProgressCard streak={currentStreak} totalXP={totalXP} nextLevelXP={nextLevelXP} />
      </motion.div>

      {/* Units Grid */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4"
      >
        {units.map((unit, index) => (
          <UnitCard key={unit.id} unit={unit} index={index} />
        ))}
      </motion.div>

      {/* Quick Actions removed per request */}
    </motion.div>
  );
};

export default CourseSection;