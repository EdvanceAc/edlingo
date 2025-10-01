import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../../renderer/hooks/use-toast';

const QuestionForm = ({ question, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    question: '',
    type: 'multiple-choice',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    difficulty: 'medium',
    points: 1
  });

  // Initialize toast
  const { error: toastError } = useToast();

  useEffect(() => {
    if (question) {
      setFormData({
        question: question.question || '',
        type: question.type || 'multiple-choice',
        options: question.options || ['', '', '', ''],
        correct_answer: question.correct_answer || '',
        explanation: question.explanation || '',
        difficulty: question.difficulty || 'medium',
        points: question.points || 1
      });
    }
  }, [question]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.question.trim()) {
      toastError('Please enter a question');
      return;
    }

    if (formData.type === 'multiple-choice') {
      const validOptions = formData.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        toastError('Please provide at least 2 options');
        return;
      }
      if (!formData.correct_answer.trim()) {
        toastError('Please select a correct answer');
        return;
      }
    }

    // Clean up options for multiple choice
    const cleanedData = {
      ...formData,
      options: formData.type === 'multiple-choice' 
        ? formData.options.filter(opt => opt.trim())
        : undefined
    };

    onSave(cleanedData);
  };

  const updateOption = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, '']
    });
  };

  const removeOption = (index) => {
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ 
      ...formData, 
      options: newOptions,
      correct_answer: formData.correct_answer === formData.options[index] ? '' : formData.correct_answer
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {question ? 'Edit Question' : 'Add New Question'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 hover:bg-muted rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Question Type */}
      <div>
        <label className="block text-sm font-medium mb-2">Question Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
        >
          <option value="multiple-choice">Multiple Choice</option>
          <option value="true-false">True/False</option>
          <option value="short-answer">Short Answer</option>
          <option value="essay">Essay</option>
        </select>
      </div>

      {/* Question Text */}
      <div>
        <label className="block text-sm font-medium mb-2">Question *</label>
        <textarea
          value={formData.question}
          onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          placeholder="Enter your question here..."
          className="w-full px-3 py-2 border border-border rounded-lg bg-background h-24 resize-none"
          required
        />
      </div>

      {/* Multiple Choice Options */}
      {formData.type === 'multiple-choice' && (
        <div>
          <label className="block text-sm font-medium mb-2">Answer Options *</label>
          <div className="space-y-2">
            {formData.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="correct_answer"
                  checked={formData.correct_answer === option}
                  onChange={() => setFormData({ ...formData, correct_answer: option })}
                  className="text-primary"
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
                />
                {formData.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {formData.options.length < 6 && (
              <button
                type="button"
                onClick={addOption}
                className="flex items-center space-x-2 text-primary hover:bg-primary/10 px-3 py-2 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Add Option</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* True/False */}
      {formData.type === 'true-false' && (
        <div>
          <label className="block text.sm font-medium mb-2">Correct Answer *</label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="tf_answer"
                value="true"
                checked={formData.correct_answer === 'true'}
                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                className="text-primary"
              />
              <span>True</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="tf_answer"
                value="false"
                checked={formData.correct_answer === 'false'}
                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                className="text-primary"
              />
              <span>False</span>
            </label>
          </div>
        </div>
      )}

      {/* Short Answer/Essay Correct Answer */}
      {(formData.type === 'short-answer' || formData.type === 'essay') && (
        <div>
          <label className="block text-sm font-medium mb-2">
            {formData.type === 'essay' ? 'Sample Answer' : 'Correct Answer'}
          </label>
          <textarea
            value={formData.correct_answer}
            onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
            placeholder={formData.type === 'essay' ? 'Provide a sample answer or key points...' : 'Enter the correct answer...'}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background h-20 resize-none"
          />
        </div>
      )}

      {/* Explanation */}
      <div>
        <label className="block text-sm font-medium mb-2">Explanation (Optional)</label>
        <textarea
          value={formData.explanation}
          onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
          placeholder="Explain why this is the correct answer..."
          className="w-full px-3 py-2 border border-border rounded-lg bg-background h-20 resize-none"
        />
      </div>

      {/* Difficulty and Points */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Difficulty</label>
          <select
            value={formData.difficulty}
            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Points</label>
          <input
            type="number"
            min="1"
            max="10"
            value={formData.points}
            onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{question ? 'Update Question' : 'Save Question'}</span>
        </button>
      </div>
    </form>
  );
};

export default QuestionForm;