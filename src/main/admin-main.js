// Suppress all deprecation warnings before any requires
process.noDeprecation = true;
process.env.NODE_NO_WARNINGS = '1';

const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const isDev = process.env.NODE_ENV === 'development';
const { setupDatabaseHandlers } = require('./databaseHandlers');

// Enhanced GPU and cache handling (same as main.js)
if (process.env.DISABLE_GPU === 'true') {
  app.disableHardwareAcceleration();
  console.log('Hardware acceleration disabled via DISABLE_GPU environment variable');
} else {
  app.commandLine.appendSwitch('--disable-gpu-sandbox');
  app.commandLine.appendSwitch('--disable-software-rasterizer');
  app.commandLine.appendSwitch('--disable-background-timer-throttling');
  app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('--disable-renderer-backgrounding');
  app.commandLine.appendSwitch('--disk-cache-size', '50000000');
  app.commandLine.appendSwitch('--media-cache-size', '25000000');
  app.commandLine.appendSwitch('--disable-web-security');
  app.commandLine.appendSwitch('--allow-running-insecure-content');
  app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
  app.commandLine.appendSwitch('--ignore-certificate-errors');
  app.commandLine.appendSwitch('--ignore-ssl-errors');
  app.commandLine.appendSwitch('--ignore-certificate-errors-spki-list');
  app.commandLine.appendSwitch('--ignore-certificate-errors-skip-list');
  app.commandLine.appendSwitch('--disable-site-isolation-trials');
}

app.on('child-process-gone', (event, details) => {
  if (details.type === 'GPU') {
    console.log('GPU process crashed, continuing with software rendering');
  }
});

app.on('render-process-gone', (event, webContents, details) => {
  console.log('Renderer process gone:', details.reason);
  if (details.reason === 'crashed') {
    console.log('Renderer crashed, reloading...');
    webContents.reload();
  }
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: '#ffffff',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
      spellcheck: true,
      webSecurity: isDev ? false : true,
      allowRunningInsecureContent: isDev,
      experimentalFeatures: true
    },
    frame: true,
    show: false,
    icon: path.join(__dirname, '../../assets/icons/icon.png')
  });

  if (isDev) {
    // Vite dev server serves admin dashboard at /admin via custom plugin
    mainWindow.loadURL('http://127.0.0.1:3002/admin');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Load the built admin dashboard HTML directly
    mainWindow.loadFile(path.join(__dirname, '../../dist/admin-dashboard.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  createMenu();
}

function createMenu() {
  const template = [
    { label: 'File', submenu: [ { role: 'quit' } ] },
    { label: 'Edit', submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'delete' },
        { type: 'separator' }, { role: 'selectAll' }
    ]},
    { label: 'View', submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }
    ]},
    { label: 'Window', submenu: [ { role: 'minimize' }, { role: 'zoom' }, { role: 'close' } ] },
    { role: 'help', submenu: [ { label: 'Learn More', click: async () => { await shell.openExternal('https://lingo-app.com'); } } ] }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setupIPC() {
  // Database and admin-related handlers
  setupDatabaseHandlers();

  // Minimal theme handlers used by dashboard
  ipcMain.handle('theme:get', async () => {
    return app.getPreferredSystemTheme?.() || 'light';
  });
  ipcMain.handle('theme:set', async (event, theme) => {
    console.log(`Theme set to: ${theme}`);
    return { success: true, theme };
  });
}

app.whenReady().then(async () => {
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Place for graceful shutdown if needed
});