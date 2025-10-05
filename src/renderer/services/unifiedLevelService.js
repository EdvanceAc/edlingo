/**
 * Unified Level Service
 * Implements the corrected Flesch-Kincaid and CEFR dual-purpose level system
 * Based on the Corrected Unified Flesch-Kincaid and CEFR Implementation Guide
 */

class UnifiedLevelService {
  constructor() {
    this.conversationLevel = 'Basic'; // Always Basic for conversation
    this.structuredLevels = {
      'Elementary': { fkRange: [0, 1.0], cefr: 'A2' },
      'Pre-Intermediate': { fkRange: [1.0, 1.5], cefr: 'B1' },
      'Intermediate': { fkRange: [1.5, 2.5], cefr: 'B2' },
      'Upper-Intermediate': { fkRange: [2.5, 3.5], cefr: 'C1' },
      'Advanced': { fkRange: [3.5, 4.5], cefr: 'C2' }
    };
  }

  /**
   * Calculate modified Flesch-Kincaid score
   * @param {string} text - Text to analyze
   * @returns {number} Modified FK score
   */
  calculateModifiedFK(text) {
    if (!text || text.trim().length === 0) return 0;

    // Clean and prepare text
    const cleanText = text.replace(/[^\w\s\.\!\?]/g, ' ').trim();
    
    // Count sentences
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    
    if (sentenceCount === 0) return 0;

    // Count words
    const words = cleanText.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    if (wordCount === 0) return 0;

    // Count syllables
    let syllableCount = 0;
    words.forEach(word => {
      syllableCount += this.countSyllables(word);
    });

    // Modified Flesch-Kincaid formula for language learning
    // Adjusted coefficients for better CEFR alignment
    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgSyllablesPerWord = syllableCount / wordCount;
    
    // Modified formula: emphasizes sentence complexity and vocabulary difficulty
    const modifiedFK = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;
    
    // Normalize to 0-4.5 range for our level system
    return Math.max(0, Math.min(4.5, modifiedFK / 10));
  }

  /**
   * Count syllables in a word
   * @param {string} word - Word to count syllables for
   * @returns {number} Number of syllables
   */
  countSyllables(word) {
    if (!word || word.length === 0) return 0;
    
    word = word.toLowerCase();
    
    // Handle special cases
    if (word.length <= 3) return 1;
    
    // Count vowel groups
    let syllables = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = 'aeiouy'.includes(word[i]);
      
      if (isVowel && !previousWasVowel) {
        syllables++;
      }
      
      previousWasVowel = isVowel;
    }
    
    // Handle silent 'e'
    if (word.endsWith('e') && syllables > 1) {
      syllables--;
    }
    
