// Content Delivery & Progression System - Main Integration Component
// Unified interface for the complete content delivery and progression system

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { 
  BookOpen, 
  Users, 
  Settings, 
  MessageCircle, 
  Target, 
  TrendingUp, 
  Award, 
  Clock, 
  CheckCircle, 
  Lock, 
  Play, 
  BarChart3,
  Brain,
  Zap,
  Globe,
  Star,
  Calendar,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import useProgression from '../../hooks/useProgression';

// Import all content delivery components
import ContentDeliveryDashboard from './ContentDeliveryDashboard';
import ModuleContent from './ModuleContent';
import AssignmentSystem from './AssignmentSystem';
import TestSystem from './TestSystem';
import ConversationTracker from './ConversationTracker';
import ProgressionAdmin from './ProgressionAdmin';

const ContentDeliverySystem = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    modules,
    userProgress,
    conversationRequirements,
    learningPaths,
    loading,
    initializeProgression,
    startModule,
    updateModuleProgress,
    startConversationSession,
    endConversationSession
  } = useProgression();
  
  // State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [conversationSession, setConversationSession] = useState(null);
  const [systemStats, setSystemStats] = useState({
    totalModules: 0,
    completedModules: 0,
    currentStreak: 0,
    totalPoints: 0,
    currentLevel: 1,
    nextLevelProgress: 0
  });
  const [userRole, setUserRole] = useState('student'); // student, teacher, admin

  // Initialize system
  useEffect(() => {
    if (user) {
      initializeProgression();
      loadUserStats();
      determineUserRole();
    }
  }, [user]);

  // Load user statistics
  const loadUserStats = async () => {
    try {
      // Calculate user statistics from progression data
      const totalModules = modules.length;
      const completedModules = userProgress.filter(p => p.status === 'completed').length;
      const totalPoints = userProgress.reduce((sum, p) => sum + (p.score || 0), 0);
      
      // Calculate current level based on points
      const currentLevel = Math.floor(totalPoints / 1000) + 1;
      const nextLevelProgress = (totalPoints % 1000) / 10; // Convert to percentage
      
      // Calculate streak (simplified - consecutive days with activity)
      const currentStreak = 7; // Placeholder - would need actual activity tracking
      
      setSystemStats({
        totalModules,
        completedModules,
        currentStreak,
        totalPoints,
        currentLevel,
        nextLevelProgress
      });
      
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  // Determine user role
  const determineUserRole = () => {
    // In a real app, this would come from user profile/permissions
    // For demo purposes, we'll use a simple check
    if (user?.email?.includes('admin')) {
      setUserRole('admin');
    } else if (user?.email?.includes('teacher')) {
      setUserRole('teacher');
    } else {
      setUserRole('student');
    }
  };

  // Handle module selection
  const handleModuleSelect = async (module) => {
    try {
      setSelectedModule(module);
      
      // Check if module is available
      const moduleProgress = userProgress.find(p => p.module_id === module.id);
      
      if (!moduleProgress || moduleProgress.status === 'locked') {
        toast({
          title: "Module Locked",
          description: "Complete previous requirements to unlock this module.",
          variant: "destructive"
        });
        return;
      }
      
      // Start module if not started
      if (moduleProgress.status === 'not_started') {
        await startModule(module.id);
      }
      
      setActiveTab('content');
      
    } catch (error) {
      console.error('Failed to select module:', error);
      toast({
        title: "Error",
        description: "Failed to load module. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle assignment selection
  const handleAssignmentSelect = (assignment) => {
    setSelectedAssignment(assignment);
    setActiveTab('assignment');
  };

  // Handle test selection
  const handleTestSelect = (test) => {
    setSelectedTest(test);
    setActiveTab('test');
  };

  // Handle conversation start
  const handleConversationStart = async (moduleId, requirements) => {
    try {
      const session = await startConversationSession(moduleId, requirements);
      setConversationSession(session);
      setActiveTab('conversation');
      
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle conversation completion
  const handleConversationComplete = async (sessionData) => {
    try {
      await endConversationSession(conversationSession.id, sessionData);
      setConversationSession(null);
      
      // Refresh progression data
      await initializeProgression();
      
      toast({
        title: "Conversation Completed",
        description: "Great job! Your conversation requirements have been met.",
        variant: "default"
      });
      
      setActiveTab('dashboard');
      
    } catch (error) {
      console.error('Failed to complete conversation:', error);
      toast({
        title: "Error",
        description: "Failed to complete conversation. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle module completion
  const handleModuleComplete = async (moduleId, completionData) => {
    try {
      await updateModuleProgress(moduleId, {
        status: 'completed',
        progress_percentage: 100,
        score: completionData.score,
        completed_at: new Date().toISOString()
      });
      
      // Refresh stats
      await loadUserStats();
      
      toast({
        title: "Module Completed!",
        description: `Congratulations! You've completed the module with a score of ${completionData.score}%.`,
        variant: "default"
      });
      
      setActiveTab('dashboard');
      setSelectedModule(null);
      
    } catch (error) {
      console.error('Failed to complete module:', error);
      toast({
        title: "Error",
        description: "Failed to complete module. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle assignment completion
  const handleAssignmentComplete = async (assignmentId, completionData) => {
    try {
      // Update assignment progress
      await updateModuleProgress(selectedModule?.id, {
        assignment_scores: {
          [assignmentId]: completionData.score
        }
      });
      
      toast({
        title: "Assignment Completed!",
        description: `Assignment completed with a score of ${completionData.score}%.`,
        variant: "default"
      });
      
      setActiveTab('dashboard');
      setSelectedAssignment(null);
      
    } catch (error) {
      console.error('Failed to complete assignment:', error);
      toast({
        title: "Error",
        description: "Failed to complete assignment. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle test completion
  const handleTestComplete = async (testId, completionData) => {
    try {
      // Update test progress
      await updateModuleProgress(selectedModule?.id, {
        test_scores: {
          [testId]: completionData.score
        }
      });
      
      toast({
        title: "Test Completed!",
        description: `Test completed with a score of ${completionData.score}%.`,
        variant: "default"
      });
      
      setActiveTab('dashboard');
      setSelectedTest(null);
      
    } catch (error) {
      console.error('Failed to complete test:', error);
      toast({
        title: "Error",
        description: "Failed to complete test. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Render user stats header
  const renderUserStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{systemStats.currentLevel}</div>
          <div className="text-sm text-gray-600">Level</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{systemStats.totalPoints}</div>
          <div className="text-sm text-gray-600">Points</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{systemStats.currentStreak}</div>
          <div className="text-sm text-gray-600">Day Streak</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{systemStats.completedModules}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-pink-600">{systemStats.totalModules}</div>
          <div className="text-sm text-gray-600">Total Modules</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-gray-600 mb-1">Next Level</div>
          <Progress value={systemStats.nextLevelProgress} className="h-2" />
          <div className="text-xs text-gray-500 mt-1">{Math.round(systemStats.nextLevelProgress)}%</div>
        </CardContent>
      </Card>
    </div>
  );

  // Render navigation tabs
  const renderTabs = () => {
    const studentTabs = [
      { value: 'dashboard', label: 'Dashboard', icon: BookOpen },
      { value: 'content', label: 'Content', icon: Play, disabled: !selectedModule },
      { value: 'assignment', label: 'Assignment', icon: Target, disabled: !selectedAssignment },
      { value: 'test', label: 'Test', icon: Award, disabled: !selectedTest },
      { value: 'conversation', label: 'Conversation', icon: MessageCircle, disabled: !conversationSession }
    ];
    
    const adminTabs = [
      ...studentTabs,
      { value: 'admin', label: 'Admin', icon: Settings }
    ];
    
    const tabs = userRole === 'admin' ? adminTabs : studentTabs;
    
    return (
      <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger 
              key={tab.value} 
              value={tab.value} 
              disabled={tab.disabled}
              className="flex items-center space-x-2"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading content delivery system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">EdLingo Learning Platform</h1>
          <p className="text-gray-600">Adaptive content delivery with progression tracking</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Globe className="h-3 w-3" />
            <span>Spanish</span>
          </Badge>
          
          <Badge variant="outline" className="flex items-center space-x-1">
            <Star className="h-3 w-3" />
            <span>Level {systemStats.currentLevel}</span>
          </Badge>
        </div>
      </div>

      {/* User Statistics */}
      {renderUserStats()}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {renderTabs()}

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <ContentDeliveryDashboard
            onModuleSelect={handleModuleSelect}
            onAssignmentSelect={handleAssignmentSelect}
            onTestSelect={handleTestSelect}
            onConversationStart={handleConversationStart}
            userStats={systemStats}
          />
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content">
          {selectedModule ? (
            <ModuleContent
              module={selectedModule}
              onComplete={handleModuleComplete}
              onBack={() => {
                setActiveTab('dashboard');
                setSelectedModule(null);
              }}
            />
          ) : (
            <Alert>
              <BookOpen className="h-4 w-4" />
              <AlertDescription>
                Please select a module from the dashboard to view its content.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Assignment Tab */}
        <TabsContent value="assignment">
          {selectedAssignment ? (
            <AssignmentSystem
              assignment={selectedAssignment}
              module={selectedModule}
              onComplete={handleAssignmentComplete}
              onBack={() => {
                setActiveTab('dashboard');
                setSelectedAssignment(null);
              }}
            />
          ) : (
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                Please select an assignment from the dashboard to begin.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test">
          {selectedTest ? (
            <TestSystem
              test={selectedTest}
              module={selectedModule}
              onComplete={handleTestComplete}
              onBack={() => {
                setActiveTab('dashboard');
                setSelectedTest(null);
              }}
            />
          ) : (
            <Alert>
              <Award className="h-4 w-4" />
              <AlertDescription>
                Please select a test from the dashboard to begin.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Conversation Tab */}
        <TabsContent value="conversation">
          {conversationSession ? (
            <ConversationTracker
              moduleId={conversationSession.moduleId}
              requiredEngagement={conversationSession.requirements?.minEngagement || 80}
              minTurns={conversationSession.requirements?.minTurns || 10}
              minDuration={conversationSession.requirements?.minDuration || 300}
              onEngagementMet={handleConversationComplete}
            />
          ) : (
            <Alert>
              <MessageCircle className="h-4 w-4" />
              <AlertDescription>
                Please start a conversation session from the dashboard.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Admin Tab */}
        {userRole === 'admin' && (
          <TabsContent value="admin">
            <ProgressionAdmin />
          </TabsContent>
        )}
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => setActiveTab('dashboard')}
            >
              <BookOpen className="h-6 w-6" />
              <span className="text-sm">Continue Learning</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => {
                const availableModule = modules.find(m => {
                  const progress = userProgress.find(p => p.module_id === m.id);
                  return progress && progress.status !== 'locked' && progress.status !== 'completed';
                });
                if (availableModule) {
                  handleModuleSelect(availableModule);
                }
              }}
            >
              <Play className="h-6 w-6" />
              <span className="text-sm">Start Module</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => {
                // Find a module that requires conversation
                const conversationModule = modules.find(m => {
                  const requirements = conversationRequirements.find(r => r.module_id === m.id);
                  return requirements && !requirements.completed;
                });
                if (conversationModule) {
                  const requirements = conversationRequirements.find(r => r.module_id === conversationModule.id);
                  handleConversationStart(conversationModule.id, requirements);
                }
              }}
            >
              <MessageCircle className="h-6 w-6" />
              <span className="text-sm">Practice Conversation</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => {
                initializeProgression();
                loadUserStats();
              }}
            >
              <RefreshCw className="h-6 w-6" />
              <span className="text-sm">Refresh Progress</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentDeliverySystem;