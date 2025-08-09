import React, { useState, useEffect } from 'react';
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

const CourseSection = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(7);
  const [totalXP, setTotalXP] = useState(270);
  const [nextLevelXP, setNextLevelXP] = useState(500);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from Supabase first
      const { data: supabaseCourses, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Supabase courses not available, using mock data:', error.message);
        // Use mock data if Supabase is not available
        setUnits(getMockCourses());
      } else {
        // Transform Supabase data to match our component structure
        const transformedCourses = supabaseCourses.map(course => ({
          id: course.id,
          title: course.title,
          description: course.description,
          icon: course.icon || "📚",
          progress: course.progress || 0,
          isUnlocked: course.is_active !== false, // Use is_active field from database
          isCompleted: course.is_completed || false,
          lessons: course.lesson_count || 0,
          xp: course.xp_reward || 0
        }));
        setUnits(transformedCourses.length > 0 ? transformedCourses : getMockCourses());
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setUnits(getMockCourses());
    } finally {
      setLoading(false);
    }
  };

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
        <Card className={`h-full transition-all duration-300 ${
          isLocked 
            ? 'bg-muted/50 border-border opacity-60' 
            : 'bg-card border-border hover:border-primary/30 hover:shadow-lg dark:hover:shadow-primary/10'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`text-3xl p-2 rounded-full ${
                  isLocked ? 'bg-muted' : 'bg-primary/10'
                }`}>
                  {isLocked ? <Lock className="w-6 h-6 text-muted-foreground" /> : unit.icon}
                </div>
                <div>
                  <CardTitle className={`text-lg ${
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
                  <span className={`font-medium ${
                    isLocked ? 'text-muted-foreground/70' : 'text-primary'
                  }`}>
                    {unit.progress}%
                  </span>
                </div>
                <Progress 
                  value={unit.progress} 
                  className={`h-2 ${
                    isLocked ? 'opacity-50' : ''
                  }`}
                />
              </div>
              
              {/* XP and Action */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Zap className={`w-4 h-4 ${
                    isLocked ? 'text-gray-400' : 'text-yellow-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    isLocked ? 'text-muted-foreground/70' : 'text-foreground'
                  }`}>
                    {unit.xp} XP
                  </span>
                </div>
                
                {!isLocked && (
                  <Button 
                    size="sm" 
                    variant={unit.progress > 0 ? "default" : "outline"}
                    className="text-xs"
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
      {/* Course Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Course Progress</h2>
            <p className="text-muted-foreground">Continue your language learning journey</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="flex items-center space-x-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-foreground">{currentStreak} day streak</span>
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{totalXP}/{nextLevelXP} XP</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Overall Progress */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-primary">Overall Progress</span>
              <span className="text-sm font-bold text-primary">
                {Math.round((totalXP / nextLevelXP) * 100)}%
              </span>
            </div>
            <Progress 
              value={(totalXP / nextLevelXP) * 100} 
              className="h-3"
            />
            <p className="text-xs text-primary mt-2">
              {nextLevelXP - totalXP} XP until next level
            </p>
          </CardContent>
        </Card>
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

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card className="bg-muted/30 border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Target className="w-5 h-5 text-green-600" />
              <span>Quick Practice</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button variant="outline" className="justify-start">
                <BookOpen className="w-4 h-4 mr-2" />
                Review Vocabulary
              </Button>
              <Button variant="outline" className="justify-start">
                <Play className="w-4 h-4 mr-2" />
                Practice Speaking
              </Button>
              <Button variant="outline" className="justify-start">
                <Target className="w-4 h-4 mr-2" />
                Grammar Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default CourseSection;