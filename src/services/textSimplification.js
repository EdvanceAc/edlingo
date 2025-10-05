// Text Simplification Service for EdLingo
// Adapts content complexity based on user proficiency level

import { computeReadability, mapToLevel, levelToCefr } from '../utils/readability.js';
import crypto from 'crypto';

/**
 * Text Simplification Service
 * Provides methods to simplify text for different CEFR levels
 */
class TextSimplificationService {
  constructor() {
    this.cache = new Map();
    this.apiEndpoint = process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  /**
   * Generate a hash for text caching
   * @param {string} text - Original text
   * @param {string} targetLevel - Target CEFR level
   * @returns {string} Hash string
   */
  generateTextHash(text, targetLevel) {
    return crypto.createHash('md5')
      .update(text + targetLevel)
      .digest('hex');
  }

  /**
   * Simplify text for a specific CEFR level using AI
   * @param {string} originalText - Text to simplify
   * @param {string} targetCefrLevel - Target CEFR level (A1, A2, B1, B2, C1, C2)
   * @param {string} language - Target language (default: 'Spanish')
   * @returns {Promise<Object>} Simplified text with metadata
   */
  /**
   * Get target FKGL range for CEFR level
   * @param {string} cefrLevel - CEFR level
   * @returns {Object} {min: number, max: number}
   */
  getTargetFkglRange(cefrLevel) {
    const ranges = {
      'A1': {min: 0, max: 3},
      'A2': {min: 3, max: 5},
      'B1': {min: 5, max: 7},
      'B2': {min: 7, max: 9},
      'C1': {min: 9, max: 12},
      'C2': {min: 12, max: 20}
    };
    return ranges[cefrLevel] || {min: 0, max: 3};
  }

  async simplifyText(originalText, targetCefrLevel, language = 'Spanish') {
    if (!originalText || !targetCefrLevel) {
      throw new Error('Original text and target CEFR level are required');
    }

    const textHash = this.generateTextHash(originalText, targetCefrLevel);
    
    // Check cache first
    if (this.cache.has(textHash)) {
      return this.cache.get(textHash);
    }

    try {
      // Analyze original text
      const originalAnalysis = computeReadability(originalText);
      const originalLevel = mapToLevel(originalAnalysis.cgl);
      const originalCefr = levelToCefr(originalLevel);

      // If text is already at or below target level, return as-is
      if (this.compareCefrLevels(originalCefr, targetCefrLevel) <= 0) {
        const result = {
          originalText,
          simplifiedText: originalText,
          targetCefrLevel,
          originalCefrLevel: originalCefr,
          readabilityScore: originalAnalysis.cgl,
          simplificationMethod: 'none_needed',
          qualityScore: 100,
          changes: []
        };
        this.cache.set(textHash, result);
        return result;
      }

      // Generate simplified text using AI
      let simplifiedText = await this.generateSimplifiedText(
        originalText, 
        targetCefrLevel, 
        language
      );

      // Analyze simplified text
      let simplifiedAnalysis = computeReadability(simplifiedText);
      const targetRange = this.getTargetFkglRange(targetCefrLevel);
      let attempts = 0;
      const maxAttempts = 3;

      while ((simplifiedAnalysis.fkgl < targetRange.min || simplifiedAnalysis.fkgl > targetRange.max) && attempts < maxAttempts) {
        attempts++;
        const adjustment = simplifiedAnalysis.fkgl > targetRange.max ? 'simpler' : 'more complex';
        const adjustedPrompt = this.createSimplificationPrompt(originalText, targetCefrLevel, language) + 
          `\nThe previous simplification had FKGL ${simplifiedAnalysis.fkgl}. Make it ${adjustment} to reach FKGL between ${targetRange.min} and ${targetRange.max}.`;
        simplifiedText = await this.generateSimplifiedTextWithPrompt(adjustedPrompt);
        simplifiedAnalysis = computeReadability(simplifiedText);
      }

      const simplifiedAnalysis = computeReadability(simplifiedText);
      const qualityScore = this.assessSimplificationQuality(
        originalAnalysis, 
        simplifiedAnalysis, 
        targetCefrLevel
      );

      const result = {
        originalText,
        simplifiedText,
        targetCefrLevel,
        originalCefrLevel: originalCefr,
        readabilityScore: simplifiedAnalysis.cgl,
        simplificationMethod: 'ai',
        qualityScore,
        changes: this.identifyChanges(originalText, simplifiedText),
        metadata: {
          originalMetrics: originalAnalysis,
          simplifiedMetrics: simplifiedAnalysis,
          processingTime: Date.now()
        }
      };

      // Cache the result
      this.cache.set(textHash, result);
      return result;

    } catch (error) {
      console.error('Text simplification failed:', error);
      // Fallback to rule-based simplification
      return this.ruleBasedSimplification(originalText, targetCefrLevel);
    }
  }

  /**
   * Generate simplified text using AI (OpenAI GPT)
   * @param {string} text - Original text
   * @param {string} targetLevel - Target CEFR level
   * @param {string} language - Target language
   * @returns {Promise<string>} Simplified text
   */
  async generateSimplifiedText(text, targetLevel, language) {
    const prompt = this.createSimplificationPrompt(text, targetLevel, language);

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert language teacher specializing in text simplification for ${language} learners. Your task is to adapt texts to specific CEFR levels while preserving meaning and educational value.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`AI API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || text;
  }

  /**
   * Create a detailed prompt for text simplification
   * @param {string} text - Original text
   * @param {string} targetLevel - Target CEFR level
   * @param {string} language - Target language
   * @returns {string} Simplification prompt
   */
  createSimplificationPrompt(text, targetLevel, language) {
    const levelGuidelines = {
      'A1': 'Use only present tense, basic vocabulary (500-1000 words), simple sentences (5-10 words), avoid complex grammar.',
      'A2': 'Use present and past tense, familiar vocabulary (1000-2000 words), simple compound sentences, basic connectors.',
      'B1': 'Use various tenses, common vocabulary (2000-3000 words), some complex sentences, clear logical structure.',
      'B2': 'Use advanced tenses, specialized vocabulary (3000-5000 words), complex sentences with subordinate clauses.',
      'C1': 'Use sophisticated vocabulary (5000-8000 words), complex grammatical structures, nuanced expressions.',
      'C2': 'Use extensive vocabulary (8000+ words), highly complex structures, idiomatic expressions.'
    };

    return `Please simplify the following ${language} text to ${targetLevel} level:

"${text}"

Guidelines for ${targetLevel} level:
${levelGuidelines[targetLevel]}

Requirements:
1. Preserve the original meaning and key information
2. Use vocabulary appropriate for ${targetLevel} learners
3. Adjust sentence structure to match the complexity level
4. Maintain natural flow and readability
5. Keep cultural context when possible
6. Return only the simplified text without explanations

Simplified text:`;
  }

  /**
   * Rule-based text simplification fallback
   * @param {string} text - Original text
   * @param {string} targetLevel - Target CEFR level
   * @returns {Object} Simplified text result
   */
  ruleBasedSimplification(text, targetLevel) {
    let simplifiedText = text;
    const changes = [];

    // Basic rule-based simplifications
    if (['A1', 'A2'].includes(targetLevel)) {
      // Split long sentences
      simplifiedText = this.splitLongSentences(simplifiedText);
      changes.push('Split long sentences');

      // Replace complex punctuation
      simplifiedText = simplifiedText.replace(/[;:]/g, '.');
      changes.push('Simplified punctuation');

      // Remove parenthetical expressions
      simplifiedText = simplifiedText.replace(/\([^)]*\)/g, '');
      changes.push('Removed parenthetical expressions');
    }

    const analysis = computeReadability(simplifiedText);
    
    return {
      originalText: text,
      simplifiedText: simplifiedText.trim(),
      targetCefrLevel: targetLevel,
      readabilityScore: analysis.cgl,
      simplificationMethod: 'rule_based',
      qualityScore: 60, // Lower quality score for rule-based
      changes
    };
  }

  /**
   * Split long sentences into shorter ones
   * @param {string} text - Text to process
   * @returns {string} Text with shorter sentences
   */
  splitLongSentences(text) {
    return text.replace(/([^.!?]+[,;][^.!?]+[,;][^.!?]+[.!?])/g, (match) => {
      // Simple heuristic: replace first comma/semicolon with period
      return match.replace(/[,;]/, '.');
    });
  }

  /**
   * Compare CEFR levels
   * @param {string} level1 - First CEFR level
   * @param {string} level2 - Second CEFR level
   * @returns {number} -1 if level1 < level2, 0 if equal, 1 if level1 > level2
   */
  compareCefrLevels(level1, level2) {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const index1 = levels.indexOf(level1);
    const index2 = levels.indexOf(level2);
    return index1 - index2;
  }

  /**
   * Assess the quality of text simplification
   * @param {Object} originalAnalysis - Original text analysis
   * @param {Object} simplifiedAnalysis - Simplified text analysis
   * @param {string} targetLevel - Target CEFR level
   * @returns {number} Quality score (0-100)
   */
  assessSimplificationQuality(originalAnalysis, simplifiedAnalysis, targetLevel) {
    const targetLevelNum = this.cefrToNumber(targetLevel);
    const achievedLevelNum = mapToLevel(simplifiedAnalysis.cgl);
    
    // Base score on how close we got to target level
    const levelDifference = Math.abs(targetLevelNum - achievedLevelNum);
    let qualityScore = Math.max(0, 100 - (levelDifference * 20));
    
    // Bonus for maintaining reasonable text length
    const lengthRatio = simplifiedAnalysis.words / originalAnalysis.words;
    if (lengthRatio >= 0.7 && lengthRatio <= 1.2) {
      qualityScore += 10;
    }
    
    // Penalty for extreme changes
    if (lengthRatio < 0.5 || lengthRatio > 1.5) {
      qualityScore -= 20;
    }
    
    return Math.min(100, Math.max(0, qualityScore));
  }

  /**
   * Convert CEFR level to number
   * @param {string} cefrLevel - CEFR level
   * @returns {number} Numeric level
   */
  cefrToNumber(cefrLevel) {
    const mapping = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
    return mapping[cefrLevel] || 1;
  }

  /**
   * Identify changes between original and simplified text
   * @param {string} original - Original text
   * @param {string} simplified - Simplified text
   * @returns {Array} Array of identified changes
   */
  identifyChanges(original, simplified) {
    const changes = [];
    
    const originalWords = original.split(/\s+/).length;
    const simplifiedWords = simplified.split(/\s+/).length;
    
    if (simplifiedWords < originalWords * 0.8) {
      changes.push('Significant word reduction');
    }
    
    if (simplified.split(/[.!?]/).length > original.split(/[.!?]/).length) {
      changes.push('Sentences were split');
    }
    
    if (simplified.length < original.length * 0.7) {
      changes.push('Text was substantially shortened');
    }
    
    return changes;
  }

  /**
   * Batch simplify multiple texts
   * @param {Array} texts - Array of texts to simplify
   * @param {string} targetLevel - Target CEFR level
   * @param {string} language - Target language
   * @returns {Promise<Array>} Array of simplification results
   */
  async batchSimplify(texts, targetLevel, language = 'Spanish') {
    const results = [];
    
    for (const text of texts) {
      try {
        const result = await this.simplifyText(text, targetLevel, language);
        results.push(result);
      } catch (error) {
        console.error('Batch simplification error:', error);
        results.push({
          originalText: text,
          simplifiedText: text,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Clear the simplification cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: 1000 // Could be configurable
    };
  }
}

// Export singleton instance
export default new TextSimplificationService();

// Export class for testing
export { TextSimplificationService };

/**
   * Generate simplified text with custom prompt
   * @param {string} prompt - Custom prompt
   * @returns {Promise<string>} Simplified text
   */
  async generateSimplifiedTextWithPrompt(prompt) {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert language teacher specializing in text simplification.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`AI API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || '';
  }
}

// Export singleton instance
export default new TextSimplificationService();

// Export class for testing
export { TextSimplificationService };