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
  BookMarked,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Progress } from '../components/ui/Progress';
import { Badge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/Select';
import { supabase } from '../config/supabaseConfig';
import supabaseService from '../services/supabaseService';
import { useNavigate } from 'react-router-dom';
import CourseProgressCard from '../components/Course/CourseProgressCard';

const Courses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all'); // 'all' | 'A1' | ...
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all' | 'unlocked' | 'completed'
  const [sortBy, setSortBy] = useState('recommended'); // 'recommended' | 'newest' | 'lessons' | 'xp' | 'title' | 'progress'
  const [selectedVocabWord, setSelectedVocabWord] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [wishlist, setWishlist] = useState(() => {
    try {
      const raw = localStorage.getItem('wishlistCourseIds');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
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
    // Attempt to load persisted wishlist from server
    (async () => {
      const res = await supabaseService.getWishlistCourseIds();
      if (res.success && Array.isArray(res.data) && res.data.length) {
        setWishlist(res.data);
        try { localStorage.setItem('wishlistCourseIds', JSON.stringify(res.data)); } catch {}
      }
    })();
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
          estimatedTime: course.estimated_time || '2-3 weeks',
          createdAt: course.created_at ? new Date(course.created_at) : new Date(0)
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
      // Resolve the current user's profile id (user_profiles.id) if possible
      let currentProfileId = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // user_profiles primary key is auth user id in our schema
          currentProfileId = user.id;
        }
      } catch (_) {}

      const { data, error } = await supabase
        .from('notifications')
        .select('id,type,content,created_at,is_read')
        .eq('user_id', currentProfileId || '')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('Notifications not available, using mock data:', error.message);
        setNotifications(getMockNotifications());
      } else {
        const transformed = (data || []).map(n => ({
          id: n.id,
          type: n.type,
          title: 'Notification',
          message: n.content,
          icon: '🔔',
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

  const CourseCard = ({ course, index, variant = 'default' }) => {
    const isLocked = !course.isUnlocked;
    const isDashboardStyle = variant === 'dashboard';
    
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
          console.log('CourseCard clicked for course:', course.id);
          if (!course.isUnlocked) {
            console.log('Course is locked:', course.id);
            return;
          }
          console.log('Navigating to course:', `/courses/${course.id}`);
          navigate(`/courses/${course.id}`);
        }}
        role={!course.isUnlocked ? undefined : 'button'}
        aria-disabled={!course.isUnlocked}
      >
        {/* Premium glass card styling */}
        <Card className={`relative overflow-hidden h-full transition-all duration-300 ${
          isLocked 
            ? (isDashboardStyle
                ? 'bg-white/5 border border-primary/20 opacity-60 rounded-xl'
                : 'bg-muted/50 border-border opacity-60') 
            : (isDashboardStyle
                ? 'card-premium rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent hover:shadow-soft'
                : 'bg-white/10 backdrop-blur-md border border-white/20 ring-1 ring-white/15 hover:ring-white/30 hover:shadow-lg')
        }`}>
          {/* aurora glow accents */}
          {!isLocked && (
            <>
              <div className={`pointer-events-none absolute -top-12 -left-16 w-40 h-40 rounded-full ${isDashboardStyle ? 'bg-primary/20' : 'bg-fuchsia-400/15'} blur-2xl`} />
              <div className={`pointer-events-none absolute -bottom-12 right-0 w-44 h-44 rounded-full ${isDashboardStyle ? 'bg-primary/20' : 'bg-indigo-400/15'} blur-2xl`} />
            </>
          )}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`text-3xl p-3 rounded-xl ring-1 ${
                  isLocked ? 'bg-muted ring-border' : (isDashboardStyle ? 'bg-gradient-to-br from-violet-500/20 to-indigo-500/20 ring-primary/30 shadow-soft' : 'bg-white/10 ring-white/20 shadow-sm')
                }`}>
                  {isLocked ? <Lock className="w-6 h-6 text-muted-foreground" /> : course.icon}
                </div>
                <div className="flex-1">
                  <CardTitle className={`text-lg tracking-tight ${
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
                    <Badge variant="outline" className="text-xs glass px-2 py-0.5">
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
                {/* premium gradient progress */}
                <div className={`h-2 w-full rounded-full ${isDashboardStyle ? 'bg-white/10 ring-1 ring-primary/20' : 'bg-white/10 ring-1 ring-white/10'} overflow-hidden ${isLocked ? 'opacity-50' : ''}`}>
                  <div
                    className={`h-full rounded-full ${isDashboardStyle ? 'bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-400' : 'bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-400'}`}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
              
              {/* XP and Action */}
              <div className="flex items-center justify-between">
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${isDashboardStyle ? 'bg-white/5 ring-1 ring-primary/20' : 'bg-white/5 ring-1 ring-white/10'}`}>
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
                    className={`text-xs rounded-full ${isDashboardStyle ? 'bg-white/10 hover:bg-white/20 ring-1 ring-primary/20' : 'bg-white/10 hover:bg-white/20 ring-1 ring-white/15'}`}
                    onClick={() => navigate(`/courses/${course.id}`)}
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

  const toggleWishlist = async (courseId) => {
    const exists = wishlist.includes(courseId);
    const next = exists ? wishlist.filter(id => id !== courseId) : [...wishlist, courseId];
    setWishlist(next);
    try { localStorage.setItem('wishlistCourseIds', JSON.stringify(next)); } catch {}
    // Best-effort server sync
    try {
      if (exists) {
        await supabaseService.removeFromWishlist(courseId);
      } else {
        await supabaseService.addToWishlist(courseId);
      }
    } catch (_) {}
  };

  // Derived filtered + sorted courses
  const filteredAndSortedCourses = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = courses.filter(c => {
      const matchesSearch = term === '' ||
        c.title?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term);
      const matchesLevel = levelFilter === 'all' || c.level === levelFilter;
      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'unlocked' && c.isUnlocked) ||
        (availabilityFilter === 'completed' && c.isCompleted);
      return matchesSearch && matchesLevel && matchesAvailability;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0);
        case 'lessons':
          return (b.lessons || 0) - (a.lessons || 0);
        case 'xp':
          return (b.xp || 0) - (a.xp || 0);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'progress':
          return (b.progress || 0) - (a.progress || 0);
        case 'recommended':
        default:
          // Prefer in-progress, then unlocked, then others; tie-break by lessons desc
          const score = (c) => (c.progress > 0 ? 2 : c.isUnlocked ? 1 : 0);
          const byScore = score(b) - score(a);
          if (byScore !== 0) return byScore;
          return (b.lessons || 0) - (a.lessons || 0);
      }
    });

    return sorted;
  }, [courses, searchTerm, levelFilter, availabilityFilter, sortBy]);

  const continueLearningCourses = React.useMemo(() => {
    return courses.filter(c => c.progress && c.progress > 0).slice(0, 10);
  }, [courses]);

  const recommendedCourses = React.useMemo(() => {
    // Simple heuristic: unlocked, not completed, lowest progress first then more lessons
    return courses
      .filter(c => c.isUnlocked && !c.isCompleted)
      .sort((a, b) => (a.progress || 0) - (b.progress || 0) || (b.lessons || 0) - (a.lessons || 0))
      .slice(0, 10);
  }, [courses]);

  // Sets used to avoid duplicates across sections
  const recommendedIds = React.useMemo(() => new Set(recommendedCourses.map(c => c.id)), [recommendedCourses]);
  const continueLearningIds = React.useMemo(() => new Set(continueLearningCourses.map(c => c.id)), [continueLearningCourses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const overallPct = Math.round((userProgress.totalXP / userProgress.nextLevelXP) * 100);
  const remainingXP = Math.max(userProgress.nextLevelXP - userProgress.totalXP, 0);

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

      {/* Course Progress (Premium Redesign) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <CourseProgressCard streak={userProgress.currentStreak} totalXP={userProgress.totalXP} nextLevelXP={userProgress.nextLevelXP} />
      </motion.div>

      {/* Notifications and Visual Vocabulary removed as requested */}

      {/* Course Controls — Premium Glass/Aurora Redesign */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="card card-premium relative overflow-hidden p-6 border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent rounded-xl">
          {/* aurora accents */}
          <div className="pointer-events-none absolute -top-10 -left-10 w-52 h-52 rounded-full bg-primary/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 left-1/3 w-64 h-40 rounded-full bg-primary/15 blur-2xl" />

          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search input with icon */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
                  <Input
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-11 pl-10 rounded-lg bg-white/10 text-foreground placeholder-white/70 ring-1 ring-primary/20 focus:ring-primary/30 transition-all"
                  />
                </div>
              </div>
              {/* Level filter chip */}
              <div>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="h-11 rounded-lg bg-white/10 text-foreground ring-1 ring-primary/20 hover:bg-white/12 transition-colors">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    <SelectItem value="A1">A1</SelectItem>
                    <SelectItem value="A2">A2</SelectItem>
                    <SelectItem value="B1">B1</SelectItem>
                    <SelectItem value="B2">B2</SelectItem>
                    <SelectItem value="C1">C1</SelectItem>
                    <SelectItem value="C2">C2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Availability filter chip */}
              <div>
                <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                  <SelectTrigger className="h-11 rounded-lg bg-white/10 text-foreground ring-1 ring-primary/20 hover:bg-white/12 transition-colors">
                    <SelectValue placeholder="Availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All courses</SelectItem>
                    <SelectItem value="unlocked">Unlocked only</SelectItem>
                    <SelectItem value="completed">Completed only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Sort by chip */}
              <div className="md:col-span-1">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-11 rounded-lg bg-white/10 text-foreground ring-1 ring-primary/20 hover:bg-white/12 transition-colors">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recommended">Recommended</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="lessons">Most lessons</SelectItem>
                    <SelectItem value="xp">Highest XP</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                    <SelectItem value="title">Title A–Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Showing {filteredAndSortedCourses.length} of {courses.length} courses
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Courses Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Continue Learning Rail */}
        {continueLearningCourses.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Continue Learning</h2>
              <span className="text-sm text-muted-foreground">Pick up where you left off</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {continueLearningCourses.slice(0, 6).map((course, index) => (
                <div key={`cont-${course.id}`} className="relative">
                  <CourseCard course={course} index={index} variant="dashboard" />
                  <button
                    aria-label="Toggle wishlist"
                    className="absolute top-3 right-3 text-sm rounded-full px-2 py-1 bg-background/80 border"
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(course.id); }}
                  >
                    {wishlist.includes(course.id) ? '★ Saved' : '☆ Save'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Rail */}
        {recommendedCourses.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Recommended for You</h2>
              <span className="text-xs font-semibold text-primary glass px-2 py-1 rounded-md">Based on your level and progress</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedCourses.slice(0, 6).map((course, index) => (
                <div key={`rec-${course.id}`} className="relative">
                  <CourseCard course={course} index={index} variant="dashboard" />
                  <button
                    aria-label="Toggle wishlist"
                    className="absolute top-3 right-3 text-sm rounded-full px-2 py-1 bg-background/80 border"
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(course.id); }}
                  >
                    {wishlist.includes(course.id) ? '★ Saved' : '☆ Save'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredAndSortedCourses.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground border border-dashed rounded-lg">
            No courses match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAndSortedCourses
              .filter((c) => !recommendedIds.has(c.id) && !continueLearningIds.has(c.id))
              .map((course, index) => (
                <CourseCard key={course.id} course={course} index={index} variant="dashboard" />
              ))}
          </div>
        )}
      </motion.div>

      {/* Quick Practice Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >

        <Card className="card card-premium relative overflow-hidden p-6 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/25 to-primary/5">
          <div className="pointer-events-none absolute -top-10 -left-10 w-60 h-60 rounded-full bg-primary/30 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-primary/20 blur-2xl" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-lg flex items-center space-x-2 tracking-tight">
              <Play className="w-5 h-5 text-primary" />
              <span>Quick Practice</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Reinforce your learning with these quick exercises
            </p>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="group block justify-start h-auto p-4 rounded-xl border border-primary/30 dark:border-white/20 bg-white/10 dark:bg-white/15 hover:bg-white/15 dark:hover:bg-white/20 backdrop-blur-sm transition-all duration-200 hover:shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-soft">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Review Vocabulary</p>
                    <p className="text-sm text-muted-foreground">5 min practice</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-sm ring-1 ring-primary/40 shadow-md shadow-primary/30 flex items-center justify-center transition-all group-hover:bg-white/80 group-hover:ring-primary/60">
                    <ArrowRight className="w-4 h-4 text-primary drop-shadow-sm" />
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="group block justify-start h-auto p-4 rounded-xl border border-primary/30 dark:border-white/20 bg-white/10 dark:bg-white/15 hover:bg-white/15 dark:hover:bg-white/20 backdrop-blur-sm transition-all duration-200 hover:shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-lime-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-soft">
                    <Volume2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Pronunciation</p>
                    <p className="text-sm text-muted-foreground">3 min practice</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-sm ring-1 ring-primary/40 shadow-md shadow-primary/30 flex items-center justify-center transition-all group-hover:bg-white/80 group-hover:ring-primary/60">
                    <ArrowRight className="w-4 h-4 text-primary drop-shadow-sm" />
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="group block justify-start h-auto p-4 rounded-xl border border-primary/30 dark:border-white/20 bg-white/10 dark:bg-white/15 hover:bg-white/15 dark:hover:bg-white/20 backdrop-blur-sm transition-all duration-200 hover:shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-soft">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Grammar Quiz</p>
                    <p className="text-sm text-muted-foreground">10 min practice</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-sm ring-1 ring-primary/40 shadow-md shadow-primary/30 flex items-center justify-center transition-all group-hover:bg-white/80 group-hover:ring-primary/60">
                    <ArrowRight className="w-4 h-4 text-primary drop-shadow-sm" />
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