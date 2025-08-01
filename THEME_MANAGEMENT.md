# Theme Management in EdLingo

## Overview

EdLingo now includes a basic theme management system that allows the application to handle light/dark mode preferences. This document explains how the theme system works and how to extend it.

## Implementation

### Main Process (Electron)

The main process handles theme-related IPC events:

```javascript
// In src/main/main.js

// Theme management handlers
ipcMain.handle('theme:get', async () => {
  // Get theme from user preferences or default to 'light'
  // This is a simple implementation - expand as needed
  return app.getPreferredSystemTheme?.() || 'light';
});

ipcMain.handle('theme:set', async (event, theme) => {
  // Store theme preference (implement storage as needed)
  console.log(`Theme set to: ${theme}`);
  return { success: true, theme };
});
```

### Renderer Process (React)

The renderer process can request or set the theme using the exposed IPC handlers:

```javascript
// Example usage in a React component

// Get the current theme
const getTheme = async () => {
  try {
    const theme = await window.electron.invoke('theme:get');
    setCurrentTheme(theme);
  } catch (error) {
    console.error('Failed to get theme:', error);
  }
};

// Set a new theme
const setTheme = async (newTheme) => {
  try {
    const result = await window.electron.invoke('theme:set', newTheme);
    if (result.success) {
      setCurrentTheme(newTheme);
      // Apply theme changes to the UI
    }
  } catch (error) {
    console.error('Failed to set theme:', error);
  }
};
```

## Future Enhancements

### Persistent Storage

Currently, the theme preference is not persisted between application restarts. To implement persistence:

1. Use Electron's `app.setPreferredSystemTheme()` if available
2. Or implement a custom storage solution using:
   - Electron's `app.getPath('userData')` to get the user data directory
   - A simple JSON file to store preferences
   - Or integrate with an existing settings management system

### System Theme Integration

To better integrate with the operating system's theme:

1. Listen for system theme changes:
   ```javascript
   // In main.js
   if (app.getSystemTheme) {
     app.on('system-theme-changed', (event, systemTheme) => {
       // Notify renderer process of theme change
       if (mainWindow) {
         mainWindow.webContents.send('theme:changed', systemTheme);
       }
     });
   }
   ```

2. Add a listener in the renderer process:
   ```javascript
   // In a React component
   useEffect(() => {
     const handleThemeChange = (event, newTheme) => {
       setCurrentTheme(newTheme);
       // Apply theme changes
     };
     
     window.electron.on('theme:changed', handleThemeChange);
     
     return () => {
       window.electron.removeListener('theme:changed', handleThemeChange);
     };
   }, []);
   ```

## Troubleshooting

If you encounter issues with the theme system:

1. Check the console for error messages
2. Verify that the IPC handlers are properly registered in main.js
3. Ensure the preload script correctly exposes the theme-related IPC methods
4. Test the theme handlers directly from the developer console:
   ```javascript
   // In DevTools console
   window.electron.invoke('theme:get').then(console.log);
   window.electron.invoke('theme:set', 'dark').then(console.log);
   ```

## Contributing

When extending the theme system:

1. Keep the API simple and consistent
2. Document any changes or additions
3. Consider accessibility implications of theme changes
4. Test across different operating systems