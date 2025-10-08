// Standalone Supabase Storage Service for Admin Dashboard
// This version has no React dependencies and can be used in standalone HTML files

class SupabaseStorageService {
  constructor() {
    this.buckets = {
      courses: 'course-materials',
      assignments: 'assignment-materials',
      shared: 'shared-resources',
      answers: 'lesson-answers'
    };
  }

  /**
   * Get Supabase client from window object (set by admin-dashboard.html)
   */
  getSupabaseClient() {
    if (typeof window !== 'undefined' && window.supabaseClient) {
      return window.supabaseClient;
    }
    throw new Error('Supabase client not found. Make sure it is initialized in the HTML file.');
  }

  /**
   * Get an admin-capable client for storage operations.
   * Prefers window.supabaseAdminClient if available, otherwise falls back to regular client.
   */
  getStorageAdminClient() {
    if (typeof window !== 'undefined' && window.supabaseAdminClient) {
      return window.supabaseAdminClient;
    }
    return this.getSupabaseClient();
  }

  /**
   * Ensure bucket exists, create if it doesn't
   * @param {string} bucketName 
   * @returns {Promise<boolean>}
   */
  async ensureBucket(bucketName) {
    try {
      // Try using an admin-capable client first (service role key in browser)
      const adminClient = this.getStorageAdminClient();
      try {
        const { data: buckets, error } = await adminClient.storage.listBuckets();
        if (error) {
          throw error;
        }

        const bucket = buckets.find(bucket => bucket.name === bucketName);

        if (!bucket) {
          const { error: createError } = await adminClient.storage.createBucket(bucketName, {
            public: true,
            allowedMimeTypes: [
              'image/*',
              'image/svg+xml',
              'video/*',
              'audio/*',
              'application/pdf',
              'text/*',
              'application/json',
              'application/zip',
              'application/x-zip-compressed'
            ],
            fileSizeLimit: 52428800 // 50MB
          });

          if (createError) {
            console.error(`Failed to create bucket ${bucketName}:`, createError);
            return false;
          }

          console.log(`✅ Created bucket: ${bucketName}`);
        }

        return true;
      } catch (adminError) {
        console.warn('Admin client failed, trying regular client:', adminError.message);
        
        // Fallback to regular client
        const regularClient = this.getSupabaseClient();
        const { data: buckets, error } = await regularClient.storage.listBuckets();
        if (error) {
          throw error;
        }

        const bucket = buckets.find(bucket => bucket.name === bucketName);
        return Boolean(bucket);
      }
    } catch (error) {
      console.error(`Error ensuring bucket ${bucketName}:`, error);
      return false;
    }
  }

  /**
   * Generate a unique filename with timestamp and random suffix
   * @param {string} originalName 
   * @param {string} category 
   * @returns {string}
   */
  generateFileName(originalName, category = '') {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const baseName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_');
    
    const categoryPrefix = category ? `${category}/` : '';
    return `${categoryPrefix}${baseName}_${timestamp}_${randomSuffix}.${extension}`;
  }

  /**
   * Upload a single file to Supabase storage
   * @param {File} file 
   * @param {string} bucketName 
   * @param {string} category 
   * @param {Object} metadata 
   * @param {Function} onProgress 
   * @returns {Promise<Object>}
   */
  async uploadFile(file, bucketName, category = '', metadata = {}, onProgress = null) {
    try {
      // Ensure bucket exists
      const bucketExists = await this.ensureBucket(bucketName);
      if (!bucketExists) {
        throw new Error(`Bucket ${bucketName} does not exist and could not be created`);
      }

      const fileName = this.generateFileName(file.name, category);
      const client = this.getSupabaseClient();

      // Upload file
      const { data, error } = await client.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          ...metadata
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = client.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      return {
        success: true,
        data: {
          path: data.path,
          fullPath: data.fullPath,
          publicUrl: urlData.publicUrl,
          fileName: fileName,
          originalName: file.name,
          size: file.size,
          type: file.type
        }
      };

    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload multiple files
   * @param {FileList|Array} files 
   * @param {string} bucketName 
   * @param {string} category 
   * @returns {Promise<Array>}
   */
  async uploadFiles(files, bucketName, category = '') {
    const results = [];
    
    for (const file of files) {
      const result = await this.uploadFile(file, bucketName, category);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Upload course-related files
   * @param {FileList|Array} files 
   * @param {string} courseId 
   * @param {string} subcategory 
   * @returns {Promise<Array>}
   */
  async uploadCourseFiles(files, courseId = null, subcategory = null) {
    const category = courseId ? `course_${courseId}${subcategory ? `/${subcategory}` : ''}` : 'general';
    return this.uploadFiles(files, this.buckets.courses, category);
  }

  /**
   * Upload lesson answer files
   * @param {FileList|Array} files 
   * @param {string} lessonId 
   * @param {string} userId 
   * @returns {Promise<Array>}
   */
  async uploadAnswerFiles(files, lessonId, userId) {
    const category = `lesson_${lessonId}/user_${userId}`;
    return this.uploadFiles(files, this.buckets.answers, category);
  }

  /**
   * Upload assignment-related files
   * @param {FileList|Array} files 
   * @param {string} assignmentId 
   * @param {string} subcategory 
   * @returns {Promise<Array>}
   */
  async uploadAssignmentFiles(files, assignmentId = null, subcategory = null) {
    const category = assignmentId ? `assignment_${assignmentId}${subcategory ? `/${subcategory}` : ''}` : 'general';
    return this.uploadFiles(files, this.buckets.assignments, category);
  }

  /**
   * List files in a bucket/folder
   * @param {string} bucketName 
   * @param {string} folder 
   * @returns {Promise<Array>}
   */
  async listFiles(bucketName, folder = '') {
    try {
      const client = this.getSupabaseClient();
      const { data, error } = await client.storage
        .from(bucketName)
        .list(folder, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        throw error;
      }

      // Return an array for API compatibility with renderer service
      return data.map(file => ({
        ...file,
        publicUrl: this.getFileUrl(bucketName, folder ? `${folder}/${file.name}` : file.name)
      }));

    } catch (error) {
      console.error('List files error:', error);
      // Return empty array on failure for safe consumers
      return [];
    }
  }

  /**
   * Delete a file from storage
   * @param {string} bucketName 
   * @param {string} filePath 
   * @returns {Promise<Object>}
   */
  async deleteFile(bucketName, filePath) {
    try {
      const client = this.getSupabaseClient();
      const { data, error } = await client.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      return {
        success: true,
        data
      };

    } catch (error) {
      console.error('Delete file error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get public URL for a file
   * @param {string} bucketName 
   * @param {string} filePath 
   * @returns {string}
   */
  getFileUrl(bucketName, filePath) {
    try {
      const client = this.getSupabaseClient();
      const { data } = client.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Get file URL error:', error);
      return null;
    }
  }

  /**
   * Get storage usage statistics
   * @returns {Promise<Object>}
   */
  async getStorageStats() {
    try {
      const stats = {};
      
      for (const [key, bucketName] of Object.entries(this.buckets)) {
        const result = await this.listFiles(bucketName);
        if (result.success) {
          stats[key] = {
            fileCount: result.data.length,
            totalSize: result.data.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
          };
        }
      }
      
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Create and export instance
const supabaseStorageService = new SupabaseStorageService();

// Export for both ES modules and global access
if (typeof window !== 'undefined') {
  window.supabaseStorageService = supabaseStorageService;
}

export default supabaseStorageService;
export { SupabaseStorageService };