import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../../config/AppConfig.js';

/**
 * Admin Database Service
 * Handles database operations for the admin dashboard using Supabase MCP
 */
class AdminDatabaseService {
  constructor() {
    this.supabase = null;
    this.isInitialized = false;
    this.fallbackMode = false;
    this.mcpAvailable = false;
    this.supabaseUrl = null;
  }

  /**
   * Initialize the admin database service
   */
  async initialize() {
    try {
      const config = AppConfig.get();
      if (!config.supabase.url || !config.supabase.anonKey) {
        console.warn('Supabase configuration missing, admin database service disabled');
        this.fallbackMode = true;
        this.isInitialized = true;
        return true;
      }

      this.supabaseUrl = config.supabase.url;
      
      // Check if MCP is available
      this.mcpAvailable = typeof window.electronAPI?.runMcp === 'function';
      
      if (this.mcpAvailable) {
        console.log('✅ MCP available, using PostgREST MCP for database operations');
        await this.testMcpConnection();
      } else {
        // Fallback to direct Supabase client
        this.supabase = createClient(
          config.supabase.url,
          config.supabase.anonKey
        );
        await this.testConnection();
      }

      this.isInitialized = true;
      console.log('Admin Database Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Admin Database Service:', error);
      this.fallbackMode = true;
      this.isInitialized = true;
      return true;
    }
  }

  async testMcpConnection() {
    try {
      // Test MCP connection by querying user_profiles table
      const result = await window.electronAPI.runMcp(
        'mcp.config.usrlocalmcp.Postgrest',
        'postgrestRequest',
        {
          method: 'GET',
          path: '/user_profiles?select=id&limit=1'
        }
      );
      
      if (result.error) {
        console.warn('MCP connection test failed, enabling fallback mode:', result.error);
        this.fallbackMode = true;
      } else {
        console.log('✅ MCP database connection successful');
      }
    } catch (error) {
      console.error('MCP connection failed:', error);
      this.fallbackMode = true;
    }
  }

  async testConnection() {
    try {
      // Test connection (graceful fallback if tables don't exist)
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('count')
        .limit(1);

      if (error && error.message.includes('does not exist')) {
        console.warn('Database tables not found, using fallback mode');
        this.fallbackMode = true;
      } else if (error) {
        console.error('Failed to initialize Admin Database Service:', error);
        this.fallbackMode = true;
      }
    } catch (error) {
      console.warn('Database connection test failed, using fallback mode:', error.message);
      this.fallbackMode = true;
    }
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isInitialized && (this.supabase || this.fallbackMode || this.mcpAvailable);
  }

