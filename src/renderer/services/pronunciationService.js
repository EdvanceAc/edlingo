import supabaseService from './supabaseService';
import supabaseGeminiService from './supabaseGeminiService';

class PronunciationService {
  constructor() {
    this.recognition = null;
    this.currentTask = null;
  }

  async startPronunciationAssessment(userId, word, phonetic) {
    try {
      const { data: session, error } = await supabaseService.createAssessmentSession(userId, 'pronunciation');
      if (error) throw error;

      const taskData = {
        session_id: session.id,
        task_type: 'pronunciation',
        prompt: `Pronounce: ${word} (${phonetic})`,
      };
      const { data: task, error: taskError } = await supabaseService.client.from('assessment_tasks').insert([taskData]).select().single();
      if (taskError) throw taskError;

      this.currentTask = task;
      this.startRecognition();
      return { success: true, taskId: task.id };
    } catch (error) {
      console.error('Failed to start pronunciation assessment:', error);
      return { success: false, error: error.message };
    }
  }

  startRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error('Speech recognition not supported');
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      await this.analyzePronunciation(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error('Recognition error:', event.error);
    };

    this.recognition.start();
  }

  stopRecognition() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }

  async analyzePronunciation(transcript) {
    try {
      const prompt = `Analyze pronunciation of "${transcript}" compared to expected "${this.currentTask.prompt}". Provide feedback on intonation, accuracy, and suggestions. Output in JSON with keys: score (0-100), feedback, cefr_level.`;
      const { response } = await supabaseGeminiService.sendMessage(prompt);
      const analysis = JSON.parse(response);

      const updateData = {
        user_response: transcript,
        score: analysis.score,
        ai_feedback: { feedback: analysis.feedback, cefr_level: analysis.cefr_level },
        completed_at: new Date().toISOString(),
      };
      const { error } = await supabaseService.client.from('assessment_tasks').update(updateData).eq('id', this.currentTask.id);
      if (error) throw error;

      this.currentTask = null;
      return { success: true, analysis };
    } catch (error) {
      console.error('Failed to analyze pronunciation:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new PronunciationService();