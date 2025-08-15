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
  Zap,
  Bell,
  Gift,
  Percent,
  Eye,
  Image as ImageIcon,
  Volume2,
  BookMarked
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Progress } from '../components/ui/Progress';
import { Badge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { supabase } from '../config/supabaseConfig';
import { useNavigate } from 'react-router-dom';

const Courses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVocabWord, setSelectedVocabWord] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userProgress, setUserProgress] = useState({
    currentStreak: 7,
    totalXP: 270,
    nextLevelXP: 500,
    level: 3
  });

  // Mock vocabulary images library
  const vocabularyImages = {
    'hello': '/assets/images/vocab/hello.svg',
    'goodbye': '/assets/images/vocab/goodbye.svg',
    'family': '/assets/images/vocab/family.svg',
    'food': '/assets/images/vocab/food.svg',
    'travel': '/assets/images/vocab/travel.svg'
  };

  useEffect(() => {
    loadCourses();
    loadNotifications();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from Supabase first
      const { data: supabaseCourses, error } = await supabase
        .from('courses')
        .select('id,title,description,cefr_level,is_active,created_at')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Supabase courses not available, using mock data:', error.message);
        // Use mock data if Supabase is not available
        setCourses(getMockCourses());
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
          xp: course.xp_reward || 0,
          level: course.cefr_level || 'A1',
          estimatedTime: course.estimated_time || '2-3 weeks'
        }));
        setCourses(transformedCourses.length > 0 ? transformedCourses : getMockCourses());
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setCourses(getMockCourses());
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      // Try to fetch from Supabase
      const { data, error } = await supabase
        .from('notifications')
        .select('id,type,title,message,icon,created_at,is_read')
        .eq('user_id', 'current_user') // Replace with actual user ID
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('Notifications not available, using mock data:', error.message);
        setNotifications(getMockNotifications());
      } else {
        const transformed = (data || []).map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          icon: n.icon || '🔔',
          timestamp: n.created_at ? new Date(n.created_at) : new Date(),
          isRead: n.is_read === true
        }));
        setNotifications(transformed.length > 0 ? transformed : getMockNotifications());
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications(getMockNotifications());
    }
  };

  const getMockCourses = () => [
    {
      id: 1,
      title: "Basic Greetings & Introductions",
      description: "Learn essential greetings and how to introduce yourself",
      icon: "👋",
      progress: 100,
      isUnlocked: true,
      isCompleted: true,
      lessons: 8,
      xp: 150,
      level: 'A1',
      estimatedTime: '1 week'
    },
    {
      id: 2,
      title: "Family & Relationships",
      description: "Vocabulary and phrases about family members and relationships",
      icon: "👨‍👩‍👧‍👦",
      progress: 60,
      isUnlocked: true,
      isCompleted: false,
      lessons: 12,
      xp: 120,
      level: 'A1',
      estimatedTime: '2 weeks'
    },
    {
      id: 3,
      title: "Food & Dining",
      description: "Learn about food, restaurants, and dining experiences",
      icon: "🍽️",
      progress: 0,
      isUnlocked: true,
      isCompleted: false,
      lessons: 10,
      xp: 0,
      level: 'A2',
      estimatedTime: '2 weeks'
    },
    {
      id: 4,
      title: "Travel & Transportation",
      description: "Essential phrases for traveling and using transportation",
      icon: "✈️",
      progress: 0,
      isUnlocked: false,
      isCompleted: false,
      lessons: 15,
      xp: 0,
      level: 'A2',
      estimatedTime: '3 weeks'
    },
    {
      id: 5,
      title: "Business & Work",
      description: "Professional vocabulary and workplace communication",
      icon: "💼",
      progress: 0,
      isUnlocked: false,
      isCompleted: false,
      lessons: 18,
      xp: 0,
      level: 'B1',
      estimatedTime: '4 weeks'
    }
  ];

  const getMockNotifications = () => [
    {
      id: 1,
      type: 'course',
      title: 'New Course Available!',
      message: 'Advanced Conversation Skills course is now available',
      icon: '🎉',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      isRead: false
    },
    {
      id: 2,
      type: 'discount',
      title: '50% Off Premium!',
      message: 'Limited time offer - Upgrade to Premium and save 50%',
      icon: '🏷️',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      isRead: false
    },
    {
      id: 3,
      type: 'achievement',
      title: 'Streak Milestone!',
      message: 'Congratulations on your 7-day learning streak!',
      icon: '🔥',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      isRead: true
    }
  ];

  const handleVocabWordClick = (word) => {
    setSelectedVocabWord(word);
    // Play pronunciation audio if available
    if (word.audio) {
      const audio = new Audio(word.audio);
      audio.play().catch(console.error);
    }
  };

  const CourseCard = ({ course, index }) => {
    const isLocked = !course.isUnlocked;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ scale: isLocked ? 1 : 1.02 }}
        whileTap={{ scale: isLocked ? 1 : 0.98 }}
        className={`relative ${
          isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
        onClick={() => {
          if (!isLocked) {
            navigate(`/courses/${course.id}`);
          }
        }}
        role={isLocked ? undefined : 'button'}
        aria-disabled={isLocked}
      >
        <Card className={`h-full transition-all duration-300 ${
          isLocked 
            ? 'bg-muted/50 border-border opacity-60' 
            : 'bg-card border-border hover:border-primary/30 hover:shadow-lg dark:hover:shadow-primary/10'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`text-3xl p-3 rounded-full ${
                  isLocked ? 'bg-muted' : 'bg-primary/10'
                }`}>
                  {isLocked ? <Lock className="w-6 h-6 text-muted-foreground" /> : course.icon}
                </div>
                <div className="flex-1">
                  <CardTitle className={`text-lg ${
                    isLocked ? 'text-muted-foreground' : 'text-foreground'
                  }`}>
                    {course.title}
                  </CardTitle>
                  <p className={`text-sm mt-1 ${
                    isLocked ? 'text-muted-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {course.description}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {course.level}
                    </Badge>
                    <span className={`text-xs ${
                      isLocked ? 'text-muted-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {course.lessons} lessons • {course.estimatedTime}
                    </span>
                  </div>
                </div>
              </div>
              
              {course.isCompleted && (
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
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={isLocked ? 'text-muted-foreground/70' : 'text-muted-foreground'}>
                    Progress
                  </span>
                  <span className={`font-medium ${
                    isLocked ? 'text-muted-foreground/70' : 'text-primary'
                  }`}>
                    {course.progress}%
                  </span>
                </div>
                <Progress 
                  value={course.progress} 
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
                    {course.xp} XP
                  </span>
                </div>
                
                {!isLocked && (
                  <Button 
                    size="sm" 
                    variant={course.progress > 0 ? "default" : "outline"}
                    className="text-xs"
                  >
                    {course.progress > 0 ? (
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

  const NotificationPanel = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <span>Notifications</span>
              {notifications.filter(n => !n.isRead).length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {notifications.filter(n => !n.isRead).length}
                </Badge>
              )}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowNotifications(!showNotifications)}
            >
              {showNotifications ? 'Hide' : 'Show'}
            </Button>
          </div>
        </CardHeader>
        
        {showNotifications && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                    notification.isRead ? 'bg-muted/30' : 'bg-white dark:bg-gray-800 shadow-sm'
                  }`}
                >
                  <span className="text-2xl">{notification.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${
                      notification.isRead ? 'text-muted-foreground' : 'text-foreground'
                    }`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.timestamp.toLocaleDateString()}
                    </p>
                  </div>
                  {notification.type === 'discount' && (
                    <Badge variant="secondary" className="text-xs">
                      <Percent className="w-3 h-3 mr-1" />
                      Offer
                    </Badge>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );

  const VocabularyPreview = () => {
    const sampleWords = [
      { word: 'hello', translation: 'hola', image: vocabularyImages.hello },
      { word: 'family', translation: 'familia', image: vocabularyImages.family },
      { word: 'food', translation: 'comida', image: vocabularyImages.food }
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <ImageIcon className="w-5 h-5 text-green-600" />
              <span>Visual Vocabulary</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Click on words to see images and hear pronunciation
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {sampleWords.map((item, index) => (
                <motion.div
                  key={item.word}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-center p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-all"
                  onClick={() => handleVocabWordClick(item)}
                >
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20 rounded-full flex items-center justify-center">
                    <Eye className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="font-medium text-sm">{item.word}</p>
                  <p className="text-xs text-muted-foreground">{item.translation}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <BookMarked className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Courses</h1>
            <p className="text-muted-foreground">Structured learning paths to master the language</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="flex items-center space-x-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-foreground">{userProgress.currentStreak} day streak</span>
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Level {userProgress.level} • {userProgress.totalXP}/{userProgress.nextLevelXP} XP
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Overall Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-semibold text-primary">Overall Learning Progress</span>
              <span className="text-lg font-bold text-primary">
                {Math.round((userProgress.totalXP / userProgress.nextLevelXP) * 100)}%
              </span>
            </div>
            <Progress 
              value={(userProgress.totalXP / userProgress.nextLevelXP) * 100} 
              className="h-4 mb-2"
            />
            <p className="text-sm text-primary">
              {userProgress.nextLevelXP - userProgress.totalXP} XP until Level {userProgress.level + 1}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications */}
      <NotificationPanel />

      {/* Visual Vocabulary Preview */}
      <VocabularyPreview />

      {/* Courses Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <CourseCard key={course.id} course={course} index={index} />
          ))}
        </div>
      </motion.div>

      {/* Quick Practice Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-muted/30 border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Target className="w-5 h-5 text-green-600" />
              <span>Quick Practice</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Reinforce your learning with these quick exercises
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium">Review Vocabulary</p>
                    <p className="text-xs text-muted-foreground">5 min practice</p>
                  </div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="flex items-center space-x-3">
                  <Volume2 className="w-5 h-5 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">Pronunciation</p>
                    <p className="text-xs text-muted-foreground">3 min practice</p>
                  </div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-purple-600" />
                  <div className="text-left">
                    <p className="font-medium">Grammar Quiz</p>
                    <p className="text-xs text-muted-foreground">10 min practice</p>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Courses;