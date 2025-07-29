const { ipcMain } = require('electron');
const databaseService = require('./databaseService');

function setupDatabaseHandlers() {
  // Initialize database service
  databaseService.initialize().catch(error => {
    console.error('Failed to initialize database service:', error);
  });

  // Course Management Handlers
  ipcMain.handle('db:createCourse', async (event, courseData, isDraft = false) => {
    try {
      const course = await databaseService.createCourse(courseData, isDraft);
      return { success: true, course };
    } catch (error) {
      console.error('Error creating course:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getCourses', async (event) => {
    try {
      const courses = await databaseService.getCourses();
      return { success: true, courses };
    } catch (error) {
      console.error('Error getting courses:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:updateCourse', async (event, courseId, updates) => {
    try {
      const course = await databaseService.updateCourse(courseId, updates);
      return { success: true, course };
    } catch (error) {
      console.error('Error updating course:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:deleteCourse', async (event, courseId) => {
    try {
      const success = await databaseService.deleteCourse(courseId);
      return { success, deleted: success };
    } catch (error) {
      console.error('Error deleting course:', error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle('db:getUserProgress', async (event, userId) => {
    try {
      const progress = await databaseService.getUserProgress(userId);
      return { success: true, progress };
    } catch (error) {
      console.error('Error getting user progress:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:updateUserProgress', async (event, userId, progressData) => {
    try {
      const updated = await databaseService.updateUserProgress(userId, progressData);
      return { success: true, updated };
    } catch (error) {
      console.error('Error updating user progress:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getDailyStats', async (event, userId, date) => {
    try {
      const stats = await databaseService.getDailyStats(userId, date);
      return { success: true, stats };
    } catch (error) {
      console.error('Error getting daily stats:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getWeeklyStats', async (event, userId, startDate, endDate) => {
    try {
      const stats = await databaseService.getWeeklyStats(userId, startDate, endDate);
      return { success: true, stats };
    } catch (error) {
      console.error('Error getting weekly stats:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getVocabulary', async (event, userId) => {
    try {
      const vocabulary = await databaseService.getVocabulary(userId);
      return { success: true, vocabulary };
    } catch (error) {
      console.error('Error getting vocabulary:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:addVocabulary', async (event, userId, word) => {
    try {
      const added = await databaseService.addVocabulary(userId, word);
      return { success: true, added };
    } catch (error) {
      console.error('Error adding vocabulary:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:updateVocabulary', async (event, userId, wordId, updates) => {
    try {
      const updated = await databaseService.updateVocabulary(userId, wordId, updates);
      return { success: true, updated };
    } catch (error) {
      console.error('Error updating vocabulary:', error);
      return { success: false, error: error.message };
    }
  });

  // Lesson Management Handlers
  ipcMain.handle('db:createLessons', async (event, courseId, lessons) => {
    try {
      return await databaseService.createLessons(courseId, lessons);
    } catch (error) {
      console.error('Error in createLessons handler:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getLessons', async (event, courseId) => {
    try {
      const lessons = await databaseService.getLessons(courseId);
      return { success: true, lessons };
    } catch (error) {
      console.error('Error getting lessons:', error);
      return { success: false, error: error.message };
    }
  });

  // File Upload Handler
  ipcMain.handle('db:uploadFile', async (event, fileBuffer, fileName, bucket, path) => {
    try {
      // Convert buffer back to File-like object
      const file = new Blob([fileBuffer], { type: 'application/octet-stream' });
      file.name = fileName;
      
      const result = await databaseService.uploadFile(file, bucket, path);
      return { success: true, result };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { success: false, error: error.message };
    }
  });

  // Add other DB handlers here...
}

module.exports = { setupDatabaseHandlers };