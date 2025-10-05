// unifiedLevelService.js
import readability from '../utils/readability.js';

class UnifiedLevelService {
  constructor() {
    this.cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  }

  calculateFleschKincaid(text) {
    // Implementation using readability utility
    return readability.calculateFleschKincaid(text);
  }

  determineCEFRLevel(fkScore) {
    if (fkScore >= 90) return 'A1';
    if (fkScore >= 80) return 'A2';
    if (fkScore >= 70) return 'B1';
    if (fkScore >= 60) return 'B2';
    if (fkScore >= 30) return 'C1';
    return 'C2';
  }

  simplifyText(text, targetLevel) {
    // Basic simplification logic
    const fkScore = this.calculateFleschKincaid(text);
    const currentLevel = this.determineCEFRLevel(fkScore);
    // Simplify if current level is higher than target
    if (this.cefrLevels.indexOf(currentLevel) > this.cefrLevels.indexOf(targetLevel)) {
      // Implement simplification: shorten sentences, use simpler words, etc.
      return text.replace(/complex/g, 'simple').split('. ').map(s => s.trim()).filter(s => s).join('. ');
    }
    return text;
  }
}

export default new UnifiedLevelService();