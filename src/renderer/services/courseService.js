import adminDatabaseService from './adminDatabaseService.js';

/**
 * Secure Course Service for Renderer Process
 * Communicates with main process via IPC for secure database operations
 * Prevents Supabase key exposure in renderer process
 */
class CourseService {
  constructor() {
    this.electronAPI = typeof window !== 'undefined' ? window.electronAPI : undefined;
    this.fallbackService = adminDatabaseService;
    
    if (!this.electronAPI) {
      console.warn('⚠️ Electron API not available. Falling back to Supabase/admin service for course operations.');
    }
  }

  // Ensure the fallback service is initialized before use
  async ensureFallbackReady() {
    try {
      if (this.fallbackService && typeof this.fallbackService.isReady === 'function') {
        if (!this.fallbackService.isReady()) {
          if (typeof this.fallbackService.initialize === 'function') {
            await this.fallbackService.initialize();
          }
        }
      }
    } catch (err) {
      console.error('Failed to initialize fallback course service:', err);
      throw err;
    }
  }

  /**
   * Create a new course
   * @param {Object} courseData - Course data to create
   * @param {boolean} isDraft - Whether this is a draft or published course
   * @returns {Promise<Object>} Created course data
   */
  async createCourse(courseData, isDraft = false) {
    try {
      console.log('🚀 Creating course...', { isDraft, via: this.electronAPI ? 'IPC' : 'Fallback' });
      
      if (!this.electronAPI) {
        await this.ensureFallbackReady();
        if (this.fallbackService?.createCourse) {
          return await this.fallbackService.createCourse(courseData);
        }
        throw new Error('Course creation not available in this environment');
      }
      
      const result = await this.electronAPI.invoke('db:createCourse', courseData, isDraft);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create course');
      }
      
      console.log('✅ Course created successfully:', result.course);
      return result.course;
      
    } catch (error) {
      console.error('❌ Error creating course:', error);
      throw error;
    }
  }

  /**
   * Get all courses
   * @returns {Promise<Array>} List of courses
   */
  async getCourses() {
    try {
      if (!this.electronAPI) {
        await this.ensureFallbackReady();
        if (this.fallbackService?.getCourses) {
          return await this.fallbackService.getCourses();
        }
        throw new Error('Course listing not available in this environment');
      }
      
      const result = await this.electronAPI.invoke('db:getCourses');
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch courses');
      }
      
      return result.courses || [];
      
    } catch (error) {
      console.error('❌ Error fetching courses:', error);
      throw error;
    }
  }

  /**
   * Update a course
   * @param {string} courseId - Course ID to update
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated course data
   */
  async updateCourse(courseId, updates) {
    try {
      if (!this.electronAPI) {
        await this.ensureFallbackReady();
        if (this.fallbackService?.updateCourse) {
          return await this.fallbackService.updateCourse(courseId, updates);
        }
        throw new Error('Course update not available in this environment');
      }
      
      const result = await this.electronAPI.invoke('db:updateCourse', courseId, updates);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update course');
      }
      
      return result.course;
      
    } catch (error) {
      console.error('❌ Error updating course:', error);
      throw error;
    }
  }

  /**
   * Delete a course
   * @param {string} courseId - Course ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteCourse(courseId) {
    try {
      if (!this.electronAPI) {
        await this.ensureFallbackReady();
        if (this.fallbackService?.deleteCourse) {
          return await this.fallbackService.deleteCourse(courseId);
        }
        throw new Error('Course deletion not available in this environment');
      }
      
      const result = await this.electronAPI.invoke('db:deleteCourse', courseId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete course');
      }
      
      return result.deleted;
      
    } catch (error) {
      console.error('❌ Error deleting course:', error);
      throw error;
    }
  }

  /**
   * Validate course data before submission
   * @param {Object} courseData - Course data to validate
   * @returns {Array} Array of validation errors (empty if valid)
   */
  validateCourseData(courseData) {
    const errors = [];
    
    // Required fields validation
    if (!courseData.title || courseData.title.trim() === '') {
      errors.push('Course title is required');
    }
    
    if (!courseData.description || courseData.description.trim() === '') {
      errors.push('Course description is required');
    }
    
    if (!courseData.language || courseData.language.trim() === '') {
      errors.push('Course language is required');
    }
    
    if (!courseData.difficulty_level || courseData.difficulty_level.trim() === '') {
      errors.push('Difficulty level is required');
    }
    
    // Validate difficulty level
    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    if (courseData.difficulty_level && !validDifficulties.includes(courseData.difficulty_level.toLowerCase())) {
      errors.push('Invalid difficulty level. Must be: beginner, intermediate, or advanced');
    }
    
    // Validate duration if provided
    if (courseData.estimated_duration && (isNaN(courseData.estimated_duration) || courseData.estimated_duration <= 0)) {
      errors.push('Estimated duration must be a positive number');
    }
    
    // Validate price if provided
    if (courseData.price && (isNaN(courseData.price) || courseData.price < 0)) {
      errors.push('Price must be a non-negative number');
    }
    
    return errors;
  }
}

// Create singleton instance
const courseService = new CourseService();

export default courseService;