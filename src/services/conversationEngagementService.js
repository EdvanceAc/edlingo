// Conversation Engagement Service for EdLingo
// Tracks and analyzes user conversation engagement for progression requirements

import { run_mcp } from '../utils/mcpClient.js';

/**
 * Conversation Engagement Service
 * Monitors conversation quality, engagement metrics, and progression requirements
 */
class ConversationEngagementService {
  constructor() {
    this.engagementCache = new Map();
    this.sessionMetrics = new Map();
  }

  /**
   * Start a new conversation session
   * @param {string} userId - User ID
   * @param {string} sessionType - Type of conversation (lesson, practice, assessment)
   * @param {string} language - Target language
   * @param {string} topic - Conversation topic
   * @returns {Promise<Object>} Session data
   */
  async startConversationSession(userId, sessionType, language, topic = null) {
    try {
      const sessionData = {
        user_id: userId,
        session_type: sessionType,
        language: language,
        topic: topic,
        started_at: new Date().toISOString(),
        total_turns: 0,
        user_turns: 0,
        ai_turns: 0,
        engagement_score: 0.0,
        quality_metrics: {
          avg_response_length: 0,
          vocabulary_diversity: 0,
          grammar_accuracy: 0,
          response_time_avg: 0,
          topic_relevance: 0
        },
        is_active: true
      };

      const result = await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'POST',
        path: '/conversation_engagement',
        body: sessionData
      });

      // Initialize session metrics in memory
      this.sessionMetrics.set(result.id, {
        sessionId: result.id,
        startTime: Date.now(),
        turns: [],
        responseTimes: [],
        vocabularyUsed: new Set(),
        topicKeywords: this.extractTopicKeywords(topic),
        qualityScores: []
      });

