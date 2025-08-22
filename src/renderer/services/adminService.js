import { supabase } from '../config/supabaseConfig.js';
import supabaseStorageService from './supabaseStorageService.js';
import bcrypt from 'bcryptjs';
import googleDriveService from './googleDriveService';
import { AppConfig } from '../../config/AppConfig';
import adminDatabaseService from './adminDatabaseService.js';

class AdminService {
  constructor() {
    this.googleDriveService = googleDriveService;
    this.storageService = supabaseStorageService;
    this.currentAdmin = null;
    this.isAuthenticated = false;
    this.adminCredentials = {
      username: 'admin',
      password: 'admin123' // In production, this should be properly secured
    };
    this.initializeDatabase();
  }

  /**
   * Initialize database service
   */
  async initializeDatabase() {
    try {
      await adminDatabaseService.initialize();
      console.log('Admin database service initialized');
    } catch (error) {
      console.error('Failed to initialize admin database service:', error);
    }
  }

  /**
   * Authenticate admin user
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise<boolean>}
   */
  async authenticate(username, password) {
    try {
      // Simple authentication - in production, use proper auth service
      if (username === this.adminCredentials.username && password === this.adminCredentials.password) {
        this.isAuthenticated = true;
        localStorage.setItem('admin_authenticated', 'true');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Admin authentication error:', error);
      return false;
    }
  }

  /**
   * Check if admin is authenticated
   * @returns {boolean}
   */
  isAdminAuthenticated() {
    return this.isAuthenticated || localStorage.getItem('admin_authenticated') === 'true';
  }

  /**
   * Logout admin
   */
  logout() {
    this.isAuthenticated = false;
    localStorage.removeItem('admin_authenticated');
  }

  /**
   * Upload file to Google Drive
   * @param {File} file 
   * @param {string} category 
   * @param {string} subcategory 
   * @param {Function} onProgress 
   * @returns {Promise<Object>}
   */
  async uploadFile(file, category = 'shared_resources', subcategory = null, onProgress = null) {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const result = await this.googleDriveService.uploadFile(file, category, subcategory, onProgress);
      return result;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  /**
   * List files from Google Drive
   * @param {string} category 
   * @param {string} subcategory 
   * @returns {Promise<Array>}
   */
  async listFiles(category = null, subcategory = null) {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const files = await this.googleDriveService.listFiles(category, subcategory);
      return files;
    } catch (error) {
      console.error('File listing error:', error);
      throw error;
    }
  }

  /**
   * Delete file from Google Drive
   * @param {string} fileId 
   * @returns {Promise<boolean>}
   */
  async deleteFile(fileId) {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const result = await this.googleDriveService.deleteFile(fileId);
      return result;
    } catch (error) {
      console.error('File deletion error:', error);
      throw error;
    }
  }

  /**
   * Get file download URL
   * @param {string} fileId 
   * @returns {Promise<string>}
   */
  async getFileUrl(fileId) {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const url = await this.googleDriveService.getFileUrl(fileId);
      return url;
    } catch (error) {
      console.error('Get file URL error:', error);
      throw error;
    }
  }

  /**
   * Get system statistics
   * @returns {Promise<Object>}
   */
  async getSystemStats() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        categories: {},
        lastUpdated: new Date().toISOString()
      };

      // Get files from all categories
      const allFiles = await this.googleDriveService.listFiles();
      stats.totalFiles = allFiles.length;
      stats.totalSize = allFiles.reduce((total, file) => total + (file.size || 0), 0);

      // Group by categories
      allFiles.forEach(file => {
        const category = file.category || 'uncategorized';
        if (!stats.categories[category]) {
          stats.categories[category] = {
            count: 0,
            size: 0
          };
        }
        stats.categories[category].count++;
        stats.categories[category].size += file.size || 0;
      });

      return stats;
    } catch (error) {
      console.error('Get system stats error:', error);
      throw error;
    }
  }

  /**
   * Initialize Google Drive service
   * @returns {Promise<boolean>}
   */
  async initializeGoogleDrive() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const result = await this.googleDriveService.initialize();
      return result;
    } catch (error) {
      console.error('Google Drive initialization error:', error);
      throw error;
    }
  }

  /**
   * Check Google Drive connection status
   * @returns {Promise<boolean>}
   */
  async checkGoogleDriveStatus() {
    try {
      const status = await this.googleDriveService.checkConnection();
      return status;
    } catch (error) {
      console.error('Google Drive status check error:', error);
      return false;
    }
  }

  /**
   * Get application configuration
   * @returns {Object}
   */
  getAppConfig() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    return {
      googleDrive: AppConfig.getGoogleDriveSettings(),
      database: AppConfig.getDatabaseSettings(),
      ai: AppConfig.getAISettings(),
      version: AppConfig.getVersion(),
      environment: AppConfig.getEnvironment()
    };
  }

  /**
   * Get dashboard statistics
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      return await adminDatabaseService.getStatistics();
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }

  /**
   * Get courses
   * @returns {Promise<Array>}
   */
  async getCourses() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      return await adminDatabaseService.getCourses();
    } catch (error) {
      console.error('Error fetching courses:', error);
      // Return empty array for now since course table doesn't exist yet
      return [];
    }
  }

  /**
   * Get assignments
   * @returns {Promise<Array>}
   */
  async getAssignments() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      return await adminDatabaseService.getAssignments();
    } catch (error) {
      console.error('Error fetching assignments:', error);
      // Return empty array for now since assignment table doesn't exist yet
      return [];
    }
  }

  /**
   * Get recent activity
   * @returns {Promise<Array>}
   */
  async getRecentActivity() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      return await adminDatabaseService.getRecentActivity();
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw new Error('Failed to fetch recent activity');
    }
  }

  /**
   * Get user activity data for charts
   * @returns {Promise<Array>}
   */
  async getUserActivityData() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      return await adminDatabaseService.getUserActivityData();
    } catch (error) {
      console.error('Error fetching user activity data:', error);
      throw new Error('Failed to fetch user activity data');
    }
  }

  /**
   * Get users with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getUsers(options = {}) {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      return await adminDatabaseService.getUsers(options);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Delete course
   * @param {string} courseId - Course ID to delete
   * @returns {Promise<boolean>}
   */
  async deleteCourse(courseId) {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      // TODO: Implement when course table is created
      console.log(`Course deletion not yet implemented for ID: ${courseId}`);
      return true;
    } catch (error) {
      console.error('Error deleting course:', error);
      throw new Error('Failed to delete course');
    }
  }

  /**
   * Delete user
   * @param {string} userId - User ID to delete
   * @returns {Promise<Object>}
   */
  async deleteUser(userId) {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // File Management Methods
  async uploadFiles(files, category = 'general') {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const bucketName = this.storageService.buckets.shared;
      const result = await this.storageService.uploadFiles(files, bucketName, category);
      return result;
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  }

  // Add wrappers used by FileUpload component for course and assignment uploads
  async uploadCourseFiles(files, courseId = null, subcategory = null) {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      return await this.storageService.uploadCourseFiles(files, courseId, subcategory);
    } catch (error) {
      console.error('Error uploading course files:', error);
      throw error;
    }
  }

  async uploadAssignmentFiles(files, assignmentId = null, subcategory = null) {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      return await this.storageService.uploadAssignmentFiles(files, assignmentId, subcategory);
    } catch (error) {
      console.error('Error uploading assignment files:', error);
      throw error;
    }
  }

  // Generic single-file upload used by FileUpload for other categories
  // Despite the name, this routes to Supabase Storage shared-resources bucket
  async uploadFileToGoogleDrive(file, category = 'shared_resources', subcategory = null, onProgress = null) {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const bucketName = this.storageService.buckets.shared; // 'shared-resources'
      const folder = [category, subcategory].filter(Boolean).join('/');
      const result = await this.storageService.uploadFile(
        file,
        bucketName,
        folder,
        {},
        onProgress
      );
      return result;
    } catch (error) {
      console.error('Error uploading file to Supabase storage:', error);
      throw error;
    }
  }

  async getFiles(category = null) {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const bucketName = this.storageService.buckets.shared;
      const folder = category || '';
      const files = await this.storageService.listFiles(bucketName, folder);
      return files;
    } catch (error) {
      console.error('Error getting files:', error);
      throw error;
    }
  }

  async deleteFile(filePath) {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const bucketName = this.storageService.buckets.shared;
      const result = await this.storageService.deleteFile(bucketName, filePath);
      return { success: result };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async getStorageStats() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      return await this.storageService.getStorageStats();
    } catch (error) {
      console.error('Error getting storage stats:', error);
      throw error;
    }
  }

  // System Analytics Methods
  async getSystemAnalytics() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const [userStats, courseStats, storageStats] = await Promise.all([
        this.getUserStats(),
        this.getCourseStats(),
        this.getStorageStats()
      ]);

      return {
        users: userStats,
        courses: courseStats,
        storage: storageStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting system analytics:', error);
      throw error;
    }
  }

  async getUserStats() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, role, created_at');

      if (error) throw error;

      const stats = {
        total: users.length,
        byRole: {},
        recentSignups: 0
      };

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      users.forEach(user => {
        // Count by role
        stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
        
        // Count recent signups
        if (new Date(user.created_at) > oneWeekAgo) {
          stats.recentSignups++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  async getCourseStats() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('id, created_at, status');

      if (error) throw error;

      const stats = {
        total: courses.length,
        byStatus: {},
        recentlyCreated: 0
      };

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      courses.forEach(course => {
        // Count by status
        stats.byStatus[course.status] = (stats.byStatus[course.status] || 0) + 1;
        
        // Count recently created
        if (new Date(course.created_at) > oneWeekAgo) {
          stats.recentlyCreated++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting course stats:', error);
      throw error;
    }
  }

  // System Settings Methods
  async getSystemSettings() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('key,value,updated_at');

      if (error) throw error;

      // Convert array to object for easier access
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      return settingsObj;
    } catch (error) {
      console.error('Error getting system settings:', error);
      // Return default settings if table doesn't exist
      return {
        site_name: 'EdLingo',
        max_file_size: '50MB',
        allowed_file_types: 'pdf,doc,docx,txt,jpg,png,gif,mp4,mp3',
        registration_enabled: true,
        maintenance_mode: false
      };
    }
  }

  async updateSystemSettings(settings) {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      const updates = [];
      
      for (const [key, value] of Object.entries(settings)) {
        updates.push({
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          updated_at: new Date().toISOString()
        });
      }

      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'key' });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
  }

  // Backup and Maintenance Methods
  async createBackup() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      // This is a simplified backup - in a real app you'd want more comprehensive backup
      const timestamp = new Date().toISOString();
      const backupData = {
        timestamp,
        users: await this.getUsers(),
        courses: await this.getCourses(),
        settings: await this.getSystemSettings()
      };

      // In a real implementation, you'd save this to a backup storage
      console.log('Backup created:', backupData);
      
      return {
        success: true,
        backupId: `backup_${Date.now()}`,
        timestamp,
        size: JSON.stringify(backupData).length
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async getSystemLogs() {
    if (!this.isAdminAuthenticated()) {
      throw new Error('Admin authentication required');
    }

    try {
      // This would typically come from a logging system
      // For now, return mock data
      return [
        {
          id: 1,
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'System started successfully',
          source: 'system'
        },
        {
          id: 2,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          level: 'warning',
          message: 'High memory usage detected',
          source: 'monitor'
        }
      ];
    } catch (error) {
      console.error('Error getting system logs:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const adminService = new AdminService();
export default adminService;
export { AdminService };