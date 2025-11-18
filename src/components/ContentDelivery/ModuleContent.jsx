// Module Content Component
// Displays learning module content with adaptive text simplification

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  ArrowLeft, 
  ArrowRight, 
  BookOpen, 
  Volume2, 
  Settings, 
  CheckCircle,
  Clock,
  Target,
  Lightbulb,
  MessageCircle,
  RotateCcw
} from 'lucide-react';
import { useProgression } from '../../hooks/useProgression';
import textSimplificationService from '../../services/textSimplification';
import { analyzeTextComplexity } from '../../utils/readability';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';

const ModuleContent = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const {
    getModule,
    updateModuleProgress,
    canAccessModule,
    loading: progressionLoading
  } = useProgression();

  // State
  const [module, setModule] = useState(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [simplifiedContent, setSimplifiedContent] = useState({});
  const [userLevel, setUserLevel] = useState('A1');
  const [contentLoading, setContentLoading] = useState(false);
  const [simplificationLevel, setSimplificationLevel] = useState('auto');
  const [readingProgress, setReadingProgress] = useState(0);
  const [sectionProgress, setSectionProgress] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [startTime, setStartTime] = useState(null);

  // Load module data
  useEffect(() => {
    const loadModule = async () => {
      if (!moduleId) return;
      
      // Check if user can access this module
      if (!canAccessModule(moduleId)) {
        toast({
          title: "Access Denied",
          description: "You don't have access to this module yet.",
          variant: "destructive"
        });
        navigate('/learn');
        return;
      }
      
      const moduleData = getModule(moduleId);
      if (!moduleData) {
        toast({
          title: "Module Not Found",
          description: "The requested module could not be found.",
          variant: "destructive"
        });
        navigate('/learn');
        return;
      }
      
      setModule(moduleData);
      setStartTime(Date.now());
      
      // Get user's proficiency level
      await loadUserLevel();
    };
    
    loadModule();
  }, [moduleId, getModule, canAccessModule, navigate, toast]);

  // Load user's proficiency level
  const loadUserLevel = async () => {
    try {
      const response = await fetch(`/api/users/${user.id}/profile`);
      if (response.ok) {
        const profile = await response.json();
        setUserLevel(profile.placement_level || 'A1');
      }
    } catch (error) {
      console.error('Failed to load user level:', error);
    }
  };

  // Simplify content for current section
  const simplifyContent = useCallback(async (sectionIndex, targetLevel = null) => {
    if (!module || !module.content || !module.content.sections) return;
    
    const section = module.content.sections[sectionIndex];
    if (!section || !section.text) return;
    
    const level = targetLevel || (simplificationLevel === 'auto' ? userLevel : simplificationLevel);
    const cacheKey = `${moduleId}-${sectionIndex}-${level}`;
    
    // Check if already simplified
    if (simplifiedContent[cacheKey]) {
      return simplifiedContent[cacheKey];
    }
    
    try {
      setContentLoading(true);
      
      // Analyze original text complexity
      const complexity = analyzeTextComplexity(section.text);
      
      // Simplify if needed
      const simplified = await textSimplificationService.simplifyText(
        section.text,
        level,
        {
          preserveKeyTerms: section.keyTerms || [],
          context: module.title,
          maxLength: section.text.length * 1.2 // Allow 20% expansion
        }
      );
      
      const result = {
        original: section.text,
        simplified: simplified.text,
        complexity: complexity,
        simplificationApplied: simplified.simplificationApplied,
        readabilityImprovement: simplified.readabilityImprovement,
        level: level
      };
      
      setSimplifiedContent(prev => ({
        ...prev,
        [cacheKey]: result
      }));
      
      return result;
      
    } catch (error) {
      console.error('Failed to simplify content:', error);
      toast({
        title: "Simplification Error",
        description: "Failed to adapt content difficulty. Showing original text.",
        variant: "destructive"
      });
      
      return {
        original: section.text,
        simplified: section.text,
        complexity: analyzeTextComplexity(section.text),
        simplificationApplied: false,
        level: level
      };
    } finally {
      setContentLoading(false);
    }
  }, [module, moduleId, userLevel, simplificationLevel, simplifiedContent, toast]);

  // Load content for current section
  useEffect(() => {
    if (module && module.content && module.content.sections) {
      simplifyContent(currentSection);
    }
  }, [module, currentSection, simplifyContent]);

  // Handle section completion
  const completeSection = async (sectionIndex) => {
    const timeSpent = startTime ? (Date.now() - startTime) / 1000 : 0;
    
    setSectionProgress(prev => ({
      ...prev,
      [sectionIndex]: {
        completed: true,
        timeSpent: timeSpent,
        completedAt: new Date().toISOString()
      }
    }));
    
    // Calculate overall progress
    const totalSections = module.content.sections.length;
    const completedSections = Object.keys(sectionProgress).length + 1;
    const progressPercentage = (completedSections / totalSections) * 100;
    
    setReadingProgress(progressPercentage);
    
    // Update module progress
    try {
      await updateModuleProgress(moduleId, {
        completion_percentage: progressPercentage,
        last_accessed_at: new Date().toISOString(),
        time_spent_minutes: timeSpent / 60
      });
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
    
    // Auto-advance to next section
    if (currentSection < totalSections - 1) {
      setTimeout(() => {
        setCurrentSection(prev => prev + 1);
        setStartTime(Date.now());
      }, 1500);
    } else {
      // Module completed
      await completeModule();
    }
  };

  // Complete entire module
  const completeModule = async () => {
    try {
      await updateModuleProgress(moduleId, {
        status: 'completed',
        completion_percentage: 100,
        completed_at: new Date().toISOString()
      });
      
      toast({
        title: "Module Completed!",
        description: "Congratulations! You've completed this module.",
        variant: "default"
      });
      
      // Navigate back to dashboard after a delay
      setTimeout(() => {
        navigate('/learn');
      }, 2000);
      
    } catch (error) {
      console.error('Failed to complete module:', error);
      toast({
        title: "Error",
        description: "Failed to mark module as completed.",
        variant: "destructive"
      });
    }
  };

  // Navigate between sections
  const goToSection = (sectionIndex) => {
    if (sectionIndex >= 0 && sectionIndex < module.content.sections.length) {
      setCurrentSection(sectionIndex);
      setStartTime(Date.now());
    }
  };

  // Play audio for current section
  const playAudio = async () => {
    const cacheKey = `${moduleId}-${currentSection}-${simplificationLevel === 'auto' ? userLevel : simplificationLevel}`;
    const content = simplifiedContent[cacheKey];
    
    if (!content) return;
    
    try {
      setAudioPlaying(true);
      
      // Use Web Speech API for TTS
      const utterance = new SpeechSynthesisUtterance(content.simplified);
      utterance.lang = module.language === 'spanish' ? 'es-ES' : 'en-US';
      utterance.rate = 0.8;
      utterance.onend = () => setAudioPlaying(false);
      utterance.onerror = () => {
        setAudioPlaying(false);
        toast({
          title: "Audio Error",
          description: "Failed to play audio. Please try again.",
          variant: "destructive"
        });
      };
      
      speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('Failed to play audio:', error);
      setAudioPlaying(false);
    }
  };

  // Change simplification level
  const changeSimplificationLevel = async (level) => {
    setSimplificationLevel(level);
    await simplifyContent(currentSection, level === 'auto' ? userLevel : level);
  };

  if (progressionLoading || !module) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentSectionData = module.content.sections[currentSection];
  const cacheKey = `${moduleId}-${currentSection}-${simplificationLevel === 'auto' ? userLevel : simplificationLevel}`;
  const contentData = simplifiedContent[cacheKey];

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/learn')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{module.title}</h1>
            <p className="text-gray-600">{module.description}</p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Module Progress</span>
            <span className="text-sm text-gray-600">
              Section {currentSection + 1} of {module.content.sections.length}
            </span>
          </div>
          <Progress value={readingProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Content Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Text Difficulty Level
                </label>
                <div className="flex space-x-2">
                  {['auto', 'A1', 'A2', 'B1', 'B2', 'C1'].map(level => (
                    <Button
                      key={level}
                      variant={simplificationLevel === level ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => changeSimplificationLevel(level)}
                    >
                      {level === 'auto' ? 'Auto' : level}
                    </Button>
                  ))}
                </div>
              </div>
              
              {contentData && (
                <div className="text-sm text-gray-600">
                  <p>Current complexity: {contentData.complexity.level}</p>
                  <p>Reading ease: {contentData.complexity.fleschReadingEase.toFixed(1)}</p>
                  {contentData.simplificationApplied && (
                    <p className="text-green-600">
                      ✓ Text simplified for {contentData.level} level
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {module.content.sections.map((section, index) => (
                  <Button
                    key={index}
                    variant={index === currentSection ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => goToSection(index)}
                  >
                    <div className="flex items-center space-x-2">
                      {sectionProgress[index]?.completed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : index === currentSection ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <BookOpen className="h-4 w-4" />
                      )}
                      <span className="truncate">{section.title}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  {currentSectionData.title}
                </CardTitle>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={playAudio}
                    disabled={audioPlaying || contentLoading}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  
                  {contentData && contentData.simplificationApplied && (
                    <Badge variant="secondary">
                      Simplified for {contentData.level}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {contentLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Adapting content...</span>
                </div>
              ) : contentData ? (
                <div className="space-y-6">
                  {/* Main Text */}
                  <div className="prose max-w-none">
                    <p className="text-lg leading-relaxed">
                      {contentData.simplified}
                    </p>
                  </div>
                  
                  {/* Key Terms */}
                  {currentSectionData.keyTerms && currentSectionData.keyTerms.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Key Terms
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {currentSectionData.keyTerms.map((term, index) => (
                          <Badge key={index} variant="outline">
                            {term}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Learning Tips */}
                  {currentSectionData.tips && (
                    <Alert>
                      <Lightbulb className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Tip:</strong> {currentSectionData.tips}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={() => goToSection(currentSection - 1)}
                      disabled={currentSection === 0}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    
                    <div className="flex space-x-2">
                      {!sectionProgress[currentSection]?.completed && (
                        <Button onClick={() => completeSection(currentSection)}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Complete Section
                        </Button>
                      )}
                      
                      {currentSection < module.content.sections.length - 1 ? (
                        <Button
                          onClick={() => goToSection(currentSection + 1)}
                          disabled={!sectionProgress[currentSection]?.completed}
                        >
                          Next
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      ) : (
                        sectionProgress[currentSection]?.completed && (
                          <Button onClick={completeModule}>
                            Complete Module
                            <CheckCircle className="h-4 w-4 ml-2" />
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading content...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ModuleContent;