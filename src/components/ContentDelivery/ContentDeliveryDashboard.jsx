// Content Delivery Dashboard Component
// Displays available modules, progress, and handles sequential content unlocking

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Lock, 
  Unlock, 
  Play, 
  CheckCircle, 
  Clock, 
  MessageCircle, 
  BookOpen, 
  Target,
  TrendingUp,
  Award
} from 'lucide-react';
import progressionService from '../../services/progressionService';
import conversationEngagementService from '../../services/conversationEngagementService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';

const ContentDeliveryDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [modules, setModules] = useState([]);
  const [learningPaths, setLearningPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [userProgress, setUserProgress] = useState([]);
  const [conversationRequirements, setConversationRequirements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('modules');

  // Load user's content and progress
  const loadContent = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Get user's target language and CEFR level from profile
      const userProfile = await getUserProfile(user.id);
      const language = userProfile?.target_language || 'spanish';
      const cefrLevel = userProfile?.placement_level || 'A1';
      
      // Load available modules
      const availableModules = await progressionService.getAvailableModules(
        user.id, 
        language, 
        cefrLevel
      );
      setModules(availableModules);
      
      // Load user progress
      const progress = await progressionService.getUserProgress(user.id);
      setUserProgress(progress);
      
      // Check conversation requirements
      const convReqs = await conversationEngagementService.checkConversationRequirements(
        user.id,
        {
          minTotalTurns: 50,
          minEngagementScore: 70,
          minSessionCount: 5,
          timeframeDays: 30
        }
      );
      setConversationRequirements(convReqs);
      
    } catch (error) {
      console.error('Failed to load content:', error);
      toast({
        title: "Error",
        description: "Failed to load learning content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Get user profile helper
  const getUserProfile = async (userId) => {
    try {
      const response = await fetch(`/api/users/${userId}/profile`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  };

  // Start a module
  const startModule = async (moduleId) => {
    try {
      await progressionService.updateModuleProgress(user.id, moduleId, {
        status: 'in_progress',
        started_at: new Date().toISOString(),
        attempts: 1
      });
      
      // Navigate to module content
      window.location.href = `/learn/module/${moduleId}`;
      
    } catch (error) {
      console.error('Failed to start module:', error);
      toast({
        title: "Error",
        description: "Failed to start module. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Continue a module
  const continueModule = async (moduleId) => {
    try {
      await progressionService.updateModuleProgress(user.id, moduleId, {
        last_accessed_at: new Date().toISOString()
      });
      
      // Navigate to module content
      window.location.href = `/learn/module/${moduleId}`;
      
    } catch (error) {
      console.error('Failed to continue module:', error);
      toast({
        title: "Error",
        description: "Failed to continue module. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Get status icon for module
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Play className="h-5 w-5 text-blue-500" />;
      case 'available':
        return <Unlock className="h-5 w-5 text-yellow-500" />;
      case 'locked':
      default:
        return <Lock className="h-5 w-5 text-gray-400" />;
    }
  };

  // Get status color for badge
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'available':
        return 'bg-yellow-100 text-yellow-800';
      case 'locked':
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Render module card
  const renderModuleCard = (module) => {
    const isLocked = module.status === 'locked';
    const isCompleted = module.status === 'completed';
    const isInProgress = module.status === 'in_progress';
    const isAvailable = module.status === 'available';

    return (
      <Card key={module.id} className={`transition-all duration-200 hover:shadow-md ${
        isLocked ? 'opacity-60' : 'hover:scale-105'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(module.status)}
              <CardTitle className="text-lg">{module.title}</CardTitle>
            </div>
            <Badge className={getStatusColor(module.status)}>
              {module.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">{module.description}</p>
          
          {/* Progress bar */}
          {(isInProgress || isCompleted) && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{Math.round(module.progress || 0)}%</span>
              </div>
              <Progress value={module.progress || 0} className="h-2" />
            </div>
          )}
          
          {/* Module metadata */}
          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{module.estimated_duration_minutes} min</span>
            </div>
            <div className="flex items-center space-x-1">
              <Target className="h-4 w-4" />
              <span>Level {module.difficulty_score}/5</span>
            </div>
            {module.attempts > 0 && (
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4" />
                <span>{module.attempts} attempts</span>
              </div>
            )}
          </div>
          
          {/* Best score */}
          {module.bestScore && (
            <div className="flex items-center space-x-2 mb-4">
              <Award className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">Best Score: {module.bestScore}%</span>
            </div>
          )}
          
          {/* Action button */}
          <div className="flex space-x-2">
            {isAvailable && (
              <Button 
                onClick={() => startModule(module.id)}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Module
              </Button>
            )}
            
            {isInProgress && (
              <Button 
                onClick={() => continueModule(module.id)}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Continue
              </Button>
            )}
            
            {isCompleted && (
              <Button 
                onClick={() => continueModule(module.id)}
                variant="outline"
                className="flex-1"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Review
              </Button>
            )}
            
            {isLocked && (
              <Button disabled className="flex-1">
                <Lock className="h-4 w-4 mr-2" />
                Locked
              </Button>
            )}
          </div>
          
          {/* Lock reason */}
          {isLocked && module.lockReason && (
            <Alert className="mt-3">
              <AlertDescription className="text-sm">
                {module.lockReason}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render conversation requirements
  const renderConversationRequirements = () => {
    if (!conversationRequirements) return null;

    const { passed, checks, summary, recommendations } = conversationRequirements;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Conversation Requirements</span>
            {passed ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-500" />
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Overall status */}
            <Alert className={passed ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
              <AlertDescription>
                {passed 
                  ? 'You meet all conversation requirements for progression!' 
                  : 'Complete the requirements below to unlock advanced content.'}
              </AlertDescription>
            </Alert>
            
            {/* Individual checks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {checks.totalTurns?.actual || 0}
                </div>
                <div className="text-sm text-gray-600">Total Turns</div>
                <div className="text-xs text-gray-500">
                  Required: {checks.totalTurns?.required || 0}
                </div>
                {checks.totalTurns?.passed && (
                  <CheckCircle className="h-4 w-4 text-green-500 mx-auto mt-1" />
                )}
              </div>
              
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {checks.engagementScore?.actual || 0}%
                </div>
                <div className="text-sm text-gray-600">Engagement</div>
                <div className="text-xs text-gray-500">
                  Required: {checks.engagementScore?.required || 0}%
                </div>
                {checks.engagementScore?.passed && (
                  <CheckCircle className="h-4 w-4 text-green-500 mx-auto mt-1" />
                )}
              </div>
              
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {checks.sessionCount?.actual || 0}
                </div>
                <div className="text-sm text-gray-600">Sessions</div>
                <div className="text-xs text-gray-500">
                  Required: {checks.sessionCount?.required || 0}
                </div>
                {checks.sessionCount?.passed && (
                  <CheckCircle className="h-4 w-4 text-green-500 mx-auto mt-1" />
                )}
              </div>
            </div>
            
            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recommendations:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Learning Dashboard
        </h1>
        <p className="text-gray-600">
          Track your progress and unlock new content as you advance
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="modules">Learning Modules</TabsTrigger>
          <TabsTrigger value="progress">My Progress</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-6">
          {modules.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No modules available
                </h3>
                <p className="text-gray-600">
                  Complete your assessment to get personalized learning content.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map(renderModuleCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="text-center py-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {modules.filter(m => m.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Completed Modules</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="text-center py-6">
                <div className="text-3xl font-bold text-yellow-600 mb-2">
                  {modules.filter(m => m.status === 'in_progress').length}
                </div>
                <div className="text-sm text-gray-600">In Progress</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="text-center py-6">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {modules.filter(m => m.status === 'available').length}
                </div>
                <div className="text-sm text-gray-600">Available</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="text-center py-6">
                <div className="text-3xl font-bold text-gray-600 mb-2">
                  {modules.filter(m => m.status === 'locked').length}
                </div>
                <div className="text-sm text-gray-600">Locked</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Overall progress */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.map(module => (
                  <div key={module.id} className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{module.title}</span>
                        <span>{Math.round(module.progress || 0)}%</span>
                      </div>
                      <Progress value={module.progress || 0} className="h-2" />
                    </div>
                    {getStatusIcon(module.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          {renderConversationRequirements()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentDeliveryDashboard;