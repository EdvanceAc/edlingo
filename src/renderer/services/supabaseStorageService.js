import { supabase } from '../config/supabaseConfig.js';

class SupabaseStorageService {
  constructor() {
    this.buckets = {
      courses: 'course-materials',
      assignments: 'assignment-materials',
      shared: 'shared-resources'
    };
  }

  /**
   * Get an admin-capable client for storage operations.
   * Prefers window.supabaseAdminClient if available, otherwise falls back to regular client.
   */
  getStorageAdminClient() {
    if (typeof window !== 'undefined' && window.supabaseAdminClient) {
      return window.supabaseAdminClient;
    }
    return supabase;
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
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ],
            fileSizeLimit: 50 * 1024 * 1024 // 50MB
          });

          if (createError) {
            console.error('Error creating bucket (admin client):', createError);
            throw createError;
          }

          console.log(`Bucket '${bucketName}' created successfully (admin client)`);
        } else {
          const allowed = bucket.allowed_mime_types || [];
          const desiredAllowed = [
            'image/*',
            'image/svg+xml',
            'video/*',
            'audio/*',
            'application/pdf',
            'text/*',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ];
          const missing = desiredAllowed.filter(t => !allowed.includes(t));
          if (missing.length > 0) {
            const { error: updateError } = await adminClient.storage.updateBucket(bucketName, {
              allowedMimeTypes: Array.from(new Set([...allowed, ...missing]))
            });

            if (updateError) {
              console.error('Error updating bucket (admin client):', updateError);
              throw updateError;
            }

            console.log(`Bucket '${bucketName}' updated to allow additional MIME types (admin client)`);
          }
        }

        return true;
      } catch (adminErr) {
        // If admin route not available in browser, try backend API fallback
        console.warn('Admin storage operations failed in browser, trying server API fallback:', adminErr?.message || adminErr);
        try {
          const resp = await fetch('/api/storage/ensure-bucket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bucketName })
          });
          if (!resp.ok) {
            const text = await resp.text();
            console.error('Server ensure-bucket HTTP error:', resp.status, text);
            return false;
          }
          const json = await resp.json();
          if (json && json.ok) {
            console.log(`Bucket '${bucketName}' ensured via server API.`);
            return true;
          }
          console.error('Server ensure-bucket failed:', json?.error || 'Unknown error');
          return false;
        } catch (serverErr) {
          console.error('Server API fallback for ensure-bucket failed:', serverErr);
          return false;
        }
      }
    } catch (error) {
      console.error('Error ensuring bucket:', error);
      return false;
    }
  }

  /**
   * Generate unique file name
   * @param {string} originalName 
   * @param {string} category 
   * @returns {string}
   */
  generateFileName(originalName, category = '') {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const baseName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_');
    
    const prefix = category ? `${category}/` : '';
    return `${prefix}${timestamp}_${randomString}_${baseName}.${extension}`;
  }

  /**
   * Upload a single file to Supabase Storage
   * @param {File} file 
   * @param {string} bucketName 
   * @param {string} category 
   * @param {Function} onProgress 
   * @returns {Promise<Object>}
   */
  async uploadFile(file, bucketName, category = '', metadata = {}, onProgress = null) {
    try {
      // Ensure bucket exists
      const bucketReady = await this.ensureBucket(bucketName);
      if (!bucketReady) {
        throw new Error(`Failed to ensure bucket '${bucketName}' exists`);
      }

      const fileName = this.generateFileName(file.name, category);

      const { contentType, ...meta } = metadata || {};
      const uploadOptions = {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType || file.type,
        metadata: meta
      };

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, uploadOptions);

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      return {
        id: data.path,
        name: file.name,
        originalName: file.name,
        fileName: fileName,
        path: data.path,
        fullPath: data.fullPath,
        size: file.size,
        type: file.type,
        url: urlData.publicUrl,
        bucket: bucketName,
        category: category,
        metadata: metadata,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   * @param {File[]} files 
   * @param {string} bucketName 
   * @param {string} category 
   * @returns {Promise<Object>}
   */
  async uploadFiles(files, bucketName, category = '') {
    const results = {
      successful: [],
      failed: []
    };

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, bucketName, category);
        results.successful.push({
          file: file.name,
          ...result
        });
      } catch (error) {
        results.failed.push({
          file: file.name,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Upload course files
   * @param {File[]} files 
   * @param {string} courseId 
   * @param {string} subcategory 
   * @returns {Promise<Object>}
   */
  async uploadCourseFiles(files, courseId = null, subcategory = null) {
    const category = subcategory || 'general';
    return await this.uploadFiles(files, this.buckets.courses, category);
  }

  /**
   * Upload assignment files
   * @param {File[]} files 
   * @param {string} assignmentId 
   * @param {string} subcategory 
   * @returns {Promise<Object>}
   */
  async uploadAssignmentFiles(files, assignmentId = null, subcategory = null) {
    const category = subcategory || 'general';
    return await this.uploadFiles(files, this.buckets.assignments, category);
  }

  /**
   * List files in a bucket
   * @param {string} bucketName 
   * @param {string} folder 
   * @returns {Promise<Array>}
   */
  async listFiles(bucketName, folder = '') {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(folder, {
          limit: 100,
          offset: 0
        });

      if (error) {
        throw new Error(`Failed to list files: ${error.message}`);
      }

      return data.map(file => ({
        id: file.name,
        name: file.name,
        size: file.metadata?.size || 0,
        type: file.metadata?.mimetype || 'unknown',
        lastModified: file.updated_at,
        bucket: bucketName,
        folder: folder
      }));
    } catch (error) {
      console.error('List files error:', error);
      throw error;
    }
  }

  /**
   * Delete a file
   * @param {string} bucketName 
   * @param {string} filePath 
   * @returns {Promise<boolean>}
   */
  async deleteFile(bucketName, filePath) {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Delete file error:', error);
      throw error;
    }
  }

  /**
   * Get file public URL
   * @param {string} bucketName 
   * @param {string} filePath 
   * @returns {string}
   */
  getFileUrl(bucketName, filePath) {
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>}
   */
  async getStorageStats() {
    try {
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        buckets: {}
      };

      for (const [key, bucketName] of Object.entries(this.buckets)) {
        try {
          const files = await this.listFiles(bucketName);
          const bucketStats = {
            count: files.length,
            size: files.reduce((total, file) => total + (file.size || 0), 0)
          };
          
          stats.buckets[key] = bucketStats;
          stats.totalFiles += bucketStats.count;
          stats.totalSize += bucketStats.size;
        } catch (error) {
          console.warn(`Failed to get stats for bucket ${bucketName}:`, error);
          stats.buckets[key] = { count: 0, size: 0 };
        }
      }

      return stats;
    } catch (error) {
      console.error('Get storage stats error:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const supabaseStorageService = new SupabaseStorageService();
export default supabaseStorageService;
export { SupabaseStorageService };