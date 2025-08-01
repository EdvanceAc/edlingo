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

const ComprehensiveAdminDashboard = () => {
  useEffect(() => {
    console.log('showCourseEditor changed to:', showCourseEditor);
  }, [showCourseEditor]);

  useEffect(() => {
    console.log('editingCourseId changed to:', editingCourseId);
  }, [editingCourseId]);
  const [activeSection, setActiveSection] = useState('course-management');
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

  // Enhanced Course Editor State
  const [showCourseEditor, setShowCourseEditor] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [courseTerms, setCourseTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [termLessons, setTermLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonMaterials, setLessonMaterials] = useState([]);

  // Student Analytics State
  const [students, setStudents] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({});
  
  // Content Management State
  const [contentModules, setContentModules] = useState([]);
  
  // Gamification State
  const [achievements, setAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  
  // User Management State
  const [users, setUsers] = useState([]);
  
  // AI Integration State
  const [aiInsights, setAiInsights] = useState([]);
  
  // Notifications State
  const [notifications, setNotifications] = useState([]);

  // Navigation sections
  const navigationSections = [
    {
      id: 'overview',
      name: 'Overview',
      description: 'Dashboard summary',
      icon: BarChart3
    },
    {
      id: 'course-management',
      name: 'Course Management',
      description: 'Create and manage courses',
      icon: BookOpen
    },
    {
      id: 'student-analytics',
      name: 'Student Analytics',
      description: 'Track student progress',
      icon: Users
    },
    {
      id: 'content-management',
      name: 'Content Management',
      description: 'Manage learning materials',
      icon: FileText
    },
    {
      id: 'gamification',
      name: 'Gamification',
      description: 'Achievements and rewards',
      icon: Trophy
    },
    {
      id: 'user-management',
      name: 'User Management',
      description: 'Manage users and roles',
      icon: Shield
    },
    {
      id: 'advanced-analytics',
      name: 'Advanced Analytics',
      description: 'Detailed insights',
      icon: TrendingUp
    },
    {
      id: 'ai-integration',
      name: 'AI Integration',
      description: 'AI-powered features',
      icon: Brain
    }
  ];

  // Overview Dashboard Component
  const OverviewDashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Dashboard Overview</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold">24</p>
                <p className="text-xs text-green-600">+12% from last month</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">1,247</p>
                <p className="text-xs text-green-600">+8% from last month</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Instructors</p>
                <p className="text-2xl font-bold">18</p>
                <p className="text-xs text-blue-600">+2 new this month</p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">87%</p>
                <p className="text-xs text-green-600">+5% from last month</p>
              </div>
              <Target className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Engagement</p>
                <p className="text-2xl font-bold">92%</p>
                <p className="text-xs text-green-600">+3% from last month</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">$12,450</p>
                <p className="text-xs text-green-600">+15% from last month</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="h-20 flex flex-col gap-2" onClick={() => setActiveSection('course-management')}>
              <Plus className="w-6 h-6" />
              Create Course
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Users className="w-6 h-6" />
              Add Students
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Brain className="w-6 h-6" />
              Generate Content
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <BarChart3 className="w-6 h-6" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: 'New student enrolled', course: 'Spanish Basics', time: '2 hours ago', type: 'enrollment' },
                { action: 'Course completed', course: 'French Grammar', time: '4 hours ago', type: 'completion' },
                { action: 'New lesson added', course: 'German Vocabulary', time: '6 hours ago', type: 'content' },
                { action: 'Achievement unlocked', course: 'Italian Pronunciation', time: '8 hours ago', type: 'achievement' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'enrollment' ? 'bg-green-500' :
                    activity.type === 'completion' ? 'bg-blue-500' :
                    activity.type === 'content' ? 'bg-purple-500' : 'bg-yellow-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.course}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Course Completion Rate</span>
                  <span>87%</span>
                </div>
                <Progress value={87} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Student Engagement</span>
                  <span>92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Content Quality Score</span>
                  <span>95%</span>
                </div>
                <Progress value={95} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Instructor Satisfaction</span>
                  <span>89%</span>
                </div>
                <Progress value={89} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Course Management Component
  const CourseManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Course Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button size="sm" onClick={() => setShowCourseForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
        </div>
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
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{course.title || course.name}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{course.language || 'N/A'}</Badge>
                    <Badge variant="secondary">{course.level || 'N/A'}</Badge>
                    <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                      {course.status || 'active'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      console.log('Edit button clicked for course:', course.id);
                      console.log('Current showCourseEditor:', showCourseEditor);
                      console.log('Setting editingCourseId to:', course.id);
                      setEditingCourseId(course.id);
                      console.log('Setting showCourseEditor to true');
                      setShowCourseEditor(true);
                      console.log('Calling loadCourseTerms with:', course.id);
                      loadCourseTerms(course.id);
                      setTimeout(() => {
                        console.log('After setState - showCourseEditor:', showCourseEditor);
                        console.log('After setState - editingCourseId:', editingCourseId);
                      }, 0);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Students: {course.students || 0}</span>
                  <span>Instructor: {course.instructor || 'N/A'}</span>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Completion Rate</span>
                    <span>{course.completion || 0}%</span>
                  </div>
                  <Progress value={course.completion || 0} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground">Last updated: {course.lastUpdated || course.updated_at || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Course Editor Component
  const CourseEditor = () => {
    const [newTermName, setNewTermName] = useState('');
    const [newTermDescription, setNewTermDescription] = useState('');
    const [newLessonName, setNewLessonName] = useState('');
    const [newLessonLevel, setNewLessonLevel] = useState('beginner');
    const [newMaterialType, setNewMaterialType] = useState('text');
    const [newMaterialContent, setNewMaterialContent] = useState('');
    const [newMaterialUrl, setNewMaterialUrl] = useState('');

    const handleCreateTerm = async () => {
      if (!newTermName.trim()) return;
      
      const termData = {
        name: newTermName,
        description: newTermDescription,
        order_number: courseTerms.length + 1
      };
      
      await createTerm(editingCourseId, termData);
      setNewTermName('');
      setNewTermDescription('');
    };

    const handleCreateLesson = async () => {
      if (!newLessonName.trim() || !selectedTerm) return;
      
      const lessonData = {
        name: newLessonName,
        level: newLessonLevel,
        required_xp: 0,
        prerequisites: [],
        content: {}
      };
      
      await createLesson(selectedTerm.id, lessonData);
      setNewLessonName('');
      setNewLessonLevel('beginner');
    };

    const handleCreateMaterial = async () => {
      if (!selectedLesson || (!newMaterialContent.trim() && !newMaterialUrl.trim())) return;
      
      const materialData = {
        type: newMaterialType,
        url: newMaterialUrl || null,
        content: newMaterialContent || null,
        metadata: {}
      };
      
      await createMaterial(selectedLesson.id, materialData);
      setNewMaterialType('text');
      setNewMaterialContent('');
      setNewMaterialUrl('');
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Edit Course</h2>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCourseEditor(false);
                setEditingCourseId(null);
                setSelectedTerm(null);
                setSelectedLesson(null);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Terms (Sections) Column */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Course Sections</h3>
                <Button size="sm" onClick={handleCreateTerm}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Section
                </Button>
              </div>
              
              {/* Add New Term Form */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Section name"
                    value={newTermName}
                    onChange={(e) => setNewTermName(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                  <textarea
                    placeholder="Section description"
                    value={newTermDescription}
                    onChange={(e) => setNewTermDescription(e.target.value)}
                    className="w-full p-2 border rounded h-20"
                  />
                </CardContent>
              </Card>

              {/* Terms List */}
              <div className="space-y-2">
                {courseTerms.map((term) => (
                  <Card 
                    key={term.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedTerm?.id === term.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedTerm(term);
                      loadTermLessons(term.id);
                      setSelectedLesson(null);
                    }}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium">{term.name}</h4>
                      <p className="text-sm text-gray-600">{term.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Lessons Column */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Lessons</h3>
                <Button 
                  size="sm" 
                  onClick={handleCreateLesson}
                  disabled={!selectedTerm}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Lesson
                </Button>
              </div>

              {selectedTerm && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <input
                      type="text"
                      placeholder="Lesson name"
                      value={newLessonName}
                      onChange={(e) => setNewLessonName(e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                    <select
                      value={newLessonLevel}
                      onChange={(e) => setNewLessonLevel(e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </CardContent>
                </Card>
              )}

              {/* Lessons List */}
              <div className="space-y-2">
                {termLessons.map((lesson) => (
                  <Card 
                    key={lesson.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedLesson?.id === lesson.id ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedLesson(lesson);
                      loadLessonMaterials(lesson.id);
                    }}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium">{lesson.name}</h4>
                      <Badge variant="outline">{lesson.level}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Materials Column */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Materials</h3>
                <Button 
                  size="sm" 
                  onClick={handleCreateMaterial}
                  disabled={!selectedLesson}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Material
                </Button>
              </div>

              {selectedLesson && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <select
                      value={newMaterialType}
                      onChange={(e) => setNewMaterialType(e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="text">Text</option>
                      <option value="audio">Audio</option>
                      <option value="video">Video</option>
                      <option value="image">Image</option>
                      <option value="exercise">Exercise</option>
                    </select>
                    
                    {newMaterialType === 'text' || newMaterialType === 'exercise' ? (
                      <textarea
                        placeholder="Material content"
                        value={newMaterialContent}
                        onChange={(e) => setNewMaterialContent(e.target.value)}
                        className="w-full p-2 border rounded h-32"
                      />
                    ) : (
                      <input
                        type="url"
                        placeholder="Material URL"
                        value={newMaterialUrl}
                        onChange={(e) => setNewMaterialUrl(e.target.value)}
                        className="w-full p-2 border rounded"
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Materials List */}
              <div className="space-y-2">
                {lessonMaterials.map((material) => (
                  <Card key={material.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="outline">{material.type}</Badge>
                          {material.content && (
                            <p className="text-sm mt-1 text-gray-600">
                              {material.content.substring(0, 100)}...
                            </p>
                          )}
                          {material.url && (
                            <a 
                              href={material.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-500 text-sm hover:underline"
                            >
                              View Resource
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Student Analytics Component
  const StudentAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Student Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">1,247</p>
            <p className="text-sm text-green-600">+8% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">67%</p>
            <Progress value={67} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">87%</p>
            <p className="text-sm text-green-600">+5% from last month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Content Management Component
  const ContentManagement = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Content Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Learning Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Manage course content, lessons, and resources</p>
            <Button className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Content
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assessment Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Create and manage quizzes and assignments</p>
            <Button className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Gamification Management Component
  const GamificationManagement = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Gamification</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">24</p>
            <p className="text-sm text-muted-foreground">Total achievements</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Badges Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">156</p>
            <p className="text-sm text-green-600">+12 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Top performing students</p>
            <Button className="mt-2" size="sm">
              View Full Leaderboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // User Management Component
  const UserManagement = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">User Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">1,247</p>
            <p className="text-sm text-muted-foreground">Active students</p>
            <Button className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Instructors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">18</p>
            <p className="text-sm text-muted-foreground">Active instructors</p>
            <Button className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Instructor
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Advanced Analytics Component
  const AdvancedAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Advanced Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Learning Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Analyze student learning behaviors and patterns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Detailed performance analytics and insights</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // AI Integration Component
  const AIIntegration = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">AI Integration</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Content Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <p>AI-powered content creation and optimization</p>
            <Button className="mt-4">
              <Brain className="w-4 h-4 mr-2" />
              Generate Content
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Personalized Learning</CardTitle>
          </CardHeader>
          <CardContent>
            <p>AI-driven personalized learning paths</p>
            <Button className="mt-4">
              <Lightbulb className="w-4 h-4 mr-2" />
              View Insights
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

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
      
      setNotifications(prev => [{
        id: Date.now(),
        type: 'success',
        message: 'Course created successfully!',
        timestamp: new Date().toISOString()
      }, ...prev]);
    } catch (error) {
      console.error('Error creating course:', error);
      setNotifications(prev => [{
        id: Date.now(),
        type: 'error',
        message: 'Failed to create course. Please try again.',
        timestamp: new Date().toISOString()
      }, ...prev]);
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
      
      setNotifications(prev => [{
        id: Date.now(),
        type: 'success',
        message: 'Course updated successfully!',
        timestamp: new Date().toISOString()
      }, ...prev]);
    } catch (error) {
      console.error('Error updating course:', error);
      setNotifications(prev => [{
        id: Date.now(),
        type: 'error',
        message: 'Failed to update course. Please try again.',
        timestamp: new Date().toISOString()
      }, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCourse = async (courseId) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      
      if (error) throw error;
      
      setCourses(prev => prev.filter(course => course.id !== courseId));
      
      setNotifications(prev => [{
        id: Date.now(),
        type: 'success',
        message: 'Course deleted successfully!',
        timestamp: new Date().toISOString()
      }, ...prev]);
    } catch (error) {
      console.error('Error deleting course:', error);
      setNotifications(prev => [{
        id: Date.now(),
        type: 'error',
        message: 'Failed to delete course. Please try again.',
        timestamp: new Date().toISOString()
      }, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourseTerms = async (courseId) => {
    try {
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .eq('course_id', courseId)
        .order('order_number', { ascending: true });
      
      if (error) {
        console.error('Error loading course terms:', error);
        return;
      }
      
      setCourseTerms(data || []);
    } catch (error) {
      console.error('Error loading course terms:', error);
    }
  };

  const loadTermLessons = async (termId) => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('term_id', termId)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error loading term lessons:', error);
        return;
      }
      
      setTermLessons(data || []);
    } catch (error) {
      console.error('Error loading term lessons:', error);
    }
  };

  const loadLessonMaterials = async (lessonId) => {
    try {
      const { data, error } = await supabase
        .from('lesson_materials')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error loading lesson materials:', error);
        return;
      }
      
      setLessonMaterials(data || []);
    } catch (error) {
      console.error('Error loading lesson materials:', error);
    }
  };

  const createTerm = async (courseId, termData) => {
    try {
      const { data, error } = await supabase
        .from('terms')
        .insert([{
          ...termData,
          course_id: courseId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      
      setCourseTerms(prev => [...prev, data[0]]);
    } catch (error) {
      console.error('Error creating term:', error);
    }
  };

  const createLesson = async (termId, lessonData) => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .insert([{
          ...lessonData,
          term_id: termId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      
      setTermLessons(prev => [...prev, data[0]]);
    } catch (error) {
      console.error('Error creating lesson:', error);
    }
  };

  const createMaterial = async (lessonId, materialData) => {
    try {
      const { data, error } = await supabase
        .from('lesson_materials')
        .insert([{
          ...materialData,
          lesson_id: lessonId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      
      setLessonMaterials(prev => [...prev, data[0]]);
    } catch (error) {
      console.error('Error creating material:', error);
    }
  };

  // Render active section
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewDashboard />;
      case 'course-management':
        return <CourseManagement />;
      case 'student-analytics':
        return <StudentAnalytics />;
      case 'content-management':
        return <ContentManagement />;
      case 'gamification':
        return <GamificationManagement />;
      case 'user-management':
        return <UserManagement />;
      case 'advanced-analytics':
        return <AdvancedAnalytics />;
      case 'ai-integration':
        return <AIIntegration />;
      default:
        return <OverviewDashboard />;
    }
  };

  // Load courses when course management section is active
  useEffect(() => {
    if (activeSection === 'course-management') {
      loadCourses();
    }
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">EdLingo Admin Dashboard</h1>
              <Badge variant="outline">Comprehensive Course Management</Badge>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-2">
              {navigationSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{section.name}</div>
                        <div className="text-xs opacity-70">{section.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderActiveSection()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Course Editor Modal */}
      {showCourseEditor && (
        <div>
          {console.log('CourseEditor is rendering, showCourseEditor:', showCourseEditor, 'editingCourseId:', editingCourseId)}
          <CourseEditor />
        </div>
      )}
    </div>
  );
};

export default ComprehensiveAdminDashboard;