    // Ensure at least 1 syllable
    return Math.max(1, syllables);
  }

  /**
   * Assign unified level based on text and context
   * @param {string} text - Text to analyze
   * @param {boolean} conversationContext - Whether this is conversation context
   * @returns {Object} Level assignment result
   */
  assignUnifiedLevel(text, conversationContext = false) {
    // Check if this is general conversation context
    if (conversationContext) {
      return {
        level: 'Basic',
        fleschKincaid: null, // Not applicable for conversation
        cefr: 'A1',
        usage: 'General conversation/Simple sentences',
        confidence: 0.95
      };
    }
    
    // For structured content, use FK ranges starting from Elementary
    const modifiedFK = this.calculateModifiedFK(text);
    let primaryLevel;
    let cefr;
    
    if (modifiedFK < 1.0) {
      primaryLevel = 'Elementary';
      cefr = 'A2';
    } else if (modifiedFK < 1.5) {
      primaryLevel = 'Pre-Intermediate';
      cefr = 'B1';
    } else if (modifiedFK < 2.5) {
      primaryLevel = 'Intermediate';
      cefr = 'B2';
    } else if (modifiedFK < 3.5) {
      primaryLevel = 'Upper-Intermediate';
      cefr = 'C1';
    } else {
      primaryLevel = 'Advanced';
      cefr = 'C2';
    }
    
    return {
      level: primaryLevel,
      fleschKincaid: modifiedFK,
      cefr: cefr,
      usage: 'Structured learning content',
      confidence: this.calculateConfidence(modifiedFK)
    };
  }

  /**
   * Calculate confidence score for level assignment
   * @param {number} fkScore - Flesch-Kincaid score
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(fkScore) {
    // Higher confidence when FK score is well within level boundaries
    const levelBoundaries = [0, 1.0, 1.5, 2.5, 3.5, 4.5];
    
    for (let i = 0; i < levelBoundaries.length - 1; i++) {
      const lower = levelBoundaries[i];
      const upper = levelBoundaries[i + 1];
      
      if (fkScore >= lower && fkScore < upper) {
        const range = upper - lower;
        const position = fkScore - lower;
        const distanceFromCenter = Math.abs(position - range / 2);
        const normalizedDistance = distanceFromCenter / (range / 2);
        
        // Higher confidence when closer to center of range
        return Math.max(0.6, 1 - normalizedDistance * 0.4);
      }
    }
    
    return 0.6; // Default confidence
  }

  /**
   * Get content for student based on level and content type
   * @param {string} studentLevel - Student's current level
   * @param {string} contentType - 'conversation' or 'structured'
   * @returns {Object} Content configuration
   */
  getContentForStudent(studentLevel, contentType) {
    if (contentType === 'conversation') {
      return this.getConversationContent();
    } else {
      return this.getStructuredContent(studentLevel);
    }
  }

  /**
   * Get conversation content configuration (always Basic level)
   * @returns {Object} Conversation content config
   */
  getConversationContent() {
    return {
      level: 'Basic',
      cefr: 'A1',
      fkRange: null,
      vocabulary: 'Basic 500 most common words',
      grammar: 'Present tense, simple sentence patterns',
      complexity: 'Simple everyday exchanges',
      focus: 'Conversational fluency'
    };
  }

  /**
   * Get structured content configuration
   * @param {string} level - Target level
   * @returns {Object} Structured content config
   */
  getStructuredContent(level) {
    const config = this.structuredLevels[level];
    if (!config) {
      throw new Error(`Invalid structured level: ${level}`);
    }

    const contentConfigs = {
      'Elementary': {
        level: 'Elementary',
        cefr: 'A2',
        fkRange: [0, 1.0],
        vocabulary: 'First 1000 common words',
        grammar: 'Simple past/present tenses, basic connectors',
        complexity: 'Simple structured content',
        focus: 'Basic language structures'
      },
      'Pre-Intermediate': {
        level: 'Pre-Intermediate',
        cefr: 'B1',
        fkRange: [1.0, 1.5],
        vocabulary: 'Extended vocabulary, some idioms',
        grammar: 'Future tense, conditionals, intermediate structures',
        complexity: 'Moderate complexity with clear structure',
        focus: 'Practical communication skills'
      },
      'Intermediate': {
        level: 'Intermediate',
        cefr: 'B2',
        fkRange: [1.5, 2.5],
        vocabulary: 'Advanced vocabulary, idioms, phrasal verbs',
        grammar: 'Complex grammar, passive voice, advanced structures',
        complexity: 'Complex ideas with sophisticated language',
        focus: 'Fluent communication in various contexts'
      },
      'Upper-Intermediate': {
        level: 'Upper-Intermediate',
        cefr: 'C1',
        fkRange: [2.5, 3.5],
        vocabulary: 'Academic vocabulary, specialized terms',
        grammar: 'Sophisticated grammar, nuanced expressions',
        complexity: 'Abstract and complex topics',
        focus: 'Academic and professional proficiency'
      },
      'Advanced': {
        level: 'Advanced',
        cefr: 'C2',
        fkRange: [3.5, 4.5],
        vocabulary: 'Unrestricted vocabulary, native-like expressions',
        grammar: 'Unrestricted complexity, subtle distinctions',
        complexity: 'Highly complex and nuanced content',
        focus: 'Native-like proficiency'
      }
    };

    return contentConfigs[level];
  }

  /**
   * Generate AI content prompts based on level and content type
   * @param {string} level - Target level
   * @param {string} contentType - 'conversation' or 'structured'
   * @param {string} topic - Content topic
   * @returns {string} AI generation prompt
   */
  generateAIContentPrompt(level, contentType, topic) {
    const prompts = {
      'Basic': `Create simple conversation about ${topic}. Use only present tense, basic vocabulary (500 most common words), and simple sentence patterns. Focus on everyday exchanges.`,
      
      'Elementary': `Generate Elementary level content about ${topic}. Use simple past/present tenses, basic connectors, vocabulary from first 1000 common words. Target FK score 0-1, A2 CEFR level.`,
      
      'Pre-Intermediate': `Create Pre-Intermediate content about ${topic}. Include future tense, conditionals, intermediate vocabulary. Target FK score 1-1.5, B1 CEFR level.`,
      
      'Intermediate': `Develop Intermediate content about ${topic}. Use complex grammar, passive voice, advanced vocabulary, idioms. Target FK score 1.5-2.5, B2 CEFR level.`,
      
      'Upper-Intermediate': `Generate Upper-Intermediate content about ${topic}. Employ sophisticated grammar, academic vocabulary, complex sentences. Target FK score 2.5-3.5, C1 CEFR level.`,
      
      'Advanced': `Create Advanced content about ${topic}. Use unrestricted complexity, specialized vocabulary, native-like expressions. Target FK score 3.5-4.5, C2 CEFR level.`
    };
    
    return prompts[level] || prompts['Elementary'];
  }

  /**
   * Convert traditional CEFR to unified level
   * @param {string} cefrLevel - Traditional CEFR level (A1, A2, B1, B2, C1, C2)
   * @returns {string} Unified level
   */
  cefrToUnifiedLevel(cefrLevel) {
    const mapping = {
      'A1': 'Basic',
      'A2': 'Elementary',
      'B1': 'Pre-Intermediate',
      'B2': 'Intermediate',
      'C1': 'Upper-Intermediate',
      'C2': 'Advanced'
    };
    
    return mapping[cefrLevel] || 'Elementary';
  }

  /**
   * Convert unified level to traditional CEFR
   * @param {string} unifiedLevel - Unified level
   * @returns {string} Traditional CEFR level
   */
  unifiedLevelToCefr(unifiedLevel) {
    const mapping = {
      'Basic': 'A1',
      'Elementary': 'A2',
      'Pre-Intermediate': 'B1',
      'Intermediate': 'B2',
      'Upper-Intermediate': 'C1',
      'Advanced': 'C2'
    };
    
    return mapping[unifiedLevel] || 'A2';
  }

  /**
   * Validate if content matches target level
   * @param {string} content - Content to validate
   * @param {string} targetLevel - Target level
   * @param {boolean} isConversation - Whether content is conversational
   * @returns {Object} Validation result
   */
  validateContentLevel(content, targetLevel, isConversation = false) {
    const analysis = this.assignUnifiedLevel(content, isConversation);
    const isValid = analysis.level === targetLevel;
    
    return {
      isValid,
      actualLevel: analysis.level,
      targetLevel,
      fkScore: analysis.fleschKincaid,
      confidence: analysis.confidence,
      suggestions: isValid ? [] : this.generateLevelAdjustmentSuggestions(analysis.level, targetLevel)
    };
  }

  /**
   * Generate suggestions for adjusting content to target level
   * @param {string} currentLevel - Current content level
   * @param {string} targetLevel - Target level
   * @returns {Array} Array of adjustment suggestions
   */
  generateLevelAdjustmentSuggestions(currentLevel, targetLevel) {
    const suggestions = [];
    
    const levelOrder = ['Basic', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'Upper-Intermediate', 'Advanced'];
    const currentIndex = levelOrder.indexOf(currentLevel);
    const targetIndex = levelOrder.indexOf(targetLevel);
    
    if (currentIndex < targetIndex) {
      // Content is too simple
      suggestions.push('Increase sentence complexity');
      suggestions.push('Use more advanced vocabulary');
      suggestions.push('Add complex grammatical structures');
      suggestions.push('Include longer, more detailed explanations');
    } else if (currentIndex > targetIndex) {
      // Content is too complex
      suggestions.push('Simplify sentence structure');
      suggestions.push('Use more basic vocabulary');
      suggestions.push('Break down complex ideas into simpler parts');
      suggestions.push('Reduce sentence length');
    }
    
    return suggestions;
  }
}

const unifiedLevelService = new UnifiedLevelService();
export default unifiedLevelService;