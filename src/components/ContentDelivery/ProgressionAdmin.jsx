// Progression System Admin Interface
// Comprehensive admin panel for managing content delivery and progression rules

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { 
  Settings, 
  Users, 
  BookOpen, 
  Target, 
  Clock, 
  MessageCircle, 
  BarChart3, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  RefreshCw, 
  Download, 
  Upload, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  Filter, 
  Search,
  Calendar,
  Award,
  Lock,
  Unlock,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import progressionService from '../../services/progressionService';
import conversationEngagementService from '../../services/conversationEngagementService';
import { runMCP } from '../../utils/mcpClient';

const ProgressionAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState([]);
  const [learningPaths, setLearningPaths] = useState([]);
  const [progressionRules, setProgressionRules] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    completedModules: 0,
    averageProgress: 0,
    engagementRate: 0
  });
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  
  // Form states
  const [editingModule, setEditingModule] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [newModuleForm, setNewModuleForm] = useState({
    title: '',
    description: '',
    language: 'spanish',
    level: 1,
    content: '',
    estimatedDuration: 30,
    tags: '',
    isActive: true
  });
  const [newRuleForm, setNewRuleForm] = useState({
    moduleId: '',
    ruleType: 'score_threshold',
    parameters: {},
    isActive: true
  });

  // Load initial data
  useEffect(() => {
    loadAdminData();
  }, []);

  // Load all admin data
  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Load modules
      const modulesData = await runMCP('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: '/content_modules?select=*&order=created_at.desc'
      });
      setModules(modulesData || []);
      
      // Load learning paths
      const pathsData = await runMCP('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: '/learning_paths?select=*,content_modules(*),user_learning_paths(count)&order=created_at.desc'
      });
      setLearningPaths(pathsData || []);
      
      // Load progression rules
      const rulesData = await runMCP('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: '/progression_rules?select=*,content_modules(title)&order=created_at.desc'
      });
      setProgressionRules(rulesData || []);
      
      // Load user progress summary
      const progressData = await runMCP('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: '/user_module_progress?select=*,user_profiles(username),content_modules(title)&order=updated_at.desc&limit=100'
      });
      setUserProgress(progressData || []);
      
      // Load system statistics
      await loadSystemStats();
      
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load system statistics
  const loadSystemStats = async () => {
    try {
      // Get user counts
      const userStats = await runMCP('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: '/user_profiles?select=id,last_active_at'
      });
      
      const totalUsers = userStats?.length || 0;
      const activeUsers = userStats?.filter(u => {
        const lastActive = new Date(u.last_active_at);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return lastActive > weekAgo;
      }).length || 0;
      
      // Get completion stats
      const completionStats = await runMCP('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: '/user_module_progress?select=status,progress_percentage'
      });
      
      const completedModules = completionStats?.filter(p => p.status === 'completed').length || 0;
      const averageProgress = completionStats?.length > 0 
        ? Math.round(completionStats.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / completionStats.length)
        : 0;
      
      // Get engagement stats
      const engagementStats = await runMCP('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: '/conversation_engagement?select=engagement_score'
      });
      
      const engagementRate = engagementStats?.length > 0
        ? Math.round(engagementStats.reduce((sum, e) => sum + (e.engagement_score || 0), 0) / engagementStats.length)
        : 0;
      
      setSystemStats({
        totalUsers,
        activeUsers,
        completedModules,
        averageProgress,
        engagementRate
      });
      
    } catch (error) {
      console.error('Failed to load system stats:', error);
    }
  };

  // Create new module
  const createModule = async () => {
    try {
      setLoading(true);
      
      const moduleData = {
        ...newModuleForm,
        tags: newModuleForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        content: {
          sections: [
            {
              title: 'Introduction',
              content: newModuleForm.content,
              type: 'text'
            }
          ]
        }
      };
      
      await runMCP('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'POST',
        path: '/content_modules',
        body: moduleData
      });
      
      // Reset form
      setNewModuleForm({
        title: '',
        description: '',
        language: 'spanish',
        level: 1,
        content: '',
        estimatedDuration: 30,
        tags: '',
        isActive: true
      });
      
      // Reload data
      await loadAdminData();
      
      toast({
        title: "Success",
        description: "Module created successfully.",
        variant: "default"
      });
      
    } catch (error) {
      console.error('Failed to create module:', error);
      toast({
        title: "Error",
        description: "Failed to create module. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Update module
  const updateModule = async (moduleId, updates) => {
    try {
      setLoading(true);
      
      await runMCP('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'PATCH',
        path: `/content_modules?id=eq.${moduleId}`,
        body: updates
      });
      
      await loadAdminData();
      setEditingModule(null);
      
      toast({
        title: "Success",
        description: "Module updated successfully.",
        variant: "default"
      });
      
    } catch (error) {
      console.error('Failed to update module:', error);
      toast({
        title: "Error",
        description: "Failed to update module. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete module
  const deleteModule = async (moduleId) => {
    if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      await runMCP('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'DELETE',
        path: `/content_modules?id=eq.${moduleId}`
      });
      
      await loadAdminData();
      
      toast({
        title: "Success",
        description: "Module deleted successfully.",
        variant: "default"
      });
      
    } catch (error) {
      console.error('Failed to delete module:', error);
      toast({
        title: "Error",
        description: "Failed to delete module. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Create progression rule
  const createProgressionRule = async () => {
    try {
      setLoading(true);
      
      await runMCP('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'POST',
        path: '/progression_rules',
        body: newRuleForm
      });
      
      // Reset form
      setNewRuleForm({
        moduleId: '',
        ruleType: 'score_threshold',
        parameters: {},
        isActive: true
      });
      
      await loadAdminData();
      
      toast({
        title: "Success",
        description: "Progression rule created successfully.",
        variant: "default"
      });
      
    } catch (error) {
      console.error('Failed to create progression rule:', error);
      toast({
        title: "Error",
        description: "Failed to create progression rule. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset user progress
  const resetUserProgress = async (userId, moduleId) => {
    if (!confirm('Are you sure you want to reset this user\'s progress? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      await runMCP('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'PATCH',
        path: `/user_module_progress?user_id=eq.${userId}&module_id=eq.${moduleId}`,
        body: {
          status: 'not_started',
          progress_percentage: 0,
          score: null,
          completed_at: null,
          updated_at: new Date().toISOString()
        }
      });
      
      await loadAdminData();
      
      toast({
        title: "Success",
        description: "User progress reset successfully.",
        variant: "default"
      });
      
    } catch (error) {
      console.error('Failed to reset user progress:', error);
      toast({
        title: "Error",
        description: "Failed to reset user progress. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Export system data
  const exportData = async () => {
    try {
      const exportData = {
        modules,
        learningPaths,
        progressionRules,
        userProgress: userProgress.slice(0, 1000), // Limit for performance
        systemStats,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edlingo-progression-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Data exported successfully.",
        variant: "default"
      });
      
    } catch (error) {
      console.error('Failed to export data:', error);
      toast({
        title: "Error",
        description: "Failed to export data. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Filter functions
  const filteredModules = modules.filter(module => {
    const matchesSearch = module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = filterLanguage === 'all' || module.language === filterLanguage;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && module.is_active) ||
                         (filterStatus === 'inactive' && !module.is_active);
    
    return matchesSearch && matchesLanguage && matchesStatus;
  });

  const filteredUserProgress = userProgress.filter(progress => {
    const matchesSearch = progress.user_profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         progress.content_modules?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || progress.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Progression System Admin</h1>
          <p className="text-gray-600">Manage content delivery and user progression</p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          
          <Button onClick={loadAdminData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{systemStats.activeUsers}</div>
                <div className="text-sm text-gray-600">Active Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{systemStats.completedModules}</div>
                <div className="text-sm text-gray-600">Completed Modules</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{systemStats.averageProgress}%</div>
                <div className="text-sm text-gray-600">Avg Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-8 w-8 text-pink-600" />
              <div>
                <div className="text-2xl font-bold">{systemStats.engagementRate}%</div>
                <div className="text-sm text-gray-600">Engagement Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="rules">Progression Rules</TabsTrigger>
          <TabsTrigger value="users">User Progress</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userProgress.slice(0, 5).map((progress, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{progress.user_profiles?.username || 'Unknown User'}</div>
                        <div className="text-sm text-gray-600">{progress.content_modules?.title || 'Unknown Module'}</div>
                      </div>
                      <Badge variant={progress.status === 'completed' ? 'default' : 'secondary'}>
                        {progress.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Active Modules</span>
                      <span>{modules.filter(m => m.is_active).length}/{modules.length}</span>
                    </div>
                    <Progress value={(modules.filter(m => m.is_active).length / Math.max(modules.length, 1)) * 100} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>User Engagement</span>
                      <span>{systemStats.engagementRate}%</span>
                    </div>
                    <Progress value={systemStats.engagementRate} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completion Rate</span>
                      <span>{systemStats.averageProgress}%</span>
                    </div>
                    <Progress value={systemStats.averageProgress} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <Input
                    placeholder="Search modules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="german">German</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          {/* Create New Module */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Module</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Module Title"
                  value={newModuleForm.title}
                  onChange={(e) => setNewModuleForm(prev => ({ ...prev, title: e.target.value }))}
                />
                
                <Select 
                  value={newModuleForm.language} 
                  onValueChange={(value) => setNewModuleForm(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spanish">Spanish</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="german">German</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input
                  type="number"
                  placeholder="Level (1-5)"
                  value={newModuleForm.level}
                  onChange={(e) => setNewModuleForm(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                  min="1"
                  max="5"
                />
                
                <Input
                  type="number"
                  placeholder="Duration (minutes)"
                  value={newModuleForm.estimatedDuration}
                  onChange={(e) => setNewModuleForm(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 30 }))}
                />
                
                <div className="md:col-span-2">
                  <Textarea
                    placeholder="Module Description"
                    value={newModuleForm.description}
                    onChange={(e) => setNewModuleForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Textarea
                    placeholder="Module Content"
                    value={newModuleForm.content}
                    onChange={(e) => setNewModuleForm(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                  />
                </div>
                
                <Input
                  placeholder="Tags (comma-separated)"
                  value={newModuleForm.tags}
                  onChange={(e) => setNewModuleForm(prev => ({ ...prev, tags: e.target.value }))}
                />
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newModuleForm.isActive}
                    onCheckedChange={(checked) => setNewModuleForm(prev => ({ ...prev, isActive: checked }))}
                  />
                  <span>Active</span>
                </div>
              </div>
              
              <div className="mt-4">
                <Button onClick={createModule} disabled={loading || !newModuleForm.title}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Module
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Modules List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredModules.map((module) => (
              <Card key={module.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant={module.is_active ? 'default' : 'secondary'}>
                        {module.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">Level {module.level}</Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-gray-600 mb-4">{module.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{module.language}</span>
                    <span>{module.estimated_duration_minutes} min</span>
                  </div>
                  
                  {module.tags && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {module.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingModule(module)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateModule(module.id, { is_active: !module.is_active })}
                    >
                      {module.is_active ? <PauseCircle className="h-4 w-4 mr-1" /> : <PlayCircle className="h-4 w-4 mr-1" />}
                      {module.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteModule(module.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Progression Rules Tab */}
        <TabsContent value="rules" className="space-y-6">
          {/* Create New Rule */}
          <Card>
            <CardHeader>
              <CardTitle>Create Progression Rule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select 
                  value={newRuleForm.moduleId} 
                  onValueChange={(value) => setNewRuleForm(prev => ({ ...prev, moduleId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={newRuleForm.ruleType} 
                  onValueChange={(value) => setNewRuleForm(prev => ({ ...prev, ruleType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rule Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score_threshold">Score Threshold</SelectItem>
                    <SelectItem value="conversation_requirement">Conversation Requirement</SelectItem>
                    <SelectItem value="time_gate">Time Gate</SelectItem>
                    <SelectItem value="prerequisite">Prerequisite</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newRuleForm.isActive}
                    onCheckedChange={(checked) => setNewRuleForm(prev => ({ ...prev, isActive: checked }))}
                  />
                  <span>Active</span>
                </div>
              </div>
              
              <div className="mt-4">
                <Button onClick={createProgressionRule} disabled={loading || !newRuleForm.moduleId}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Rules List */}
          <div className="space-y-4">
            {progressionRules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{rule.content_modules?.title || 'Unknown Module'}</div>
                      <div className="text-sm text-gray-600">
                        Type: {rule.rule_type} | 
                        Parameters: {JSON.stringify(rule.parameters)}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* User Progress Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <Input
                    placeholder="Search users or modules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          {/* Progress List */}
          <div className="space-y-4">
            {filteredUserProgress.map((progress, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="font-medium">{progress.user_profiles?.username || 'Unknown User'}</div>
                          <div className="text-sm text-gray-600">{progress.content_modules?.title || 'Unknown Module'}</div>
                        </div>
                        
                        <div className="flex-1 max-w-xs">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{progress.progress_percentage || 0}%</span>
                          </div>
                          <Progress value={progress.progress_percentage || 0} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        progress.status === 'completed' ? 'default' :
                        progress.status === 'in_progress' ? 'secondary' :
                        progress.status === 'locked' ? 'destructive' : 'outline'
                      }>
                        {progress.status}
                      </Badge>
                      
                      {progress.score && (
                        <Badge variant="outline">
                          Score: {progress.score}%
                        </Badge>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => resetUserProgress(progress.user_id, progress.module_id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProgressionAdmin;