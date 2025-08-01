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
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../renderer/components/ui/Card';
import { Progress } from '../../renderer/components/ui/Progress';
import { Badge } from '../../renderer/components/ui/Badge';
import Button from '../../renderer/components/ui/Button';
import { supabase } from '../../renderer/config/supabaseConfig';

const EnhancedAdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
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
    is_active: false, // Use is_active instead of status
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

  // Course Management Functions
  const loadCourses = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
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
          completion: 82,
          is_active: false, // Use is_active instead of status
          lastUpdated: "3 days ago",
          instructor: "Hans Mueller",
          description: "Practice German conversation",
          price: 119,
          duration: "10 weeks"
        }
      ]);
    } finally {
      setIsLoading(false);
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
    }, ...prev.slice(0, 4)]); // Keep only 5 notifications
  };

  const resetCourseForm = () => {
    setCourseFormData({
      title: '',
      description: '',
      language: '',
      level: '',
      instructor: '',
      is_active: false, // Use is_active instead of status
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
      is_active: course.is_active || false, // Use is_active instead of status
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
      // In a real implementation, this would send notifications to users
      // For now, we'll simulate it
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
    if (activeSection === 'course-management') {
      loadCourses();
    }
  }, [activeSection]);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Course Management</h2>
          <p className="text-muted-foreground">Create, edit, and manage your language courses</p>
        </div>
        <div className="flex gap-2">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <PlayCircle className="w-8 h-8 text-green-500" />
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
                <p className="text-sm text-muted-foreground">Avg. Completion</p>
                <p className="text-2xl font-bold">
                  {courses.length > 0 ? Math.round(courses.reduce((sum, c) => sum + (c.completion || 0), 0) / courses.length) : 0}%
                </p>
              </div>
              <Target className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search courses..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Course Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses
            .filter(course => 
              course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              course.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
              course.instructor.toLowerCase().includes(searchTerm.toLowerCase())
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
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Dashboard Overview</h2>
              <div className="flex gap-2">
                <Button onClick={() => {
                  setActiveSection('course-management');
                  setShowCourseForm(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Course
                </Button>
                <Button variant="outline" onClick={() => setActiveSection('course-management')}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Manage Courses
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Courses</p>
                      <p className="text-2xl font-bold">24</p>
                    </div>
                    <BookOpen className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Students</p>
                      <p className="text-2xl font-bold">1,247</p>
                    </div>
                    <Users className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completion Rate</p>
                      <p className="text-2xl font-bold">78.5%</p>
                    </div>
                    <Target className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Revenue</p>
                      <p className="text-2xl font-bold">$15,420</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <div className="p-6">
            <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
          </div>
          <nav className="mt-6">
            {navigationSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-100 transition-colors ${
                    activeSection === section.id ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-600' : 'text-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <div>
                    <div className="font-medium">{section.name}</div>
                    <div className="text-xs text-gray-500">{section.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;