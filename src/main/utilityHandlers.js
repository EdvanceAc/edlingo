const { ipcMain, dialog, Notification } = require('electron');
const fs = require('fs').promises;

function setupUtilityHandlers() {
  ipcMain.handle('window:minimize', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) window.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      if (window.isMaximized()) {
        window.restore();
      } else {
        window.maximize();
      }
    }
  });

  ipcMain.handle('window:close', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) window.close();
  });

  ipcMain.handle('app:version', () => app.getVersion());

  ipcMain.handle('process-audio', async (event, audioData) => {
    // Implementation
  });

  ipcMain.handle('dialog:openFile', async () => {
    // Implementation
  });

  ipcMain.handle('dialog:saveFile', async (event, data) => {
    // Implementation
  });

  ipcMain.handle('speech:startRecording', async () => {
    // Implementation
  });

  ipcMain.handle('speech:stopRecording', async () => {
    // Implementation
  });

  ipcMain.handle('audio:play', async (event, audioUrl) => {
    // Implementation
  });

  ipcMain.handle('grammar:getExercises', async () => {
    // Implementation
  });

  ipcMain.handle('grammar:submitAnswer', async (event, answer) => {
    // Implementation
  });

  ipcMain.handle('notification:show', async (event, title, body) => {
    // Implementation
  });

  ipcMain.handle('mcp:run', async (event, serverName, toolName, args) => {
    // Implementation
  });

  // Add other utility handlers
}

module.exports = { setupUtilityHandlers };