      return result;

    } catch (error) {
      console.error('Failed to start conversation session:', error);
      throw error;
    }
  }

  /**
   * Record a conversation turn
   * @param {string} sessionId - Session ID
   * @param {Object} turnData - Turn data
   * @returns {Promise<Object>} Updated session metrics
   */
  async recordConversationTurn(sessionId, turnData) {
    try {
      const {
        speaker, // 'user' or 'ai'
        message,
        timestamp = Date.now(),
        responseTime = null,
        grammarScore = null,
        vocabularyLevel = null
      } = turnData;

      // Get session metrics from memory
      const sessionMetrics = this.sessionMetrics.get(sessionId);
      if (!sessionMetrics) {
        throw new Error('Session not found in memory');
      }

      // Record the turn
      const turn = {
        speaker,
        message,
        timestamp,
        responseTime,
        grammarScore,
        vocabularyLevel,
        wordCount: this.countWords(message),
        vocabulary: this.extractVocabulary(message)
      };

      sessionMetrics.turns.push(turn);

      if (speaker === 'user') {
        // Track user-specific metrics
        if (responseTime) {
          sessionMetrics.responseTimes.push(responseTime);
        }
        
        // Add vocabulary to set
        turn.vocabulary.forEach(word => sessionMetrics.vocabularyUsed.add(word));
        
        // Calculate quality score for this turn
        const qualityScore = this.calculateTurnQuality(turn, sessionMetrics);
        sessionMetrics.qualityScores.push(qualityScore);
      }

      // Update session metrics in database periodically (every 5 turns)
      if (sessionMetrics.turns.length % 5 === 0) {
        await this.updateSessionMetrics(sessionId);
      }

      return {
        turnRecorded: true,
        currentEngagement: this.calculateCurrentEngagement(sessionMetrics),
        totalTurns: sessionMetrics.turns.length,
        userTurns: sessionMetrics.turns.filter(t => t.speaker === 'user').length
      };

    } catch (error) {
      console.error('Failed to record conversation turn:', error);
      throw error;
    }
  }

  /**
   * End a conversation session and calculate final metrics
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Final session metrics
   */
  async endConversationSession(sessionId) {
    try {
      const sessionMetrics = this.sessionMetrics.get(sessionId);
      if (!sessionMetrics) {
        throw new Error('Session not found');
      }

      // Calculate final metrics
      const finalMetrics = this.calculateFinalMetrics(sessionMetrics);
      
      // Update database with final metrics
      const updateData = {
        ended_at: new Date().toISOString(),
        total_turns: sessionMetrics.turns.length,
        user_turns: sessionMetrics.turns.filter(t => t.speaker === 'user').length,
        ai_turns: sessionMetrics.turns.filter(t => t.speaker === 'ai').length,
        engagement_score: finalMetrics.engagementScore,
        quality_metrics: finalMetrics.qualityMetrics,
        duration_minutes: (Date.now() - sessionMetrics.startTime) / (1000 * 60),
        is_active: false
      };

      await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'PATCH',
        path: `/conversation_engagement?id=eq.${sessionId}`,
        body: updateData
      });

      // Clean up memory
      this.sessionMetrics.delete(sessionId);

      return {
        sessionId,
        finalMetrics,
        meetsEngagementRequirements: finalMetrics.engagementScore >= 70 // 70% threshold
      };

    } catch (error) {
      console.error('Failed to end conversation session:', error);
      throw error;
    }
  }

  /**
   * Get user's conversation engagement history
   * @param {string} userId - User ID
   * @param {number} limit - Number of sessions to retrieve
   * @returns {Promise<Array>} Engagement history
   */
  async getUserEngagementHistory(userId, limit = 10) {
    try {
      return await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: `/conversation_engagement?user_id=eq.${userId}&order=started_at.desc&limit=${limit}`
      });
    } catch (error) {
      console.error('Failed to get engagement history:', error);
      return [];
    }
  }

  /**
   * Check if user meets conversation requirements for progression
   * @param {string} userId - User ID
   * @param {Object} requirements - Conversation requirements
   * @returns {Promise<Object>} Requirement check result
   */
  async checkConversationRequirements(userId, requirements) {
    try {
      const {
        minTotalTurns = 50,
        minEngagementScore = 70,
        minSessionCount = 5,
        timeframeDays = 30
      } = requirements;

      // Get recent engagement data
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);
      
      const recentSessions = await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'GET',
        path: `/conversation_engagement?user_id=eq.${userId}&started_at=gte.${cutoffDate.toISOString()}&is_active=eq.false`
      });

      // Calculate metrics
      const totalTurns = recentSessions.reduce((sum, session) => sum + (session.user_turns || 0), 0);
      const avgEngagement = recentSessions.length > 0 
        ? recentSessions.reduce((sum, session) => sum + (session.engagement_score || 0), 0) / recentSessions.length
        : 0;
      const sessionCount = recentSessions.length;

      // Check each requirement
      const checks = {
        totalTurns: {
          required: minTotalTurns,
          actual: totalTurns,
          passed: totalTurns >= minTotalTurns
        },
        engagementScore: {
          required: minEngagementScore,
          actual: Math.round(avgEngagement * 10) / 10,
          passed: avgEngagement >= minEngagementScore
        },
        sessionCount: {
          required: minSessionCount,
          actual: sessionCount,
          passed: sessionCount >= minSessionCount
        }
      };

      const allPassed = Object.values(checks).every(check => check.passed);

      return {
        passed: allPassed,
        checks,
        summary: {
          totalTurns,
          avgEngagement: Math.round(avgEngagement * 10) / 10,
          sessionCount,
          timeframeDays
        },
        recommendations: this.generateRecommendations(checks)
      };

    } catch (error) {
      console.error('Failed to check conversation requirements:', error);
      return {
        passed: false,
        error: 'Failed to check requirements',
        checks: {},
        summary: {},
        recommendations: []
      };
    }
  }

  /**
   * Calculate turn quality score
   * @param {Object} turn - Turn data
   * @param {Object} sessionMetrics - Session metrics
   * @returns {number} Quality score (0-100)
   */
  calculateTurnQuality(turn, sessionMetrics) {
    let score = 0;
    let factors = 0;

    // Response length factor (optimal: 10-50 words)
    const wordCount = turn.wordCount;
    if (wordCount >= 5 && wordCount <= 100) {
      const lengthScore = wordCount >= 10 && wordCount <= 50 ? 100 : 
                         wordCount < 10 ? (wordCount / 10) * 80 : 
                         Math.max(20, 100 - ((wordCount - 50) * 2));
      score += lengthScore;
      factors++;
    }

    // Grammar accuracy factor
    if (turn.grammarScore !== null) {
      score += turn.grammarScore;
      factors++;
    }

    // Vocabulary diversity factor
    const uniqueWords = turn.vocabulary.length;
    const diversityScore = Math.min(100, (uniqueWords / Math.max(1, wordCount)) * 200);
    score += diversityScore;
    factors++;

    // Topic relevance factor
    if (sessionMetrics.topicKeywords.length > 0) {
      const relevantWords = turn.vocabulary.filter(word => 
        sessionMetrics.topicKeywords.some(keyword => 
          word.toLowerCase().includes(keyword.toLowerCase())
        )
      ).length;
      const relevanceScore = Math.min(100, (relevantWords / sessionMetrics.topicKeywords.length) * 100);
      score += relevanceScore;
      factors++;
    }

    // Response time factor (optimal: 5-30 seconds)
    if (turn.responseTime) {
      const timeScore = turn.responseTime >= 5000 && turn.responseTime <= 30000 ? 100 :
                       turn.responseTime < 5000 ? Math.max(50, 100 - ((5000 - turn.responseTime) / 100)) :
                       Math.max(20, 100 - ((turn.responseTime - 30000) / 1000));
      score += timeScore;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate current engagement score
   * @param {Object} sessionMetrics - Session metrics
   * @returns {number} Engagement score (0-100)
   */
  calculateCurrentEngagement(sessionMetrics) {
    if (sessionMetrics.qualityScores.length === 0) {
      return 0;
    }

    const avgQuality = sessionMetrics.qualityScores.reduce((sum, score) => sum + score, 0) / sessionMetrics.qualityScores.length;
    const turnCount = sessionMetrics.turns.filter(t => t.speaker === 'user').length;
    const sessionDuration = (Date.now() - sessionMetrics.startTime) / (1000 * 60); // minutes

    // Engagement factors
    let engagement = avgQuality * 0.6; // Quality is 60% of engagement
    
    // Turn frequency factor (optimal: 1 turn per 2 minutes)
    const turnFrequency = turnCount / Math.max(1, sessionDuration);
    const frequencyScore = Math.min(100, turnFrequency * 50);
    engagement += frequencyScore * 0.2; // 20% of engagement
    
    // Consistency factor (less variation in quality = higher engagement)
    if (sessionMetrics.qualityScores.length > 1) {
      const variance = this.calculateVariance(sessionMetrics.qualityScores);
      const consistencyScore = Math.max(0, 100 - variance);
      engagement += consistencyScore * 0.2; // 20% of engagement
    }

    return Math.min(100, Math.max(0, engagement));
  }

  /**
   * Calculate final session metrics
   * @param {Object} sessionMetrics - Session metrics
   * @returns {Object} Final metrics
   */
  calculateFinalMetrics(sessionMetrics) {
    const userTurns = sessionMetrics.turns.filter(t => t.speaker === 'user');
    const totalWords = userTurns.reduce((sum, turn) => sum + turn.wordCount, 0);
    const avgResponseTime = sessionMetrics.responseTimes.length > 0 ?
      sessionMetrics.responseTimes.reduce((sum, time) => sum + time, 0) / sessionMetrics.responseTimes.length : 0;

    const qualityMetrics = {
      avg_response_length: userTurns.length > 0 ? totalWords / userTurns.length : 0,
      vocabulary_diversity: sessionMetrics.vocabularyUsed.size,
      grammar_accuracy: userTurns.filter(t => t.grammarScore !== null).length > 0 ?
        userTurns.filter(t => t.grammarScore !== null)
                 .reduce((sum, turn) => sum + turn.grammarScore, 0) / 
        userTurns.filter(t => t.grammarScore !== null).length : 0,
      response_time_avg: avgResponseTime,
      topic_relevance: this.calculateTopicRelevance(sessionMetrics)
    };

    return {
      engagementScore: this.calculateCurrentEngagement(sessionMetrics),
      qualityMetrics
    };
  }

  /**
   * Update session metrics in database
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async updateSessionMetrics(sessionId) {
    try {
      const sessionMetrics = this.sessionMetrics.get(sessionId);
      if (!sessionMetrics) return;

      const currentMetrics = this.calculateFinalMetrics(sessionMetrics);
      
      await run_mcp('mcp.config.usrlocalmcp.Postgrest', 'postgrestRequest', {
        method: 'PATCH',
        path: `/conversation_engagement?id=eq.${sessionId}`,
        body: {
          total_turns: sessionMetrics.turns.length,
          user_turns: sessionMetrics.turns.filter(t => t.speaker === 'user').length,
          ai_turns: sessionMetrics.turns.filter(t => t.speaker === 'ai').length,
          engagement_score: currentMetrics.engagementScore,
          quality_metrics: currentMetrics.qualityMetrics
        }
      });
    } catch (error) {
      console.error('Failed to update session metrics:', error);
    }
  }

  /**
   * Extract topic keywords from topic string
   * @param {string} topic - Topic string
   * @returns {Array} Topic keywords
   */
  extractTopicKeywords(topic) {
    if (!topic) return [];
    
    return topic.toLowerCase()
                .split(/[\s,.-]+/)
                .filter(word => word.length > 2)
                .slice(0, 10); // Limit to 10 keywords
  }

  /**
   * Extract vocabulary from message
   * @param {string} message - Message text
   * @returns {Array} Vocabulary words
   */
  extractVocabulary(message) {
    if (!message) return [];
    
    return message.toLowerCase()
                  .replace(/[^a-zA-Z\s]/g, '')
                  .split(/\s+/)
                  .filter(word => word.length > 2)
                  .filter((word, index, arr) => arr.indexOf(word) === index); // Unique words
  }

  /**
   * Count words in message
   * @param {string} message - Message text
   * @returns {number} Word count
   */
  countWords(message) {
    if (!message) return 0;
    return message.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calculate variance of an array of numbers
   * @param {Array} numbers - Array of numbers
   * @returns {number} Variance
   */
  calculateVariance(numbers) {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  /**
   * Calculate topic relevance score
   * @param {Object} sessionMetrics - Session metrics
   * @returns {number} Topic relevance score (0-100)
   */
  calculateTopicRelevance(sessionMetrics) {
    if (sessionMetrics.topicKeywords.length === 0) return 100; // No topic specified
    
    const userTurns = sessionMetrics.turns.filter(t => t.speaker === 'user');
    if (userTurns.length === 0) return 0;
    
    let totalRelevance = 0;
    
    userTurns.forEach(turn => {
      const relevantWords = turn.vocabulary.filter(word => 
        sessionMetrics.topicKeywords.some(keyword => 
          word.toLowerCase().includes(keyword.toLowerCase())
        )
      ).length;
      
      const turnRelevance = Math.min(100, (relevantWords / sessionMetrics.topicKeywords.length) * 100);
      totalRelevance += turnRelevance;
    });
    
    return totalRelevance / userTurns.length;
  }

  /**
   * Generate recommendations based on requirement checks
   * @param {Object} checks - Requirement checks
   * @returns {Array} Recommendations
   */
  generateRecommendations(checks) {
    const recommendations = [];
    
    if (!checks.totalTurns.passed) {
      const needed = checks.totalTurns.required - checks.totalTurns.actual;
      recommendations.push(`Participate in ${needed} more conversation turns to meet the requirement.`);
    }
    
    if (!checks.engagementScore.passed) {
      const needed = checks.engagementScore.required - checks.engagementScore.actual;
      recommendations.push(`Improve engagement by ${needed.toFixed(1)} points. Try longer responses and stay on topic.`);
    }
    
    if (!checks.sessionCount.passed) {
      const needed = checks.sessionCount.required - checks.sessionCount.actual;
      recommendations.push(`Complete ${needed} more conversation sessions.`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Great job! You meet all conversation requirements.');
    }
    
    return recommendations;
  }

  /**
   * Clear engagement cache
   * @param {string} userId - User ID (optional)
   */
  clearCache(userId = null) {
    if (userId) {
      // Clear specific user's cache
      for (const [key, value] of this.engagementCache.entries()) {
        if (key.includes(userId)) {
          this.engagementCache.delete(key);
        }
      }
    } else {
      this.engagementCache.clear();
    }
  }
}

// Export singleton instance
export default new ConversationEngagementService();

// Export class for testing
export { ConversationEngagementService };