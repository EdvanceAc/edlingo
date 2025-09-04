const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

/**
 * Secure Database Service for Main Process
 * Handles all Supabase operations securely in the main process
 * Prevents key exposure to renderer processes
 */
class DatabaseService {
  constructor() {
    this.supabase = null;
    this.supabaseAdmin = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Supabase clients securely
   * Reads environment variables from .env file or process.env
   */
  async initialize() {
    try {
      // Load environment variables
      const envPath = path.join(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
      const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing required Supabase environment variables');
      }

      // Initialize regular client
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      // Initialize admin client with service role key (if available)
      if (supabaseServiceKey) {
        this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        console.log('✅ Supabase admin client initialized');
      } else {
        console.warn('⚠️ Service role key not found. Admin operations will use regular client.');
        this.supabaseAdmin = this.supabase;
      }

      this.isInitialized = true;
      console.log('✅ Database service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize database service:', error);
      throw error;
    }
  }

  /**
   * Ensure the service is initialized
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Create a new course (admin operation)
   * @param {Object} courseData - Course data to insert
   * @param {boolean} isDraft - Whether this is a draft or published course
   * @returns {Object} Created course data
   */
  async createCourse(courseData, isDraft = false) {
    await this.ensureInitialized();
    
    try {
      console.log('🚀 Creating course in database...', { isDraft });
      
      // Set status based on submission type - commented out as 'status' column doesn't exist in database schema
      const finalCourseData = {
        ...courseData,
        // status: isDraft ? 'draft' : 'published', // Column doesn't exist in courses table
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Use admin client for course creation (requires elevated permissions)
      const { data, error } = await this.supabaseAdmin
        .from('courses')
        .insert([finalCourseData])
        .select();
        
      if (error) {
        console.error('❌ Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('✅ Course created successfully:', data[0]);
      return data[0];
      
    } catch (error) {
      console.error('❌ Error creating course:', error);
      throw error;
    }
  }

  /**
   * Get all courses
   * @returns {Array} List of courses
   */
  async getCourses() {
    await this.ensureInitialized();
    
    try {
      const { data, error } = await this.supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching courses:', error);
      throw error;
    }
  }

  /**
   * Update a course
   * @param {string} courseId - Course ID to update
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated course data
   */
  async updateCourse(courseId, updates) {
    await this.ensureInitialized();
    
    try {
      const finalUpdates = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await this.supabaseAdmin
        .from('courses')
        .update(finalUpdates)
        .eq('id', courseId)
        .select();
        
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data[0];
    } catch (error) {
      console.error('❌ Error updating course:', error);
      throw error;
    }
  }

  /**
   * Delete a course
   * @param {string} courseId - Course ID to delete
   * @returns {boolean} Success status
   */
  async deleteCourse(courseId) {
    await this.ensureInitialized();
    
    try {
      const { error } = await this.supabaseAdmin
        .from('courses')
        .delete()
        .eq('id', courseId);
        
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error deleting course:', error);
      throw error;
    }
  }

  // Existing methods for user progress, vocabulary, etc.
  async getUserProgress(userId) {
    await this.ensureInitialized();
    // Implementation for user progress
    return {};
  }

  async updateUserProgress(userId, progressData) {
    await this.ensureInitialized();
    // Implementation for updating user progress
    return true;
  }

  async getDailyStats(userId, date) {
    await this.ensureInitialized();
    // Implementation for daily stats
    return {};
  }

  async getWeeklyStats(userId, startDate, endDate) {
    await this.ensureInitialized();
    // Implementation for weekly stats
    return {};
  }

  async getVocabulary(userId) {
    await this.ensureInitialized();
    // Implementation for vocabulary
    return [];
  }

  async addVocabulary(userId, word) {
    await this.ensureInitialized();
    // Implementation for adding vocabulary
    return true;
  }

  async updateVocabulary(userId, wordId, updates) {
    await this.ensureInitialized();
    // Implementation for updating vocabulary
    return true;
  }

  /**
   * Create lessons for a course with multimedia support
   * @param {string} courseId - Course ID to create lessons for
   * @param {Array} lessonsData - Array of lesson data
   * @returns {Array} Created lessons data
   */
  async createLessons(courseId, lessonsData) {
    await this.ensureInitialized();
    
    try {
      console.log('🚀 Creating lessons with materials in database...', { courseId, lessonCount: lessonsData.length });
      
      // Use the enhanced database function for multimedia support
      const { data, error } = await this.supabaseAdmin
        .rpc('create_lessons_with_materials', {
          p_course_id: courseId,
          p_lessons: lessonsData
        });
        
      if (error) {
        console.error('❌ Supabase error creating lessons with materials:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('✅ Lessons with materials created successfully:', data.length);
      return data;
      
    } catch (error) {
      console.error('❌ Error creating lessons with materials:', error);
      throw error;
    }
  }

  /**
   * Get lessons for a course with multimedia materials
   * @param {string} courseId - Course ID to get lessons for
   * @returns {Array} List of lessons with materials
   */
  async getLessons(courseId) {
    await this.ensureInitialized();
    
    try {
      // Use the enhanced function to get lessons with all materials
      const { data, error } = await this.supabase
        .rpc('get_course_lessons_with_materials', {
          p_course_id: courseId
        });
        
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      // Group materials by lesson
      const lessonsMap = new Map();
      data.forEach(row => {
        if (!lessonsMap.has(row.lesson_id)) {
          lessonsMap.set(row.lesson_id, {
            id: row.lesson_id,
            title: row.lesson_title,
            description: row.lesson_description,
            order_index: row.lesson_order,
            lesson_type: row.lesson_type,
            duration_minutes: row.duration_minutes,
            difficulty_level: row.difficulty_level,
            learning_objectives: row.learning_objectives,
            is_published: row.is_published,
            created_at: row.created_at,
            updated_at: row.updated_at,
            materials: []
          });
        }
        
        if (row.material_id) {
          lessonsMap.get(row.lesson_id).materials.push({
            id: row.material_id,
            type: row.material_type,
            content: row.material_content,
            order_number: row.material_order,
            file_url: row.file_url,
            file_size: row.file_size,
            file_type: row.file_type,
            duration: row.duration,
            metadata: row.metadata
          });
        }
      });
      
      const lessons = Array.from(lessonsMap.values())
        .sort((a, b) => a.order_index - b.order_index)
        .map(lesson => ({
          ...lesson,
          materials: lesson.materials.sort((a, b) => a.order_number - b.order_number)
        }));
      
      return lessons;
    } catch (error) {
      console.error('❌ Error fetching lessons with materials:', error);
      throw error;
    }
  }

  /**
   * Upload file to Supabase storage
   * @param {File} file - File to upload
   * @param {string} bucket - Storage bucket name
   * @param {string} path - File path in storage
   * @returns {Object} Upload result with public URL
   */
  async uploadFile(file, bucket = 'lesson-content', path = '') {
    await this.ensureInitialized();

    try {
      console.log('🚀 Uploading file to storage...', { fileName: file.name, bucket, path });

      const supabaseStorageService = (await import('../renderer/services/supabaseStorageService.js')).default;
      const folder = path ? path.split('/').slice(0, -1).join('/') : '';
      const result = await supabaseStorageService.uploadFile(file, bucket, folder);

      console.log('✅ File uploaded successfully:', result.url);
      return {
        path: result.path,
        publicUrl: result.url
      };

    } catch (error) {
      console.error('❌ Error uploading file:', error);
      throw error;
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;