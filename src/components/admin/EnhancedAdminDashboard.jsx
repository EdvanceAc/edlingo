import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Users,
  BarChart3,
  Trophy,
  Settings,
  Brain,
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  Star,
  TrendingUp,
  Clock,
  Target,
  Zap,
  Award,
  MessageSquare,
  PlayCircle,
  PauseCircle,
  RefreshCw,
  Calendar,
  Globe,
  Lightbulb,
  Shield,
  Bell,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Info,
  Send,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../renderer/components/ui/Card';
import { Progress } from '../../renderer/components/ui/Progress';
import { Badge } from '../../renderer/components/ui/Badge';
import Button from '../../renderer/components/ui/Button';
import ThemeToggle from '../../renderer/components/ui/ThemeToggle';
import { useTheme } from '../../renderer/contexts/ThemeContext';
import SkeletonLoader, { StatsCardSkeleton, CourseCardSkeleton, TableRowSkeleton } from '../../renderer/components/ui/SkeletonLoader';
import { supabase } from '../../renderer/config/supabaseConfig';
import '../../renderer/styles/themes.css';

const EnhancedAdminDashboard = () => {
  const { isDark } = useTheme();
  const [activeSection, setActiveSection] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Course Management State
  const [courses, setCourses] = useState([]);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseFormData, setCourseFormData] = useState({
    title: '',
    description: '',
    language: '',
    level: '',
    instructor: '',
    is_active: false,
    price: 0,
    duration: '',
    difficulty: 'beginner'
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    type: 'info',
    targetUsers: 'all'
  });

  // Hierarchical Search State
  const [hierarchicalData, setHierarchicalData] = useState({});
  const [expandedCourses, setExpandedCourses] = useState(new Set());
  const [expandedTerms, setExpandedTerms] = useState(new Set());
  const [searchMode, setSearchMode] = useState('courses');
  const [hierarchicalResults, setHierarchicalResults] = useState([]);
  const [showHierarchicalView, setShowHierarchicalView] = useState(false);
 
  // Course Management Functions
  const loadCourses = async () => {
    try {
      setIsLoadingCourses(true);
      const { data, error } = await supabase
        .from('courses')
        .select('id,title,description,language,level,instructor,is_active,price,duration,updated_at,created_at,status,students,completion')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
      // Fallback to mock data
      setCourses([
        {
          id: 1,
          title: "Spanish for Beginners",
          language: "Spanish",
          level: "A1",
          students: 245,
          completion: 78,
          status: "active",
          lastUpdated: "2 days ago",
          instructor: "Maria Garcia",
          description: "Learn Spanish from scratch",
          price: 99,
          duration: "8 weeks"
        },
        {
          id: 2,
          title: "Advanced French Grammar",
          language: "French",
          level: "B2",
          students: 89,
          completion: 65,
          status: "active",
          lastUpdated: "1 week ago",
          instructor: "Pierre Dubois",
          description: "Master French grammar",
          price: 149,
          duration: "12 weeks"
        },
        {
          id: 3,
          title: "German Conversation",
          language: "German",
          level: "B1",
          students: 156,
          completion: 72,
          status: "inactive",
          lastUpdated: "5 days ago",
          instructor: "Hans Müller",
          description: "Enhance your speaking skills",
          price: 129,
          duration: "10 weeks"
        }
      ]);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const createCourse = async (courseData) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .insert([{
          ...courseData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      
      setCourses(prev => [data[0], ...prev]);
      setShowCourseForm(false);
      resetCourseForm();
      
      addNotification('success', 'Course created successfully!');
      
    } catch (error) {
      console.error('Error creating course:', error);
      addNotification('error', 'Failed to create course. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateCourse = async (courseId, courseData) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .update({
          ...courseData,
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId)
        .select();
      
      if (error) throw error;
      
      setCourses(prev => prev.map(course => 
        course.id === courseId ? data[0] : course
      ));
      setEditingCourse(null);
      setShowCourseForm(false);
      resetCourseForm();
      
      addNotification('success', 'Course updated successfully!');
      
    } catch (error) {
      console.error('Error updating course:', error);
      addNotification('error', 'Failed to update course. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      
      if (error) throw error;
      
      setCourses(prev => prev.filter(course => course.id !== courseId));
      addNotification('success', 'Course deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting course:', error);
      addNotification('error', 'Failed to delete course. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addNotification = (type, message) => {
    setNotifications(prev => [{
      id: Date.now(),
      type,
      message,
      timestamp: new Date()
    }, ...prev.slice(0, 4)]);
  };

  // Helper functions for hierarchical search
  const loadCourseTerms = async (courseId) => {
    try {
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .eq('course_id', courseId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading course terms:', error);
      addNotification('error', 'Failed to load course terms');
      return [];
    }
  };

  const loadTermLessons = async (termId) => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('term_id', termId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading term lessons:', error);
      addNotification('error', 'Failed to load term lessons');
      return [];
    }
  };

  const loadLessonMaterials = async (lessonId) => {
    try {
      const { data, error } = await supabase
        .from('lesson_materials')
        .select('id, type, url, title, content, lesson_id')
        .eq('lesson_id', lessonId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading lesson materials:', error);
      addNotification('error', 'Failed to load lesson materials');
      return [];
    }
  };

  const resetCourseForm = () => {
    setCourseFormData({
      title: '',
      description: '',
      language: '',
      level: '',
      instructor: '',
      is_active: false,
      price: 0,
      duration: '',
      difficulty: 'beginner'
    });
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setCourseFormData({
      title: course.title || '',
      description: course.description || '',
      language: course.language || '',
      level: course.level || '',
      instructor: course.instructor || '',
      is_active: course.is_active || false,
      price: course.price || 0,
      duration: course.duration || '',
      difficulty: course.difficulty || 'beginner'
    });
    setShowCourseForm(true);
  };

  const handleSubmitCourse = (e) => {
    e.preventDefault();
    if (editingCourse) {
      updateCourse(editingCourse.id, courseFormData);
    } else {
      createCourse(courseFormData);
    }
  };

  const sendNotification = async () => {
    try {
      setIsLoading(true);
      addNotification('info', `Notification sent: ${notificationData.title}`);
      setShowNotificationForm(false);
      setNotificationData({
        title: '',
        message: '',
        type: 'info',
        targetUsers: 'all'
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      addNotification('error', 'Failed to send notification.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load courses when course management section is active
  useEffect(() => {
    if (activeSection === 'courses') {
      loadCourses();
    }
  }, [activeSection]);

  // Simulate stats loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingStats(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Navigation sections
  const navigationSections = [
    {
      id: 'overview',
      name: 'Dashboard Overview',
      icon: BarChart3,
      description: 'Key metrics and insights'
    },
    {
      id: 'course-management',
      name: 'Course Management',
      icon: BookOpen,
      description: 'Create, edit, and manage courses'
    },
    {
      id: 'student-analytics',
      name: 'Student Analytics',
      icon: Users,
      description: 'Track student progress and performance'
    },
    {
      id: 'content-management',
      name: 'Content Management',
      icon: FileText,
      description: 'Manage lessons, media, and assessments'
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: Bell,
      description: 'Send notifications to users'
    }
  ];

  // Course Form Component
  const CourseForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">
            {editingCourse ? 'Edit Course' : 'Create New Course'}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowCourseForm(false);
              setEditingCourse(null);
              resetCourseForm();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmitCourse} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Course Title</label>
              <input
                type="text"
                required
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={courseFormData.title}
                onChange={(e) => setCourseFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter course title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <select
                required
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={courseFormData.language}
                onChange={(e) => setCourseFormData(prev => ({ ...prev, language: e.target.value }))}
              >
                <option value="">Select Language</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Italian">Italian</option>
                <option value="Portuguese">Portuguese</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Level</label>
              <select
                required
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={courseFormData.level}
                onChange={(e) => setCourseFormData(prev => ({ ...prev, level: e.target.value }))}
              >
                <option value="">Select Level</option>
                <option value="A1">A1 - Beginner</option>
                <option value="A2">A2 - Elementary</option>
                <option value="B1">B1 - Intermediate</option>
                <option value="B2">B2 - Upper Intermediate</option>
                <option value="C1">C1 - Advanced</option>
                <option value="C2">C2 - Proficient</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Instructor</label>
              <input
                type="text"
                required
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={courseFormData.instructor}
                onChange={(e) => setCourseFormData(prev => ({ ...prev, instructor: e.target.value }))}
                placeholder="Instructor name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Duration</label>
              <input
                type="text"
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={courseFormData.duration}
                onChange={(e) => setCourseFormData(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="e.g., 8 weeks"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Price ($)</label>
              <input
                type="number"
                min="0"
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={courseFormData.price}
                onChange={(e) => setCourseFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              rows={4}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={courseFormData.description}
              onChange={(e) => setCourseFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Course description"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={courseFormData.is_active ? 'active' : 'inactive'}
                onChange={(e) => setCourseFormData(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
              >
                <option value="inactive">Inactive</option>
                <option value="active">Active</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Difficulty</label>
              <select
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={courseFormData.difficulty}
                onChange={(e) => setCourseFormData(prev => ({ ...prev, difficulty: e.target.value }))}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Saving...' : (editingCourse ? 'Update Course' : 'Create Course')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCourseForm(false);
                setEditingCourse(null);
                resetCourseForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );

  // Enhanced Course Management Component
  const CourseManagement = () => (
    <div className="space-y-6">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className={`p-3 rounded-lg flex items-center gap-2 ${
                notification.type === 'success' ? 'bg-green-100 text-green-800' :
                notification.type === 'error' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}
            >
              {notification.type === 'success' && <CheckCircle className="w-4 h-4" />}
              {notification.type === 'error' && <AlertTriangle className="w-4 h-4" />}
              {notification.type === 'info' && <Info className="w-4 h-4" />}
              <span className="text-sm">{notification.message}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mobile-stack">
        <div>
          <h2 className="text-2xl font-bold">Course Management</h2>
          <p className="text-muted-foreground">Create, edit, and manage your language courses</p>
        </div>
        <div className="flex gap-2 mobile-full mobile-stack sm:flex-row">
          <Button onClick={() => setShowCourseForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      {/* Course Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mobile-grid-1">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold">{courses.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Courses</p>
                <p className="text-2xl font-bold">{courses.filter(c => c.status === 'active').length}</p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{courses.reduce((sum, c) => sum + (c.students || 0), 0)}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Completion</p>
                <p className="text-2xl font-bold">{Math.round(courses.reduce((sum, c) => sum + (c.completion || 0), 0) / Math.max(courses.length, 1))}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={searchMode}
          onChange={(e) => setSearchMode(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="courses">Courses</option>
          <option value="lessons">Lessons</option>
          <option value="materials">Materials</option>
          <option value="all">All</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => setShowHierarchicalView(!showHierarchicalView)}>
          <Layers className="w-4 h-4 mr-2" />
          {showHierarchicalView ? 'Hierarchical On' : 'Hierarchical Off'}
        </Button>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Hierarchical Search Results */}
      {showHierarchicalView && searchTerm && (searchMode === 'lessons' || searchMode === 'materials' || searchMode === 'all') && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Search results</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Searching...</p>
            ) : hierarchicalResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No results</p>
            ) : (
              <div className="space-y-2">
                {hierarchicalResults.map(({ course, terms }) => (
                  <div key={course.id} className="border rounded">
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30"
                      onClick={() => {
                        const newExpanded = new Set(expandedCourses);
                        if (newExpanded.has(course.id)) newExpanded.delete(course.id);
                        else newExpanded.add(course.id);
                        setExpandedCourses(newExpanded);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {expandedCourses.has(course.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="font-medium">{course.title}</span>
                        <Badge variant="outline">{terms.length} terms</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{course.language} • {course.instructor || 'Unknown'}</span>
                    </button>
                    <AnimatePresence>
                      {expandedCourses.has(course.id) && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="pl-6 pr-3">
                          {terms.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-2">No terms</div>
                          ) : terms.map(({ term, lessons }) => (
                            <div key={term.id} className="border-l pl-3 py-2">
                              <button
                                className="flex items-center gap-2"
                                onClick={() => {
                                  const termKey = `${course.id}:${term.id}`;
                                  const newExpanded = new Set(expandedTerms);
                                  if (newExpanded.has(termKey)) newExpanded.delete(termKey);
                                  else newExpanded.add(termKey);
                                  setExpandedTerms(newExpanded);
                                }}
                              >
                                {expandedTerms.has(`${course.id}:${term.id}`) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                <span>{term.name ?? term.title ?? `Term ${term.order_number ?? ''}`}</span>
                                <Badge variant="secondary">{lessons.length} lessons</Badge>
                              </button>
                              <AnimatePresence>
                                {expandedTerms.has(`${course.id}:${term.id}`) && (
                                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="pl-6">
                                    {lessons.length === 0 ? (
                                      <div className="text-sm text-muted-foreground py-2">No lessons</div>
                                    ) : lessons.map(lesson => (
                                      <div key={lesson.id} className="flex items-center justify-between py-1">
                                        <span className="text-sm">{lesson.name ?? lesson.title ?? `Lesson ${lesson.order_number ?? ''}`}</span>
                                        <div className="flex gap-1">
                                          <Badge variant="outline" className="text-xs">{lesson.lesson_materials?.length || 0} materials</Badge>  
                                          <Badge variant="outline" className="text-xs">{lesson.order_number ?? lesson.order ?? ''}</Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Course Grid */}
      {isLoadingCourses ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mobile-grid-1">
          {Array.from({ length: 6 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.3 }}
            >
              <CourseCardSkeleton />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mobile-grid-1">
          {
            courses
              .filter(course => 
                course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                course.language?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                course.instructor?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((course) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{course.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{course.language} • {course.level}</p>
                      </div>
                      <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                        {course.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                      <div className="flex justify-between text-sm">
                        <span>Students: {course.students || 0}</span>
                        <span>Completion: {course.completion || 0}%</span>
                      </div>
                      <Progress value={course.completion || 0} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        <p>Instructor: {course.instructor}</p>
                        <p>Duration: {course.duration}</p>
                        <p>Price: ${course.price || 0}</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEditCourse(course)}>
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline">
                          <BarChart3 className="w-3 h-3 mr-1" />
                          Analytics
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => deleteCourse(course.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          }
        </div>
      )}

      {/* Course Form Modal */}
      <AnimatePresence>
        {showCourseForm && <CourseForm />}
      </AnimatePresence>
    </div>
  );

  // Notification Management Component
  const NotificationManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Notification Management</h2>
          <p className="text-muted-foreground">Send notifications to users</p>
        </div>
        <Button onClick={() => setShowNotificationForm(true)}>
          <Send className="w-4 h-4 mr-2" />
          Send Notification
        </Button>
      </div>

      {/* Notification Form */}
      {showNotificationForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Notification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={notificationData.title}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Notification title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  rows={4}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={notificationData.message}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Notification message"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={notificationData.type}
                    onChange={(e) => setNotificationData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Target Users</label>
                  <select
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={notificationData.targetUsers}
                    onChange={(e) => setNotificationData(prev => ({ ...prev, targetUsers: e.target.value }))}
                  >
                    <option value="all">All Users</option>
                    <option value="students">Students Only</option>
                    <option value="instructors">Instructors Only</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={sendNotification} disabled={isLoading}>
                  <Send className="w-4 h-4 mr-2" />
                  {isLoading ? 'Sending...' : 'Send Notification'}
                </Button>
                <Button variant="outline" onClick={() => setShowNotificationForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Main render function
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'course-management':
        return <CourseManagement />;
      case 'notifications':
        return <NotificationManagement />;
      default:
        return (
          <div className="space-y-8">
            {/* Header */}
            <motion.div 
              className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div>
                <h2 className="text-3xl font-bold text-gradient mb-2">نمای کلی داشبورد</h2>
                <p className="opacity-70">آمار و اطلاعات کلیدی سیستم آموزشی</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={() => {
                      setActiveSection('course-management');
                      setShowCourseForm(true);
                    }}
                    className="gradient-primary hover:shadow-lg transition-all duration-300 btn-micro ripple bounce-hover"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    ایجاد دوره جدید
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveSection('course-management')}
                    className="glass border-white/20 hover:border-white/40 transition-all duration-300 btn-micro hover-lift"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    مدیریت دوره‌ها
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mobile-grid-1">
              {isLoadingStats ? (
                // Skeleton Loading State
                Array.from({ length: 4 }).map((_, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.5 }}
                  >
                    <StatsCardSkeleton />
                  </motion.div>
                ))
              ) : (
                // Actual Stats Cards
                [
                  {
                    title: 'کل دوره‌ها',
                    value: '24',
                    icon: BookOpen,
                    color: 'blue',
                    gradient: 'from-blue-500 to-blue-600',
                    change: '+12%',
                    changeType: 'positive'
                  },
                  {
                    title: 'کل دانشجویان',
                    value: '1,247',
                    icon: Users,
                    color: 'emerald',
                    gradient: 'from-emerald-500 to-emerald-600',
                    change: '+8%',
                    changeType: 'positive'
                  },
                  {
                    title: 'نرخ تکمیل',
                    value: '78.5%',
                    icon: Target,
                    color: 'orange',
                    gradient: 'from-orange-500 to-orange-600',
                    change: '+5%',
                    changeType: 'positive'
                  },
                  {
                    title: 'درآمد',
                    value: '$15,420',
                    icon: TrendingUp,
                    color: 'purple',
                    gradient: 'from-purple-500 to-purple-600',
                    change: '+23%',
                    changeType: 'positive'
                  }
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index, duration: 0.5 }}
                      whileHover={{ y: -5, scale: 1.02 }}
                      className="group"
                    >
                      <div className="glass rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-xl relative overflow-hidden">
                        {/* Background Gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                        
                        {/* Glow Effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                        
                        <div className="relative">
                          <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full ${
                              stat.changeType === 'positive' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {stat.change}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-sm opacity-70 mb-1">{stat.title}</p>
                            <p className="text-2xl font-bold text-gradient group-hover:scale-105 transition-transform duration-300">
                              {stat.value}
                            </p>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full bg-gradient-to-r ${stat.gradient}`}
                              initial={{ width: 0 }}
                              animate={{ width: '70%' }}
                              transition={{ delay: 0.5 + 0.1 * index, duration: 1 }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="glass rounded-2xl p-6 border border-white/10"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                اقدامات سریع
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mobile-grid-1">
                {[
                  { title: 'ایجاد دوره جدید', icon: Plus, action: () => setActiveSection('course-management') },
                  { title: 'مشاهده آمار', icon: BarChart3, action: () => setActiveSection('student-analytics') },
                  { title: 'ارسال اعلان', icon: Bell, action: () => setActiveSection('notifications') }
                ].map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={action.title}
                      onClick={action.action}
                      className="p-4 rounded-xl glass border border-white/10 hover:border-white/20 transition-all duration-300 hover-lift group btn-micro ripple"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className="w-6 h-6 mb-2 text-accent-500 group-hover:scale-110 transition-transform duration-300" />
                      <p className="font-medium">{action.title}</p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-500" style={{
      background: isDark 
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)'
    }}>
      <div className="flex relative">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, var(--accent-500) 0%, transparent 70%)'
            }}
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, var(--accent-600) 0%, transparent 70%)'
            }}
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0]
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>

        {/* Mobile Overlay */}
        <div 
          className={`mobile-overlay ${isMobileSidebarOpen ? 'active' : ''}`}
          onClick={() => setIsMobileSidebarOpen(false)}
        />
        
        {/* Enhanced Sidebar */}
        <motion.div 
          className={`w-80 relative z-10 mobile-sidebar ${isMobileSidebarOpen ? 'open' : ''}`}
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="h-screen glass-strong border-r border-white/10 backdrop-blur-xl">
            {/* Header */}
            <div className="p-8 border-b border-white/10">
              <motion.div 
                className="flex items-center justify-between"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl gradient-primary">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gradient">پنل مدیریت</h1>
                    <p className="text-sm opacity-70">داشبورد پیشرفته</p>
                  </div>
                </div>
                <ThemeToggle showAccentPicker={true} />
              </motion.div>
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-2">
              {navigationSections.map((section, index) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <motion.button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full group relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 hover-lift ${
                      isActive 
                        ? 'glass border-gradient shadow-lg' 
                        : 'hover:glass hover:border-white/20'
                    }`}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 * index, duration: 0.4 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Active Indicator */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 gradient-primary opacity-10 rounded-2xl"
                        layoutId="activeSection"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    
                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-2xl" 
                         style={{ background: 'radial-gradient(circle at center, var(--accent-500) 0%, transparent 70%)' }} />
                    
                    <div className="relative flex items-center gap-4">
                      <div className={`p-2 rounded-xl transition-all duration-300 ${
                        isActive 
                          ? 'gradient-primary text-white shadow-lg' 
                          : 'bg-white/10 group-hover:bg-white/20'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold transition-colors duration-300 ${
                          isActive ? 'text-gradient' : 'group-hover:text-white'
                        }`}>
                          {section.name}
                        </div>
                        <div className="text-sm opacity-60 group-hover:opacity-80 transition-opacity duration-300">
                          {section.description}
                        </div>
                      </div>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="w-2 h-2 rounded-full gradient-primary"
                        />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </nav>

            {/* Footer Stats */}
            <motion.div 
              className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Activity className="w-5 h-5 text-green-400" />
                  <span className="font-medium">وضعیت سیستم</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">کاربران آنلاین</span>
                    <span className="font-semibold text-green-400">247</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">عملکرد سرور</span>
                    <span className="font-semibold text-blue-400">98.5%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Enhanced Main Content */}
        <motion.div 
          className="flex-1 relative z-10 flex flex-col"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {/* Mobile Header */}
          <div className="md:hidden bg-white/10 backdrop-blur-xl border-b border-white/20 p-4 flex items-center justify-between">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors touch-target"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">EdLingo Admin</h1>
            <ThemeToggle showAccentPicker={false} />
          </div>
          
          {/* Content Area */}
          <div className="flex-1 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {renderActiveSection()}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;