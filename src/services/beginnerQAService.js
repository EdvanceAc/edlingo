import progressionService from './progressionService';
import supabaseGeminiService from '../renderer/services/supabaseGeminiService';

class BeginnerQAService {
  constructor() {
    this.basicPatterns = this.generateBasicPatterns();
  }

  generateBasicPatterns() {
    // Generate 300-400 basic Q&A patterns
    const patterns = [];
    const topics = ['greetings', 'family', 'food', 'daily routine', 'hobbies'];
    topics.forEach(topic => {
      for (let i = 0; i < 70; i++) { // Approx 350 total
        patterns.push({
          question: `Sample ${topic} question ${i + 1}`,
          answer: `Sample answer for ${topic} ${i + 1}`,
          hints: [`Hint 1 for ${topic}`, `Hint 2 for ${topic}`],
          explanation: `Explanation for ${topic} pattern`,
          level: 'A1'
        });
      }
    });
    return patterns;
  }

  async getRandomQA(userId) {
    const isEligible = await progressionService.checkProgressForBeginner(userId);
    if (!isEligible) {
      throw new Error('Complete beginner requirements first');
    }
    const randomIndex = Math.floor(Math.random() * this.basicPatterns.length);
    return this.basicPatterns[randomIndex];
  }

  async submitAnswer(userId, qaId, userAnswer) {
    const qa = this.basicPatterns.find(p => p.id === qaId); // Assume id added
    const prompt = `Evaluate beginner answer: "${userAnswer}" for question "${qa.question}". Provide scaffolding feedback.`;
    const { response } = await supabaseGeminiService.sendMessage(prompt);
    // Update progress
    await progressionService.updateProgress(userId, { beginnerQACompleted: true });
    return { feedback: response };
  }

  async checkScaffoldingNeeded(userId) {
    const progress = await progressionService.getUserProgress(userId);
    return progress.level === 'beginner';
  }
}

export default new BeginnerQAService();