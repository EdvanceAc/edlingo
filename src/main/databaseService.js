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
      
      // Try RPC first (if available in the DB)
      const { data, error } = await this.supabaseAdmin
        .rpc('upsert_lessons_with_materials', {
          p_course_id: courseId,
          p_lessons: lessonsData
        });
        
      if (!error) {
        console.log('✅ Lessons with materials created successfully:', data?.length || 0);
        return data;
      }
      
      console.warn('[createLessons] upsert_lessons_with_materials failed, falling back:', error.message);
    } catch (error) {
      console.warn('[createLessons] RPC threw, falling back to direct inserts:', error.message);
    }

    // Fallback path using term-based schema only
    try {
      const termId = await this.getOrCreateDefaultTerm(courseId);
      const results = [];

      for (const lesson of lessonsData) {
        const orderNumber = Number(lesson.order_number ?? lesson.order_index ?? 0) || 0;
        const baseLesson = {
          term_id: termId,
          name: lesson.title || 'Lesson',
          title: lesson.title || 'Lesson',
          description: lesson.description || '',
          order_number: orderNumber,
          content: lesson
        };

        const { data: ins, error: insErr } = await this.supabaseAdmin
          .from('lessons')
          .insert([baseLesson])
          .select('id')
          .single();
        
        if (insErr) {
          throw new Error(`Insert lesson failed: ${insErr.message}`);
        }
        
        const newLessonId = ins.id;

        // Insert materials if present (best effort)
        if (Array.isArray(lesson.materials) && lesson.materials.length) {
          const materialsRows = lesson.materials.map(m => ({
            lesson_id: newLessonId,
            type: m.type || null,
            url: m.file_url || m.url || null,
            content: m.content || null,
            metadata: m.metadata || {}
          }));

          const { error: matErr } = await this.supabaseAdmin
            .from('lesson_materials')
            .insert(materialsRows);
          
          if (matErr) {
            console.warn('[createLessons] Materials insert warning:', matErr.message);
          }
        }

        results.push({
          lesson_id: newLessonId,
          lesson_title: baseLesson.title,
          materials_count: Array.isArray(lesson.materials) ? lesson.materials.length : 0,
          operation: 'created'
        });
      }

      console.log('✅ Lessons created via fallback inserts:', results.length);
      return results;
    } catch (fallbackErr) {
      console.error('❌ Error creating lessons with materials (fallback):', fallbackErr);
      throw fallbackErr;
    }
  }

  // Helper: ensure a default term exists for the course (no reliance on terms.name)
  async getOrCreateDefaultTerm(courseId) {
    await this.ensureInitialized();

    // Try to find an existing term
    const { data: termRows, error: termErr } = await this.supabaseAdmin
      .from('terms')
      .select('id')
      .eq('course_id', courseId)
      .order('order_number', { ascending: true })
      .limit(1);

    if (termErr) {
      throw new Error(`Term lookup failed: ${termErr.message}`);
    }

    if (termRows && termRows.length) {
      return termRows[0].id;
    }

    // Create a minimal default term (avoid referencing a possibly missing name column)
    const { data: created, error: createErr } = await this.supabaseAdmin
      .from('terms')
      .insert([{ course_id: courseId, description: 'Default term for course lessons', order_number: 1 }])
      .select('id')
      .single();

    if (createErr) {
      throw new Error(`Term creation failed: ${createErr.message}`);
    }

    return created.id;
  }

  /**
   * Get lessons for a course with multimedia materials
   * @param {string} courseId - Course ID to get lessons for
   * @returns {Array} List of lessons with materials
   */
  async getLessons(courseId) {
    await this.ensureInitialized();
    
    try {
      // Try the enhanced function first
      const { data, error } = await this.supabase
        .rpc('get_course_lessons_with_materials', {
          p_course_id: courseId
        });
        
      if (!error) {
        // Group materials by lesson
        const lessonsMap = new Map();
        (data || []).forEach(row => {
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
              file_url: row.file_url || row.url,
              file_size: row.file_size,
              file_type: row.file_type,
              duration: row.duration,
              metadata: row.metadata
            });
          }
        });
        
        const lessons = Array.from(lessonsMap.values())
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map(lesson => ({
            ...lesson,
            materials: lesson.materials.sort((a, b) => (a.order_number ?? 0) - (b.order_number ?? 0))
          }));
        
        return lessons;
      }

      console.warn('[getLessons] get_course_lessons_with_materials failed, using fallback:', error.message);
    } catch (error) {
      console.warn('[getLessons] RPC threw, using fallback:', error.message);
    }

    // Fallback path: term-based fetches only
    try {
      // 1) Find terms for this course
      const { data: terms, error: termErr } = await this.supabase
        .from('terms')
        .select('id')
        .eq('course_id', courseId);

      if (termErr) {
        throw new Error(`Database error: ${termErr.message}`);
      }

      if (!terms || !terms.length) {
        return [];
      }

      const termIds = terms.map(t => t.id);

      // 2) Fetch lessons under these terms
      const { data: lessonRows, error: lessonsErr } = await this.supabase
        .from('lessons')
        .select('id, title, description, order_number, content, created_at, updated_at')
        .in('term_id', termIds)
        .order('order_number', { ascending: true });

      if (lessonsErr) {
        throw new Error(`Database error: ${lessonsErr.message}`);
      }

      if (!lessonRows || !lessonRows.length) {
        return [];
      }

      const lessonIds = lessonRows.map(l => l.id);

      // 3) Fetch materials for these lessons
      const { data: materialRows, error: materialsErr } = await this.supabase
        .from('lesson_materials')
        .select('id, lesson_id, type, url, content, metadata')
        .in('lesson_id', lessonIds);

      if (materialsErr) {
        console.warn('[getLessons] Materials fetch warning:', materialsErr.message);
      }

      const materialsByLesson = new Map();
      (materialRows || []).forEach(m => {
        if (!materialsByLesson.has(m.lesson_id)) materialsByLesson.set(m.lesson_id, []);
        materialsByLesson.get(m.lesson_id).push({
          id: m.id,
          type: m.type,
          content: m.content,
          order_number: 0,
          file_url: m.url,
          metadata: m.metadata
        });
      });

      const lessons = lessonRows
        .map(row => ({
          id: row.id,
          title: row.title || (row.content?.title) || '',
          description: row.description || '',
          order_index: row.order_number ?? 0,
          lesson_type: row.content?.type || 'content',
          duration_minutes: row.content?.duration || null,
          difficulty_level: row.content?.level || null,
          learning_objectives: row.content?.objectives || [],
          is_published: row.content?.is_published ?? null,
          created_at: row.created_at,
          updated_at: row.updated_at,
          materials: materialsByLesson.get(row.id) || []
        }))
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

      return lessons;
    } catch (fallbackErr) {
      console.error('❌ Error fetching lessons with materials (fallback):', fallbackErr);
      throw fallbackErr;
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