  /**
   * Check if MCP is available and working
   */
  async checkMcpStatus() {
    if (!this.mcpAvailable) {
      return { available: false, connected: false, error: 'MCP not available' };
    }

    try {
      const result = await window.electronAPI.runMcp(
        'mcp.config.usrlocalmcp.Postgrest',
        'postgrestRequest',
        {
          method: 'GET',
          path: '/user_profiles?select=id&limit=1'
        }
      );
      
      return {
        available: true,
        connected: !result.error,
        error: result.error || null
      };
    } catch (error) {
      return {
        available: true,
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Get connection info for debugging
   */
  getConnectionInfo() {
    return {
      mcpAvailable: this.mcpAvailable,
      fallbackMode: this.fallbackMode,
      isInitialized: this.isInitialized,
      supabaseUrl: this.supabaseUrl,
      hasDirectClient: !!this.supabase
    };
  }

  /**
   * Get system statistics
   */
  async getStatistics() {
    if (!this.isReady()) {
      return {
        totalStudents: 0,
        activeCourses: 0,
        totalAssignments: 0,
        totalTeachers: 1,
        activeUsers: 0
      };
    }

    // Return mock data in fallback mode
    if (this.fallbackMode) {
      return {
        totalStudents: 25,
        activeCourses: 3,
        totalAssignments: 8,
        totalTeachers: 1,
        activeUsers: 12
      };
    }

    try {
      if (this.mcpAvailable) {
        // Get statistics using MCP
        const [usersResult, coursesResult, assignmentsResult] = await Promise.allSettled([
          window.electronAPI.runMcp(
            'mcp.config.usrlocalmcp.Postgrest',
            'postgrestRequest',
            {
              method: 'GET',
              path: '/user_profiles?select=id&limit=1'
            }
          ),
          window.electronAPI.runMcp(
            'mcp.config.usrlocalmcp.Postgrest',
            'postgrestRequest',
            {
              method: 'GET',
              path: '/courses?select=id&limit=1'
            }
          ),
          window.electronAPI.runMcp(
            'mcp.config.usrlocalmcp.Postgrest',
            'postgrestRequest',
            {
              method: 'GET',
              path: '/assignments?select=id&limit=1'
            }
          )
        ]);

        return {
          totalStudents: usersResult.status === 'fulfilled' && usersResult.value.data ? usersResult.value.data.length : 0,
          activeCourses: coursesResult.status === 'fulfilled' && coursesResult.value.data ? coursesResult.value.data.length : 0,
          totalAssignments: assignmentsResult.status === 'fulfilled' && assignmentsResult.value.data ? assignmentsResult.value.data.length : 0,
          totalTeachers: 1,
          activeUsers: usersResult.status === 'fulfilled' && usersResult.value.data ? usersResult.value.data.length : 0
        };
      } else {
        // Fallback to direct Supabase client
        const [usersResult, coursesResult, assignmentsResult] = await Promise.allSettled([
          this.supabase.from('user_profiles').select('id', { count: 'exact' }),
          this.supabase.from('courses').select('id', { count: 'exact' }),
          this.supabase.from('assignments').select('id', { count: 'exact' })
        ]);

        return {
          totalStudents: usersResult.status === 'fulfilled' ? (usersResult.value.count || 0) : 0,
          activeCourses: coursesResult.status === 'fulfilled' ? (coursesResult.value.count || 0) : 0,
          totalAssignments: assignmentsResult.status === 'fulfilled' ? (assignmentsResult.value.count || 0) : 0,
          totalTeachers: 1,
          activeUsers: usersResult.status === 'fulfilled' ? (usersResult.value.count || 0) : 0
        };
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return {
        totalStudents: 0,
        activeCourses: 0,
        totalAssignments: 0,
        totalTeachers: 1,
        activeUsers: 0
      };
    }
  }

  /**
   * Get all courses
   */
  async getCourses() {
    if (!this.isReady()) {
      return [];
    }

    // Return mock data in fallback mode
    if (this.fallbackMode) {
      return [
        {
          id: '1',
          title: 'Spanish for Beginners',
          description: 'Learn basic Spanish vocabulary and grammar',
          language: 'Spanish',
          difficulty_level: 'beginner',
          created_at: new Date().toISOString(),
          course_enrollments: [{ count: 15 }]
        },
        {
          id: '2',
          title: 'French Intermediate',
          description: 'Improve your French conversation skills',
          language: 'French',
          difficulty_level: 'intermediate',
          created_at: new Date().toISOString(),
          course_enrollments: [{ count: 8 }]
        },
        {
          id: '3',
          title: 'German Advanced',
          description: 'Master advanced German grammar and vocabulary',
          language: 'German',
          difficulty_level: 'advanced',
          created_at: new Date().toISOString(),
          course_enrollments: [{ count: 5 }]
        }
      ];
    }

    try {
      if (this.mcpAvailable) {
        const result = await window.electronAPI.runMcp(
          'mcp.config.usrlocalmcp.Postgrest',
          'postgrestRequest',
          {
            method: 'GET',
            path: '/courses?select=*,course_enrollments(count)&order=created_at.desc'
          }
        );
        
        if (result.error) throw new Error(result.error);
        return result.data || [];
      } else {
        const { data, error } = await this.supabase
          .from('courses')
          .select(`
            *,
            course_enrollments(count)
          `);

        if (error) {
          console.error('Error fetching courses:', error);
          return [];
        }

        return data || [];
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw new Error('Failed to fetch courses');
    }
  }

  /**
   * Get all assignments
   */
  async getAssignments() {
    if (!this.isReady()) {
      return [];
    }

    // Return mock data in fallback mode
    if (this.fallbackMode) {
      return [
        {
          id: '1',
          course_id: '1',
          title: 'Spanish Vocabulary Quiz',
          description: 'Test your knowledge of basic Spanish words',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          courses: { title: 'Spanish for Beginners' }
        },
        {
          id: '2',
          course_id: '2',
          title: 'French Conversation Practice',
          description: 'Record a 5-minute conversation in French',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          courses: { title: 'French Intermediate' }
        },
        {
          id: '3',
          course_id: '3',
          title: 'German Grammar Exercise',
          description: 'Complete advanced grammar exercises',
          due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          courses: { title: 'German Advanced' }
        }
      ];
    }

    try {
      const { data, error } = await this.supabase
        .from('assignments')
        .select(`
          *,
          courses(title)
        `);

      if (error) {
        console.error('Error fetching assignments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching assignments:', error);
      throw new Error('Failed to fetch assignments');
    }
  }

  /**
   * Get recent activity
   */
  async getRecentActivity() {
    if (!this.isReady()) {
      return [];
    }

    // Return mock data in fallback mode
    if (this.fallbackMode) {
      return [
        {
          id: '1',
          user_id: 'user1',
          session_type: 'vocabulary_practice',
          duration_minutes: 25,
          xp_earned: 150,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          user_profiles: { full_name: 'Alice Johnson', email: 'alice@example.com' }
        },
        {
          id: '2',
          user_id: 'user2',
          session_type: 'grammar_exercise',
          duration_minutes: 30,
          xp_earned: 200,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          user_profiles: { full_name: 'Bob Smith', email: 'bob@example.com' }
        },
        {
          id: '3',
          user_id: 'user3',
          session_type: 'conversation_practice',
          duration_minutes: 45,
          xp_earned: 300,
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          user_profiles: { full_name: 'Carol Davis', email: 'carol@example.com' }
        }
      ];
    }

    try {
      if (this.mcpAvailable) {
        const result = await window.electronAPI.runMcp(
          'mcp.config.usrlocalmcp.Postgrest',
          'postgrestRequest',
          {
            method: 'GET',
            path: '/learning_sessions?select=*,user_profiles(full_name,email)&order=created_at.desc&limit=10'
          }
        );
        
        if (result.error) throw new Error(result.error);
        return result.data || [];
      } else {
        const { data, error } = await this.supabase
          .from('learning_sessions')
          .select(`
            *,
            user_profiles(full_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching recent activity:', error);
          return [];
        }

        return data || [];
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw new Error('Failed to fetch recent activity');
    }
  }

  /**
   * Get user activity data
   */
  async getUserActivityData() {
    if (!this.isReady()) {
      return [];
    }

    // Return mock data in fallback mode
    if (this.fallbackMode) {
      const mockData = [];
      for (let i = 0; i < 30; i++) {
        mockData.push({
          created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          duration_minutes: Math.floor(Math.random() * 60) + 10,
          xp_earned: Math.floor(Math.random() * 300) + 50
        });
      }
      return mockData;
    }

    try {
      const { data, error } = await this.supabase
        .from('learning_sessions')
        .select('created_at, duration_minutes, xp_earned')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching user activity data:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user activity data:', error);
      throw new Error('Failed to fetch user activity data');
    }
  }

  /**
   * Get all users
   */
  async getUsers(options = {}) {
    if (!this.isReady()) {
      return [];
    }

    // Return mock data in fallback mode
    if (this.fallbackMode) {
      return [
        {
          id: 'user1',
          email: 'alice@example.com',
          full_name: 'Alice Johnson',
          avatar_url: null,
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          user_progress: [{ course_id: '1', progress_percentage: 75 }]
        },
        {
          id: 'user2',
          email: 'bob@example.com',
          full_name: 'Bob Smith',
          avatar_url: null,
          created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          user_progress: [{ course_id: '2', progress_percentage: 45 }]
        },
        {
          id: 'user3',
          email: 'carol@example.com',
          full_name: 'Carol Davis',
          avatar_url: null,
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          user_progress: [{ course_id: '3', progress_percentage: 90 }]
        }
      ];
    }

    try {
      if (this.mcpAvailable) {
        const result = await window.electronAPI.runMcp(
          'mcp.config.usrlocalmcp.Postgrest',
          'postgrestRequest',
          {
            method: 'GET',
            path: '/user_profiles?select=id,email,full_name,created_at,avatar_url,last_active_at,user_progress(current_level,total_xp,daily_streak)&order=created_at.desc'
          }
        );
        
        if (result.error) throw new Error(result.error);
        return result.data || [];
      } else {
        const { data, error } = await this.supabase
          .from('user_profiles')
          .select(`
            id,
            email,
            full_name,
            created_at,
            avatar_url,
            last_active_at,
            user_progress(
              current_level,
              total_xp,
              daily_streak
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching users:', error);
          return [];
        }

        return data || [];
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Create a new course
   */
  async createCourse(courseData) {
    if (!this.isReady()) {
      throw new Error('Database service not ready');
    }

    try {
      const { data, error } = await this.supabase
        .from('courses')
        .insert([courseData])
        .select();

      if (error) {
        console.error('Error creating course:', error);
        throw new Error('Failed to create course');
      }

      return data[0];
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  }

  /**
   * Update a course
   */
  async updateCourse(courseId, updates) {
    if (!this.isReady()) {
      throw new Error('Database service not ready');
    }

    try {
      const { data, error } = await this.supabase
        .from('courses')
        .update(updates)
        .eq('id', courseId)
        .select();

      if (error) {
        console.error('Error updating course:', error);
        throw new Error('Failed to update course');
      }

      return data[0];
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  }

  /**
   * Delete a course
   */
  async deleteCourse(courseId) {
    if (!this.isReady()) {
      throw new Error('Database service not ready');
    }

    try {
      const { error } = await this.supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) {
        console.error('Error deleting course:', error);
        throw new Error('Failed to delete course');
      }

      return true;
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  }

  /**
   * Create a new assignment
   */
  async createAssignment(assignmentData) {
    if (!this.isReady()) {
      throw new Error('Database service not ready');
    }

    try {
      const { data, error } = await this.supabase
        .from('assignments')
        .insert([assignmentData])
        .select();

      if (error) {
        console.error('Error creating assignment:', error);
        throw new Error('Failed to create assignment');
      }

      return data[0];
    } catch (error) {
      console.error('Error creating assignment:', error);
      throw error;
    }
  }

  /**
   * Update an assignment
   */
  async updateAssignment(assignmentId, updates) {
    if (!this.isReady()) {
      throw new Error('Database service not ready');
    }

    try {
      const { data, error } = await this.supabase
        .from('assignments')
        .update(updates)
        .eq('id', assignmentId)
        .select();

      if (error) {
        console.error('Error updating assignment:', error);
        throw new Error('Failed to update assignment');
      }

      return data[0];
    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(assignmentId) {
    if (!this.isReady()) {
      throw new Error('Database service not ready');
    }

    try {
      const { error } = await this.supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('Error deleting assignment:', error);
        throw new Error('Failed to delete assignment');
      }

      return true;
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const adminDatabaseService = new AdminDatabaseService();
export default adminDatabaseService;