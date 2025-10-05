// Progression Service for EdLingo
// Handles sequential content unlocking, prerequisites, and progression rules

import { run_mcp } from '../utils/mcpClient.js';

/**
 * Content Delivery & Progression Service
 * Manages sequential content unlocking and user progression
 */
class ProgressionService {
  constructor() {
    this.progressionRules = new Map();
    this.userProgressCache = new Map();
  }

  /**
   * Initialize user progression for a learning path
   * @param {string} userId - User ID
   * @param {string} learningPathId - Learning path ID
   * @returns {Promise<Object>} Initialization result
   */
  async initializeUserProgression(userId, learningPathId) {
    try {
      // Get learning path details
      const learningPath = await this.getLearningPath(learningPathId);
      if (!learningPath) {
        throw new Error('Learning path not found');
      }

      // Enroll user in learning path
      const enrollmentResult = await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'POST',
        path: '/user_learning_paths',
        body: {
          user_id: userId,
          learning_path_id: learningPathId,
          current_module_index: 0,
          progress_percentage: 0.0
        }
      });

      // Initialize progress for all modules in the path
      const modules = await this.getModulesInPath(learningPathId);
      const progressInitialization = [];

      for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
        const status = i === 0 ? 'available' : 'locked'; // First module is available
        
        progressInitialization.push({
          user_id: userId,
          module_id: module.id,
          status: status,
          attempts: 0,
          completion_percentage: 0.0
        });
      }

      // Batch insert progress records
      await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'POST',
        path: '/user_module_progress',
        body: progressInitialization
      });

      return {
        success: true,
        enrollmentId: enrollmentResult.id,
        modulesInitialized: progressInitialization.length,
        firstAvailableModule: modules[0]
      };

    } catch (error) {
      console.error('Failed to initialize user progression:', error);
      throw error;
    }
  }

  /**
   * Get available modules for a user based on progression rules
   * @param {string} userId - User ID
   * @param {string} language - Target language
   * @param {string} cefrLevel - User's CEFR level
   * @returns {Promise<Array>} Available modules
   */
  async getAvailableModules(userId, language, cefrLevel) {
    try {
      // Get user's current progress
      const userProgress = await this.getUserProgress(userId);
      
      // Get all modules for the language and level
      const allModules = await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: `/content_modules?language=eq.${language}&cefr_level=eq.${cefrLevel}&is_active=eq.true&order=order_index`
      });

      const availableModules = [];
      
      for (const module of allModules) {
        const moduleProgress = userProgress.find(p => p.module_id === module.id);
        
        if (!moduleProgress) {
          // Module not started - check if it should be available
          const isAvailable = await this.checkModuleAvailability(userId, module, userProgress);
          if (isAvailable) {
            availableModules.push({
              ...module,
              status: 'available',
              progress: 0
            });
          } else {
            availableModules.push({
              ...module,
              status: 'locked',
              progress: 0
            });
          }
        } else {
          // Module has progress - include current status
          availableModules.push({
            ...module,
            status: moduleProgress.status,
            progress: moduleProgress.completion_percentage || 0,
            bestScore: moduleProgress.best_score,
            attempts: moduleProgress.attempts
          });
        }
      }

      return availableModules;

    } catch (error) {
      console.error('Failed to get available modules:', error);
      throw error;
    }
  }

  /**
   * Check if a module should be available based on progression rules
   * @param {string} userId - User ID
   * @param {Object} module - Module to check
   * @param {Array} userProgress - User's current progress
   * @returns {Promise<boolean>} Whether module is available
   */
  async checkModuleAvailability(userId, module, userProgress) {
    try {
      // Check prerequisites
      if (module.prerequisites && module.prerequisites.length > 0) {
        for (const prerequisiteId of module.prerequisites) {
          const prereqProgress = userProgress.find(p => p.module_id === prerequisiteId);
          if (!prereqProgress || prereqProgress.status !== 'completed') {
            return false;
          }
        }
      }

      // Check progression rules
      const rules = await this.getProgressionRules(module.id);
      for (const rule of rules) {
        const ruleResult = await this.evaluateProgressionRule(userId, rule, userProgress);
        if (!ruleResult.passed) {
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('Error checking module availability:', error);
      return false;
    }
  }

  /**
   * Evaluate a specific progression rule
   * @param {string} userId - User ID
   * @param {Object} rule - Progression rule
   * @param {Array} userProgress - User's progress
   * @returns {Promise<Object>} Rule evaluation result
   */
  async evaluateProgressionRule(userId, rule, userProgress) {
    const config = rule.rule_config;
    
    switch (rule.rule_type) {
      case 'score_threshold':
        return this.evaluateScoreThreshold(userId, config, userProgress);
      
      case 'conversation_requirement':
        return this.evaluateConversationRequirement(userId, config);
      
      case 'time_gate':
        return this.evaluateTimeGate(userId, config);
      
      case 'prerequisite':
        return this.evaluatePrerequisite(userId, config, userProgress);
      
      default:
        console.warn(`Unknown rule type: ${rule.rule_type}`);
        return { passed: true, reason: 'Unknown rule type' };
    }
  }

  /**
   * Evaluate score threshold rule
   * @param {string} userId - User ID
   * @param {Object} config - Rule configuration
   * @param {Array} userProgress - User's progress
   * @returns {Object} Evaluation result
   */
  evaluateScoreThreshold(userId, config, userProgress) {
    const { min_score, max_attempts } = config;
    
    // Find relevant module progress
    const relevantProgress = userProgress.filter(p => 
      p.best_score !== null && p.best_score >= min_score
    );
    
    if (relevantProgress.length === 0) {
      return {
        passed: false,
        reason: `Minimum score of ${min_score}% required`,
        requirement: `Score at least ${min_score}% on prerequisite modules`
      };
    }
    
    return { passed: true, reason: 'Score threshold met' };
  }

  /**
   * Evaluate conversation requirement rule
   * @param {string} userId - User ID
   * @param {Object} config - Rule configuration
   * @returns {Promise<Object>} Evaluation result
   */
  async evaluateConversationRequirement(userId, config) {
    const { min_turns, min_engagement_score } = config;
    
    try {
      // Get user's conversation engagement data
      const engagementData = await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: `/conversation_engagement?user_id=eq.${userId}&order=created_at.desc&limit=10`
      });
      
      const totalTurns = engagementData.reduce((sum, session) => sum + (session.total_turns || 0), 0);
      const avgEngagement = engagementData.length > 0 
        ? engagementData.reduce((sum, session) => sum + (session.engagement_score || 0), 0) / engagementData.length
        : 0;
      
      if (totalTurns < min_turns) {
        return {
          passed: false,
          reason: `Need ${min_turns - totalTurns} more conversation turns`,
          requirement: `Complete at least ${min_turns} conversation turns`
        };
      }
      
      if (avgEngagement < min_engagement_score) {
        return {
          passed: false,
          reason: `Need higher engagement score (current: ${avgEngagement.toFixed(1)}, required: ${min_engagement_score})`,
          requirement: `Maintain engagement score of at least ${min_engagement_score}%`
        };
      }
      
      return { passed: true, reason: 'Conversation requirements met' };
      
    } catch (error) {
      console.error('Error evaluating conversation requirement:', error);
      return { passed: false, reason: 'Error checking conversation data' };
    }
  }

  /**
   * Evaluate time gate rule
   * @param {string} userId - User ID
   * @param {Object} config - Rule configuration
   * @returns {Promise<Object>} Evaluation result
   */
  async evaluateTimeGate(userId, config) {
    const { min_days_since_enrollment, min_total_study_hours } = config;
    
    try {
      // Get user enrollment date
      const enrollment = await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: `/user_learning_paths?user_id=eq.${userId}&order=enrolled_at.desc&limit=1`
      });
      
      if (enrollment.length === 0) {
        return { passed: false, reason: 'No enrollment found' };
      }
      
      const enrollmentDate = new Date(enrollment[0].enrolled_at);
      const daysSinceEnrollment = (Date.now() - enrollmentDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceEnrollment < min_days_since_enrollment) {
        const remainingDays = Math.ceil(min_days_since_enrollment - daysSinceEnrollment);
        return {
          passed: false,
          reason: `Wait ${remainingDays} more days`,
          requirement: `Must wait ${min_days_since_enrollment} days since enrollment`
        };
      }
      
      // Check total study time
      const sessions = await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: `/learning_sessions?user_id=eq.${userId}`
      });
      
      const totalHours = sessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) / 60;
      
      if (totalHours < min_total_study_hours) {
        const remainingHours = min_total_study_hours - totalHours;
        return {
          passed: false,
          reason: `Need ${remainingHours.toFixed(1)} more study hours`,
          requirement: `Complete at least ${min_total_study_hours} hours of study`
        };
      }
      
      return { passed: true, reason: 'Time requirements met' };
      
    } catch (error) {
      console.error('Error evaluating time gate:', error);
      return { passed: false, reason: 'Error checking time requirements' };
    }
  }

  /**
   * Evaluate prerequisite rule
   * @param {string} userId - User ID
   * @param {Object} config - Rule configuration
   * @param {Array} userProgress - User's progress
   * @returns {Object} Evaluation result
   */
  evaluatePrerequisite(userId, config, userProgress) {
    const { required_modules, min_completion_percentage } = config;
    
    for (const moduleId of required_modules) {
      const moduleProgress = userProgress.find(p => p.module_id === moduleId);
      
      if (!moduleProgress) {
        return {
          passed: false,
          reason: 'Prerequisite module not started',
          requirement: 'Complete prerequisite modules'
        };
      }
      
      if (moduleProgress.completion_percentage < (min_completion_percentage || 100)) {
        return {
          passed: false,
          reason: 'Prerequisite module not completed sufficiently',
          requirement: `Complete prerequisite modules to at least ${min_completion_percentage || 100}%`
        };
      }
    }
    
    return { passed: true, reason: 'Prerequisites met' };
  }

  /**
   * Update user progress for a module
   * @param {string} userId - User ID
   * @param {string} moduleId - Module ID
   * @param {Object} progressData - Progress update data
   * @returns {Promise<Object>} Update result
   */
  async updateModuleProgress(userId, moduleId, progressData) {
    try {
      const updateData = {
        ...progressData,
        last_accessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Update progress
      const result = await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'PATCH',
        path: `/user_module_progress?user_id=eq.${userId}&module_id=eq.${moduleId}`,
        body: updateData
      });

      // Check if module is completed and unlock next modules
      if (progressData.status === 'completed') {
        await this.unlockNextModules(userId, moduleId);
      }

      // Clear cache
      this.userProgressCache.delete(userId);

      return result;

    } catch (error) {
      console.error('Failed to update module progress:', error);
      throw error;
    }
  }

  /**
   * Unlock next modules after completing a module
   * @param {string} userId - User ID
   * @param {string} completedModuleId - ID of completed module
   * @returns {Promise<void>}
   */
  async unlockNextModules(userId, completedModuleId) {
    try {
      // Find modules that have this module as a prerequisite
      const dependentModules = await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: `/content_modules?prerequisites=cs.{${completedModuleId}}`
      });

      const userProgress = await this.getUserProgress(userId);

      for (const module of dependentModules) {
        const moduleProgress = userProgress.find(p => p.module_id === module.id);
        
        if (moduleProgress && moduleProgress.status === 'locked') {
          // Check if all prerequisites are now met
          const isAvailable = await this.checkModuleAvailability(userId, module, userProgress);
          
          if (isAvailable) {
            await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
              method: 'PATCH',
              path: `/user_module_progress?user_id=eq.${userId}&module_id=eq.${module.id}`,
              body: { status: 'available' }
            });
          }
        }
      }

    } catch (error) {
      console.error('Failed to unlock next modules:', error);
    }
  }

  /**
   * Get user's progress across all modules
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User progress data
   */
  async getUserProgress(userId) {
    if (this.userProgressCache.has(userId)) {
      return this.userProgressCache.get(userId);
    }

    try {
      const progress = await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: `/user_module_progress?user_id=eq.${userId}`
      });

      this.userProgressCache.set(userId, progress);
      return progress;

    } catch (error) {
      console.error('Failed to get user progress:', error);
      return [];
    }
  }

  /**
   * Get progression rules for a module
   * @param {string} moduleId - Module ID
   * @returns {Promise<Array>} Progression rules
   */
  async getProgressionRules(moduleId) {
    try {
      return await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: `/progression_rules?target_module_id=eq.${moduleId}&is_active=eq.true`
      });
    } catch (error) {
      console.error('Failed to get progression rules:', error);
      return [];
    }
  }

  /**
   * Get learning path details
   * @param {string} learningPathId - Learning path ID
   * @returns {Promise<Object>} Learning path data
   */
  async getLearningPath(learningPathId) {
    try {
      const result = await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: `/learning_paths?id=eq.${learningPathId}&is_active=eq.true`
      });
      return result[0] || null;
    } catch (error) {
      console.error('Failed to get learning path:', error);
      return null;
    }
  }

  /**
   * Get modules in a learning path
   * @param {string} learningPathId - Learning path ID
   * @returns {Promise<Array>} Modules in the path
   */
  async getModulesInPath(learningPathId) {
    try {
      const learningPath = await this.getLearningPath(learningPathId);
      if (!learningPath || !learningPath.module_sequence) {
        return [];
      }

      const moduleIds = learningPath.module_sequence.join(',');
      return await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: `/content_modules?id=in.(${moduleIds})&order=order_index`
      });
    } catch (error) {
      console.error('Failed to get modules in path:', error);
      return [];
    }
  }

  /**
   * Clear user progress cache
   * @param {string} userId - User ID (optional, clears all if not provided)
   */
  clearCache(userId = null) {
    if (userId) {
      this.userProgressCache.delete(userId);
    } else {
      this.userProgressCache.clear();
    }
  }
}

// Export singleton instance
export default new ProgressionService();

// Export class for testing
export { ProgressionService };