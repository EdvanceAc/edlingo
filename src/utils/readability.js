// Readability analysis utilities for EdLingo
// Implements Flesch Reading Ease and Flesch-Kincaid Grade Level composite scoring

import { syllable } from 'syllable';

/**
 * Compute readability metrics for a given text
 * @param {string} text - The text to analyze
 * @returns {Object} Object containing FRE, FKGL, and composite grade level
 */
export function computeReadability(text) {
  if (!text || typeof text !== 'string') {
    return { fre: 0, fkgl: 0, cgl: 0 };
  }

  // Clean and prepare text
  const cleanText = text.trim();
  if (cleanText.length === 0) {
    return { fre: 0, fkgl: 0, cgl: 0 };
  }

  // Count sentences (improved regex to handle various punctuation)
  const sentences = cleanText.match(/[^.!?]+[.!?]+/g)?.length || 1;
  
  // Count words (filter out empty strings)
  const words = cleanText.split(/\s+/).filter(w => w.trim().length > 0).length;
  
  // Count syllables for all words
  const syllables = cleanText.split(/\s+/)
    .filter(w => w.trim().length > 0)
    .reduce((sum, word) => {
      // Remove punctuation for syllable counting
      const cleanWord = word.replace(/[^a-zA-Z]/g, '');
      return sum + (cleanWord.length > 0 ? syllable(cleanWord) : 0);
    }, 0);

  // Avoid division by zero
  if (words === 0 || sentences === 0) {
    return { fre: 0, fkgl: 0, cgl: 0 };
  }

  // Flesch Reading Ease (0-100 scale, higher = easier)
  // Flesch Reading Ease (0-100 scale, higher = easier)
  const fre = 206.835
    - 1.015 * (words / sentences)
    - 84.6 * (syllables / words);

  // Flesch-Kincaid Grade Level
  const fkgl = Math.max(0, 0.39 * (words / sentences)
             + 11.8 * (syllables / words)
             - 15.59);

  // Map FRE to grade equivalent
  let gFre;
  if (fre >= 90)      gFre = 5;   // Very easy (5th grade)
  else if (fre >= 80) gFre = 6;   // Easy (6th grade)
  else if (fre >= 70) gFre = 7;   // Fairly easy (7th grade)
  else if (fre >= 60) gFre = 8;   // Standard (8th grade)
  else if (fre >= 50) gFre = 10;  // Fairly difficult (10th grade)
  else if (fre >= 30) gFre = 12;  // Difficult (12th grade)
  else                gFre = 16;  // Very difficult (college level)

  // Composite Grade Level (average of FRE grade equivalent and FKGL)
  const cgl = (gFre + Math.max(0, fkgl)) / 2;

  return {
    fre: Math.round(fre * 100) / 100,
    fkgl: Math.round(fkgl * 100) / 100,
    cgl: Math.round(cgl * 100) / 100,
    sentences,
    words,
    syllables
  };
}

/**
 * Map composite grade level to EdLingo's 5-level system
 * @param {number} cgl - Composite Grade Level
 * @returns {number} Level 1-5
 */
export function mapToLevel(cgl) {
  if (cgl < 6)      return 1;  // Elementary (A1)
  if (cgl < 8)      return 2;  // Pre-intermediate (A2)
  if (cgl < 10)     return 3;  // Intermediate (B1)
  if (cgl < 12)     return 4;  // Upper-intermediate (B2)
  return 5;                    // Advanced (C1-C2)
}

/**
 * Map CEFR level to EdLingo's 5-level system
 * @param {string} cefrLevel - CEFR level (A1, A2, B1, B2, C1, C2)
 * @returns {number} Level 1-5
 */
export function cefrToLevel(cefrLevel) {
  const level = cefrLevel?.toUpperCase();
  switch (level) {
    case 'A1': return 1;
    case 'A2': return 2;
    case 'B1': return 3;
    case 'B2': return 4;
    case 'C1':
    case 'C2': return 5;
    default: return 1;
  }
}

/**
 * Map EdLingo level to CEFR level
 * @param {number} level - EdLingo level (1-5)
 * @returns {string} CEFR level
 */
export function levelToCefr(level) {
  switch (level) {
    case 1: return 'A1';
    case 2: return 'A2';
    case 3: return 'B1';
    case 4: return 'B2';
    case 5: return 'C1';
    default: return 'A1';
  }
}

/**
 * Analyze text complexity and suggest appropriate CEFR level
 * @param {string} text - Text to analyze
 * @returns {Object} Analysis results with suggested level
 */
export function analyzeTextComplexity(text) {
  const readability = computeReadability(text);
  const suggestedLevel = mapToLevel(readability.cgl);
  const cefrLevel = levelToCefr(suggestedLevel);
  
  // Determine complexity category
  let complexity;
  if (readability.cgl < 6) complexity = 'Very Easy';
  else if (readability.cgl < 8) complexity = 'Easy';
  else if (readability.cgl < 10) complexity = 'Moderate';
  else if (readability.cgl < 12) complexity = 'Difficult';
  else complexity = 'Very Difficult';

  return {
    ...readability,
    suggestedLevel,
    cefrLevel,
    complexity,
    recommendations: generateRecommendations(readability)
  };
}

/**
 * Generate recommendations for text improvement
 * @param {Object} readability - Readability metrics
 * @returns {Array} Array of recommendation strings
 */
function generateRecommendations(readability) {
  const recommendations = [];
  
  if (readability.words / readability.sentences > 20) {
    recommendations.push('Consider breaking long sentences into shorter ones');
  }
  
  if (readability.syllables / readability.words > 1.7) {
    recommendations.push('Try using simpler words with fewer syllables');
  }
  
  if (readability.fre < 30) {
    recommendations.push('Text is very difficult - consider simplifying vocabulary and sentence structure');
  }
  
  if (readability.fkgl > 12) {
    recommendations.push('Grade level is high - consider reducing complexity for language learners');
  }
  
  return recommendations;
}

/**
 * Batch analyze multiple texts
 * @param {Array} texts - Array of text strings
 * @returns {Array} Array of analysis results
 */
export function batchAnalyzeTexts(texts) {
  return texts.map((text, index) => ({
    index,
    text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    ...analyzeTextComplexity(text)
  }));
}

export default {
  computeReadability,
  mapToLevel,
  cefrToLevel,
  levelToCefr,
  analyzeTextComplexity,
  batchAnalyzeTexts
};