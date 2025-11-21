import aiService from './aiService.js';
import supabaseService from './supabaseService.js';
import unifiedLevelService from './unifiedLevelService.js';

/**
 * Assessment Service
 * Handles AI-driven language proficiency assessment
 * Implements CEFR standards and IELTS-comparable scoring
 */
class AssessmentService {
  constructor() {
    this.isInitialized = false;
    this.currentSession = null;
    this.assessmentTasks = [];
    this.conversationHistory = [];
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Ensure AI services are ready
      await aiService.initialize();
      this.isInitialized = true;
      console.log('Assessment service initialized');
    } catch (error) {
      console.error('Failed to initialize assessment service:', error);
      throw error;
    }
  }

  /**
   * Start a new assessment session
   */
  async startAssessment(userId, targetLanguage = 'English', sessionType = 'initial') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Create new assessment session in database
      const sessionData = {
        user_id: userId,
        session_type: sessionType,
        target_language: targetLanguage,
        status: 'in_progress',
        started_at: new Date().toISOString()
      };

      const { data: session, error } = await supabaseService.client
        .from('assessment_sessions')
        .insert([sessionData])
        .select()
        .single();

      if (error) throw error;

      this.currentSession = session;
      this.assessmentTasks = [];
      this.conversationHistory = [];

      // Generate assessment tasks
      await this.generateAssessmentTasks(session.id, targetLanguage);

      return {
        success: true,
        sessionId: session.id,
        tasks: this.assessmentTasks
      };
    } catch (error) {
      console.error('Failed to start assessment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate assessment tasks based on CEFR standards from database
   */
  async generateAssessmentTasks(sessionId, targetLanguage) {
    try {
      // Fetch CEFR questions from database
      const { data: cefrQuestions, error: fetchError } = await supabaseService.client
        .from('cefr_assessment_questions')
        .select('*')
        .eq('is_active', true)
        .order('cefr_level')
        .order('skill_type');

      if (fetchError) throw fetchError;

      if (!cefrQuestions || cefrQuestions.length === 0) {
        throw new Error('No CEFR questions found in database');
      }

      // Group questions by skill type and level for balanced assessment
      const questionsBySkill = this.groupQuestionsBySkill(cefrQuestions);
      
      // Select a balanced set of questions for assessment
      const selectedQuestions = this.selectBalancedQuestions(questionsBySkill);
      
      // Convert CEFR questions to assessment tasks format
      const tasks = selectedQuestions.map((question, index) => ({
        session_id: sessionId,
        task_type: this.mapQuestionTypeToTaskType(question.question_type),
        task_order: index + 1,
        prompt: this.buildTaskPrompt(question),
        expected_duration_minutes: this.getExpectedDuration(question.question_type),
        max_score: question.points || 100,
        cefr_question_id: question.id,
        cefr_level: question.cefr_level,
        skill_type: question.skill_type,
        question_data: {
          question_text: question.question_text,
          instructions: question.instructions,
          options: question.options,
          correct_answer: question.correct_answer,
          question_type: question.question_type
        }
      }));

      // Insert tasks into database
      const { data, error } = await supabaseService.client
        .from('assessment_tasks')
        .insert(tasks)
        .select();

      if (error) throw error;

      this.assessmentTasks = data;
      return data;
    } catch (error) {
      console.error('Error generating assessment tasks:', error);
      throw error;
    }
  }

  /**
   * Group questions by skill type for balanced selection
   */
  groupQuestionsBySkill(questions) {
    const grouped = {};
    questions.forEach(question => {
      const key = `${question.skill_type}_${question.cefr_level}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(question);
    });
    return grouped;
  }

  /**
   * Select a balanced set of questions for assessment
   */
  selectBalancedQuestions(questionsBySkill) {
    const selected = [];
    const skillTypes = ['vocabulary', 'grammar', 'reading', 'writing', 'speaking'];
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    
    // Try to get at least one question from each skill type
    skillTypes.forEach(skill => {
      for (const level of levels) {
        const key = `${skill}_${level}`;
        if (questionsBySkill[key] && questionsBySkill[key].length > 0) {
          // Select first question from this skill/level combination
          selected.push(questionsBySkill[key][0]);
          break; // Move to next skill type
        }
      }
    });

    // If we don't have enough questions, add more from available pool
    const allQuestions = Object.values(questionsBySkill).flat();
    while (selected.length < 8 && selected.length < allQuestions.length) {
      const remaining = allQuestions.filter(q => !selected.find(s => s.id === q.id));
      if (remaining.length > 0) {
        selected.push(remaining[0]);
      } else {
        break;
      }
    }

    return selected.slice(0, 8); // Limit to 8 questions for reasonable assessment time
  }

  /**
   * Map CEFR question types to assessment task types
   */
  mapQuestionTypeToTaskType(questionType) {
    const mapping = {
      'multiple-choice': 'multiple-choice',
      'true-false': 'true-false',
      'short-answer': 'writing',
      'essay': 'writing',
      'fill-in-blank': 'grammar',
      'listening': 'listening',
      'speaking': 'conversation',
      'reading': 'reading',
      'conversation': 'conversation'
    };
    return mapping[questionType] || 'general';
  }

  /**
   * Build task prompt from CEFR question
   */
  buildTaskPrompt(question) {
    let prompt = question.question_text;
    
    if (question.instructions) {
      prompt = `${question.instructions}\n\n${prompt}`;
    }
    
    if (question.options && Array.isArray(question.options)) {
      prompt += '\n\nOptions:';
      question.options.forEach((option, index) => {
        prompt += `\n${index + 1}. ${option}`;
      });
    }
    
    return prompt;
  }

  /**
   * Get expected duration based on question type
   */
  getExpectedDuration(questionType) {
    const durations = {
      'multiple-choice': 1,
      'true-false': 1,
      'short-answer': 3,
      'essay': 8,
      'fill-in-blank': 2,
      'listening': 3,
      'speaking': 4,
      'reading': 3,
      'conversation': 5
    };
    return durations[questionType] || 3;
  }

  /**
   * Submit response for a specific task
   */
  async submitTaskResponse(taskId, response, audioUrl = null) {
    try {
      const task = this.assessmentTasks.find(t => t.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      let score = null;
      let isCorrect = null;
      let analysis = null;

      // Check for automatic scoring for multiple-choice and true-false questions
      if (task.question_data && task.question_data.correct_answer) {
        const correctAnswer = task.question_data.correct_answer.toLowerCase().trim();
        const userAnswer = response.toLowerCase().trim();
        
        isCorrect = correctAnswer === userAnswer;
        score = isCorrect ? (task.max_score || 100) : 0;
        
        // Create basic analysis for auto-scored questions
        analysis = {
          score: score,
          feedback: {
            overall: isCorrect ? 'Correct answer!' : `Incorrect. The correct answer is: ${task.question_data.correct_answer}`,
            strengths: isCorrect ? ['Accurate response'] : [],
            weaknesses: isCorrect ? [] : ['Review this topic area'],
            errorExamples: []
          },
          skillScores: {
            grammar: score,
            vocabulary: score,
            fluency: score,
            accuracy: score,
            complexity: score
          }
        };
      } else {
        // Use AI analysis for open-ended questions
        analysis = await this.analyzeResponse(task, response, audioUrl);
        score = analysis.score;
      }

      // Update task in database
      const { data, error } = await supabaseService.client
        .from('assessment_tasks')
        .update({
          user_response: response,
          audio_response_url: audioUrl,
          score: score,
          is_correct: isCorrect,
          ai_feedback: analysis.feedback,
          skill_scores: analysis.skillScores,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // Update local task
      const taskIndex = this.assessmentTasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        this.assessmentTasks[taskIndex] = data;
      }

      return {
        success: true,
        score: score,
        isCorrect: isCorrect,
        feedback: analysis.feedback,
        skillScores: analysis.skillScores
      };
    } catch (error) {
      console.error('Failed to submit task response:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze user response using AI
   */
  async analyzeResponse(task, response, audioUrl = null) {
    const analysisPrompt = this.buildAnalysisPrompt(task, response);
    
    try {
      let aiResponse;
      
      // Use AI service (routes through Supabase)
      console.log('Using AI service for assessment analysis');
      aiResponse = await aiService.generateResponse(analysisPrompt);

      console.log('AI response received, length:', aiResponse?.length || 0);

      // Parse AI response to extract structured data
      const analysis = this.parseAIAnalysis(aiResponse, task.task_type);
      
      console.log('Analysis parsed successfully:', {
        score: analysis.score,
        cefrLevel: analysis.cefrLevel,
        hasSkillScores: !!analysis.skillScores
      });
      
      return analysis;
    } catch (error) {
      console.error('AI analysis failed:', error);
      console.log('Falling back to basic analysis');
      // Return fallback analysis
      return this.getFallbackAnalysis(task, response);
    }
  }

  /**
   * Build analysis prompt for AI
   */
  buildAnalysisPrompt(task, response) {
    const basePrompt = `
You are an expert language assessment specialist. Analyze the following ${task.task_type} response according to CEFR standards.

Task: ${task.prompt}
User Response: ${response}

Provide a detailed analysis including:
1. Overall score (0-100)
2. CEFR level estimate (A1, A2, B1, B2, C1, C2)
3. Skill breakdown scores for:
   - Grammar (0-100)
   - Vocabulary (0-100)
   - Fluency (0-100)
   - Accuracy (0-100)
   - Complexity (0-100)
4. Specific strengths and weaknesses
5. Detailed feedback for improvement
6. Examples of errors with corrections

IMPORTANT: Respond with ONLY valid JSON. No additional text before or after the JSON.

Format your response as JSON with the following structure:
{
  "overall_score": 75,
  "cefr_level": "B1",
  "skill_scores": {
    "grammar": 70,
    "vocabulary": 80,
    "fluency": 75,
    "accuracy": 70,
    "complexity": 65
  },
  "strengths": ["Good vocabulary usage", "Clear communication"],
  "weaknesses": ["Minor grammar errors", "Could improve complexity"],
  "feedback": "Overall good performance with room for improvement in grammar accuracy.",
  "error_examples": [{"error": "I was go", "correction": "I went", "explanation": "Past tense form needed"}]
}

Ensure all strings are properly quoted and no trailing commas exist.
`;

    // Add task-specific analysis criteria
    switch (task.task_type) {
      case 'conversation':
        return basePrompt + `\nFocus on natural flow, pronunciation indicators in text, and conversational appropriateness.`;
      case 'writing':
        return basePrompt + `\nFocus on coherence, cohesion, paragraph structure, and written accuracy.`;
      case 'grammar':
        return basePrompt + `\nFocus specifically on grammatical accuracy and understanding of complex structures.`;
      case 'vocabulary':
        return basePrompt + `\nFocus on vocabulary range, precision, and understanding of nuanced meanings.`;
      case 'pronunciation':
        return basePrompt + `\nNote: This is text analysis of a pronunciation task. Focus on phonetic awareness and potential pronunciation issues.`;
      default:
        return basePrompt;
    }
  }

  /**
   * Parse AI analysis response
   */
  parseAIAnalysis(aiResponse, taskType) {
    try {
      // Clean the response and try multiple extraction methods
      let jsonString = this.extractJsonFromResponse(aiResponse);
      
      if (jsonString) {
        // Clean common JSON formatting issues
        jsonString = this.cleanJsonString(jsonString);
        
        const parsed = JSON.parse(jsonString);
        return {
          score: parsed.overall_score || 50,
          cefrLevel: parsed.cefr_level || 'A2',
          skillScores: parsed.skill_scores || {},
          feedback: {
            overall: parsed.feedback || 'Analysis completed',
            strengths: parsed.strengths || [],
            weaknesses: parsed.weaknesses || [],
            errorExamples: parsed.error_examples || []
          }
        };
      }
    } catch (error) {
      console.error('Failed to parse AI analysis:', error);
      console.log('Raw AI response:', aiResponse.substring(0, 500) + '...');
    }

    // Fallback parsing
    return this.extractAnalysisFromText(aiResponse, taskType);
  }

  /**
   * Extract JSON from AI response using multiple strategies
   */
  extractJsonFromResponse(response) {
    // Strategy 1: Look for JSON code blocks
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Strategy 2: Look for balanced braces
    const braceStart = response.indexOf('{');
    if (braceStart !== -1) {
      let braceCount = 0;
      let jsonEnd = braceStart;
      
      for (let i = braceStart; i < response.length; i++) {
        if (response[i] === '{') braceCount++;
        if (response[i] === '}') braceCount--;
        
        if (braceCount === 0) {
          jsonEnd = i;
          break;
        }
      }
      
      if (braceCount === 0) {
        return response.substring(braceStart, jsonEnd + 1);
      }
    }

    return null;
  }

  /**
   * Clean common JSON formatting issues
   */
  cleanJsonString(jsonString) {
    return jsonString
      // Remove trailing commas
      .replace(/,\s*([}\]])/g, '$1')
      // Fix unquoted property names
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      // Fix single quotes to double quotes
      .replace(/'/g, '"')
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      // Clean up whitespace
      .trim();
  }

  /**
   * Extract analysis from unstructured text
   */
  extractAnalysisFromText(text, taskType) {
    const scoreMatch = text.match(/score[:\s]*(\d+)/i);
    const cefrMatch = text.match(/([ABC][12])/i);
    
    return {
      score: scoreMatch ? parseInt(scoreMatch[1]) : 60,
      cefrLevel: cefrMatch ? cefrMatch[1].toUpperCase() : 'B1',
      skillScores: {
        grammar: 60,
        vocabulary: 60,
        fluency: 60,
        accuracy: 60,
        complexity: 60
      },
      feedback: {
        overall: text.substring(0, 500) + '...',
        strengths: ['Analysis completed'],
        weaknesses: ['Detailed analysis available'],
        errorExamples: []
      }
    };
  }

  /**
   * Get fallback analysis when AI fails
   */
  getFallbackAnalysis(task, response) {
    const wordCount = response.split(' ').length;
    const sentenceCount = response.split(/[.!?]+/).length;
    
    // Basic heuristic scoring
    let score = 50;
    if (wordCount > 50) score += 10;
    if (sentenceCount > 3) score += 10;
    if (response.includes('because') || response.includes('although')) score += 10;
    
    return {
      score: Math.min(score, 100),
      cefrLevel: score > 70 ? 'B1' : 'A2',
      skillScores: {
        grammar: score,
        vocabulary: score,
        fluency: score - 10,
        accuracy: score,
        complexity: score - 20
      },
      feedback: {
        overall: 'Basic assessment completed. For detailed feedback, please ensure AI services are properly configured.',
        strengths: ['Response provided'],
        weaknesses: ['Detailed analysis unavailable'],
        errorExamples: []
      }
    };
  }

  /**
   * Complete assessment and calculate final results
   */
  async completeAssessment() {
    if (!this.currentSession) {
      throw new Error('No active assessment session');
    }

    try {
      // Get all completed tasks
      const { data: tasks, error: tasksError } = await supabaseService.client
        .from('assessment_tasks')
        .select('*')
        .eq('session_id', this.currentSession.id)
        .not('completed_at', 'is', null);

      if (tasksError) throw tasksError;

      // Calculate overall results
      const results = this.calculateOverallResults(tasks);

      // Update assessment session
      const { data: session, error: sessionError } = await supabaseService.client
        .from('assessment_sessions')
        .update({
          status: 'completed',
          total_duration_minutes: results.totalDuration,
          overall_score: results.overallScore,
          cefr_level: results.cefrLevel,
          ielts_equivalent: results.ieltsEquivalent,
          proficiency_breakdown: results.skillBreakdown,
          ai_analysis: results.analysis,
          completed_at: new Date().toISOString()
        })
        .eq('id', this.currentSession.id)
        .select()
        .single();

      if (sessionError) throw sessionError;

      this.currentSession = null;
      this.assessmentTasks = [];

      return {
        success: true,
        results: {
          sessionId: session.id,
          overallScore: results.overallScore,
          cefrLevel: results.cefrLevel,
          ieltsEquivalent: results.ieltsEquivalent,
          skillBreakdown: results.skillBreakdown,
          recommendations: results.recommendations
        }
      };
    } catch (error) {
      console.error('Failed to complete assessment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate overall assessment results using unified level system
   */
  calculateOverallResults(tasks) {
    if (!tasks || tasks.length === 0) {
      throw new Error('No completed tasks found');
    }

    // Separate conversational and structured tasks
    const conversationalTasks = tasks.filter(task => 
      task.task_type === 'conversation' || task.task_type === 'pronunciation'
    );
    const structuredTasks = tasks.filter(task => 
      !conversationalTasks.includes(task)
    );

    // Calculate scores for different task types
    let overallScore = 0;
    let cefrLevel = 'A1';
    let unifiedLevel = 'Basic';
    let fkAnalysis = null;

    if (structuredTasks.length > 0) {
      // For structured tasks, use FK-based analysis
      const structuredScore = structuredTasks.reduce((sum, task) => sum + (task.score || 0), 0) / structuredTasks.length;
      
      // Analyze text responses for FK scoring
      const textResponses = structuredTasks
        .filter(task => task.user_response && typeof task.user_response === 'string')
        .map(task => task.user_response)
        .join(' ');
      
      if (textResponses.length > 0) {
        fkAnalysis = unifiedLevelService.assignUnifiedLevel(textResponses, false);
        cefrLevel = fkAnalysis.cefr;
        unifiedLevel = fkAnalysis.level;
      } else {
        // Fallback to score-based CEFR for structured content without text
        cefrLevel = this.scoreToCEFR(structuredScore, null, false);
        unifiedLevel = unifiedLevelService.cefrToUnifiedLevel(cefrLevel);
      }
      
      overallScore = structuredScore;
    }

    if (conversationalTasks.length > 0) {
      const conversationalScore = conversationalTasks.reduce((sum, task) => sum + (task.score || 0), 0) / conversationalTasks.length;
      
      if (structuredTasks.length === 0) {
        // Only conversational tasks - use Basic level
        overallScore = conversationalScore;
        cefrLevel = 'A1';
        unifiedLevel = 'Basic';
      } else {
        // Combine scores with weighted average (70% structured, 30% conversational)
        overallScore = (overallScore * 0.7) + (conversationalScore * 0.3);
      }
    }
    
    // Convert to IELTS equivalent with unified level context
    const ieltsEquivalent = this.cefrToIELTS(cefrLevel, unifiedLevel);

    // Calculate skill breakdown
    const skillBreakdown = this.calculateSkillBreakdown(tasks);

    // Generate recommendations using unified level system
    const recommendations = this.generateUnifiedRecommendations(
      unifiedLevel, 
      cefrLevel, 
      skillBreakdown, 
      fkAnalysis
    );

    return {
      totalDuration: tasks.reduce((sum, task) => sum + (task.expected_duration_minutes || 0), 0),
      overallScore: Math.round(overallScore * 100) / 100,
      cefrLevel,
      unifiedLevel,
      ieltsEquivalent,
      skillBreakdown,
      fleschKincaidAnalysis: fkAnalysis,
      analysis: {
        taskResults: tasks.map(task => ({
          type: task.task_type,
          score: task.score,
          feedback: task.ai_feedback,
          isConversational: conversationalTasks.includes(task)
        })),
        overallAssessment: `Based on the assessment, the user demonstrates ${unifiedLevel} level (${cefrLevel}) proficiency.`,
        levelingApproach: fkAnalysis ? 'Flesch-Kincaid based analysis for structured content' : 'Score-based analysis'
      },
      recommendations
    };
  }

  /**
   * Convert score to CEFR level using unified level system
   */
  scoreToCEFR(score, textContent = null, isConversational = false) {
    // If we have text content, use FK-based analysis for structured content
    if (textContent && !isConversational) {
      const levelAnalysis = unifiedLevelService.assignUnifiedLevel(textContent, false);
      return levelAnalysis.cefr;
    }
    
    // For conversational content, always return A1 (Basic level)
    if (isConversational) {
      return 'A1';
    }
    
    // Fallback to traditional score-based mapping for structured content
    if (score >= 90) return 'C2';
    if (score >= 80) return 'C1';
    if (score >= 70) return 'B2';
    if (score >= 60) return 'B1';
    if (score >= 45) return 'A2';
    return 'A1';
  }

  /**
   * Convert CEFR to IELTS equivalent with unified level consideration
   */
  cefrToIELTS(cefrLevel, unifiedLevel = null) {
    const mapping = {
      'A1': 2.5,  // Basic level for conversation
      'A2': 3.5,  // Elementary level for structured learning
      'B1': 5.0,  // Pre-Intermediate
      'B2': 6.5,  // Intermediate
      'C1': 7.5,  // Upper-Intermediate
      'C2': 8.5   // Advanced
    };
    
    // Adjust IELTS score based on unified level context
    let baseScore = mapping[cefrLevel] || 5.0;
    
    // For Basic level (conversation), cap at lower IELTS score
    if (unifiedLevel === 'Basic') {
      baseScore = Math.min(baseScore, 3.0);
    }
    
    return baseScore;
  }

  /**
   * Calculate skill breakdown from tasks
   */
  calculateSkillBreakdown(tasks) {
    const skills = ['grammar', 'vocabulary', 'fluency', 'accuracy', 'complexity'];
    const breakdown = {};

    skills.forEach(skill => {
      const scores = tasks
        .map(task => task.skill_scores?.[skill])
        .filter(score => score !== undefined && score !== null);
      
      if (scores.length > 0) {
        breakdown[skill] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      } else {
        breakdown[skill] = 60; // Default score
      }
    });

    return breakdown;
  }

  /**
   * Generate learning recommendations based on unified level system
   */
  generateUnifiedRecommendations(unifiedLevel, cefrLevel, skillBreakdown, fkAnalysis) {
    const recommendations = {
      unifiedLevel,
      cefrLevel,
      focusAreas: [],
      suggestedActivities: [],
      nextSteps: [],
      contentTypes: [],
      fleschKincaidGuidance: null
    };

    // Identify weak areas
    Object.entries(skillBreakdown).forEach(([skill, score]) => {
      if (score < 60) {
        recommendations.focusAreas.push(skill);
      }
    });

    // Generate activity suggestions based on unified level
    switch (unifiedLevel) {
      case 'Basic':
        recommendations.suggestedActivities = [
          'Simple conversation practice',
          'Basic vocabulary building (500 most common words)',
          'Present tense practice',
          'Everyday situation dialogues',
          'Pronunciation fundamentals'
        ];
        recommendations.contentTypes = ['conversation', 'basic_dialogue', 'pronunciation'];
        break;
        
      case 'Elementary':
        recommendations.suggestedActivities = [
          'Structured grammar exercises',
          'Simple reading comprehension',
          'Basic writing tasks',
          'Past and present tense practice',
          'Vocabulary expansion (1000 common words)'
        ];
        recommendations.contentTypes = ['structured_exercises', 'simple_reading', 'basic_writing'];
        break;
        
      case 'Pre-Intermediate':
        recommendations.suggestedActivities = [
          'Future tense and conditionals',
          'Intermediate conversation topics',
          'Reading short articles',
          'Paragraph writing',
          'Listening comprehension'
        ];
        recommendations.contentTypes = ['intermediate_reading', 'structured_writing', 'conversation'];
        break;
        
      case 'Intermediate':
        recommendations.suggestedActivities = [
          'Complex grammar structures',
          'Advanced reading comprehension',
          'Essay writing practice',
          'Debate and discussion',
          'Idioms and phrasal verbs'
        ];
        recommendations.contentTypes = ['advanced_reading', 'essay_writing', 'discussion'];
        break;
        
      case 'Upper-Intermediate':
        recommendations.suggestedActivities = [
          'Academic writing',
          'Complex literature reading',
          'Professional communication',
          'Advanced grammar nuances',
          'Specialized vocabulary'
        ];
        recommendations.contentTypes = ['academic_content', 'literature', 'professional_communication'];
        break;
        
      case 'Advanced':
        recommendations.suggestedActivities = [
          'Native-level literature',
          'Academic research writing',
          'Professional presentations',
          'Subtle language distinctions',
          'Cultural nuances'
        ];
        recommendations.contentTypes = ['native_content', 'academic_research', 'professional_advanced'];
        break;
    }

    // Add FK-specific guidance for structured content
    if (fkAnalysis && fkAnalysis.fleschKincaid !== null) {
      const targetRange = unifiedLevelService.getStructuredContent(unifiedLevel).fkRange;
      recommendations.fleschKincaidGuidance = {
        currentScore: fkAnalysis.fleschKincaid,
        targetRange,
        suggestions: unifiedLevelService.generateLevelAdjustmentSuggestions(
          fkAnalysis.level, 
          unifiedLevel
        )
      };
    }

    // Generate next steps based on dual-track approach
    recommendations.nextSteps = [
      `Continue ${unifiedLevel} level structured learning (${cefrLevel} CEFR)`,
      unifiedLevel === 'Basic' 
        ? 'Practice conversation skills without complexity pressure'
        : 'Balance structured learning with conversation practice',
      'Focus on identified weak areas: ' + (recommendations.focusAreas.length > 0 
        ? recommendations.focusAreas.join(', ') 
        : 'Continue current progress'),
      'Regular assessment to track improvement',
      unifiedLevel !== 'Advanced' 
        ? `Prepare for progression to ${this.getNextLevel(unifiedLevel)} level`
        : 'Maintain and refine native-level proficiency'
    ];

    return recommendations;
  }

  /**
   * Get the next level in the unified system
   */
  getNextLevel(currentLevel) {
    const levelProgression = {
      'Basic': 'Elementary',
      'Elementary': 'Pre-Intermediate',
      'Pre-Intermediate': 'Intermediate',
      'Intermediate': 'Upper-Intermediate',
      'Upper-Intermediate': 'Advanced',
      'Advanced': 'Advanced' // Already at highest level
    };
    
    return levelProgression[currentLevel] || 'Elementary';
  }

  /**
   * Legacy function for backward compatibility
   */
  generateRecommendations(cefrLevel, skillBreakdown) {
    const unifiedLevel = unifiedLevelService.cefrToUnifiedLevel(cefrLevel);
    return this.generateUnifiedRecommendations(unifiedLevel, cefrLevel, skillBreakdown, null);
  }

  /**
   * Get current session status
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Get assessment history for a user
   */
  async getAssessmentHistory(userId, language = null) {
    try {
      let query = supabaseService.client
        .from('assessment_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (language) {
        query = query.eq('target_language', language);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, history: data };
    } catch (error) {
      console.error('Failed to get assessment history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's current proficiency profile
   */
  async getUserProficiencyProfile(userId, language) {
    try {
      const { data, error } = await supabaseService.client
        .from('user_proficiency_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('language', language)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      return { success: true, profile: data };
    } catch (error) {
      console.error('Failed to get proficiency profile:', error);
      return { success: false, error: error.message };
    }
  }
}

const assessmentService = new AssessmentService();
export default assessmentService;