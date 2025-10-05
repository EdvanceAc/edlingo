# Handling Deprecation Warnings and IPC Errors in EdLingo

## Recent Changes

We've improved how the application handles Node.js deprecation warnings, particularly for the `util._extend` method which is deprecated in favor of `Object.assign()`. We've also fixed IPC handler errors related to theme management.

### Changes Made

1. **Enhanced Warning Handling in main.js**
   - Added more graceful handling of deprecation warnings
   - Implemented selective logging in development mode
   - Maintained suppression of specific warnings that can't be immediately fixed

2. **Removed Blanket Suppression**
   - Removed `NODE_OPTIONS=--no-deprecation` from the dev script
   - This allows important warnings to surface while still handling known issues

3. **Fixed IPC Handler Errors**
   - Implemented missing handlers for 'theme:get' and 'theme:set' events
   - Added basic theme management functionality

## For Developers

### Dealing with Deprecation Warnings

When you encounter deprecation warnings:

1. **Identify the Source**
   - Use `--trace-deprecation` to find where deprecated APIs are being used:
     ```
     NODE_OPTIONS=--trace-deprecation npm run dev
     ```

2. **Fix Direct Usage**
   - If the warning comes from our own code, update it immediately
   - For example, replace `util._extend(target, source)` with `Object.assign(target, source)`

3. **Handle Third-party Dependencies**
   - If the warning comes from a dependency:
     - Check if an updated version is available
     - Consider creating a polyfill or wrapper
     - Add specific suppression in the warning handler if necessary

### Adding New Suppressions

If you need to suppress additional warnings, modify the warning handler in `src/main/main.js`:

```javascript
if (name === 'warning' && typeof data === 'object' && data.name === 'DeprecationWarning') {
  // Log in development mode
  if (isDev && !data.message.includes('ExperimentalWarning')) {
    console.warn(`Deprecation warning: ${data.message}`);
    console.warn('Consider updating dependencies or polyfilling deprecated APIs');
  }
  
  // Add specific suppressions here
  if (data.message.includes('util._extend') || 
      data.message.includes('YOUR_NEW_PATTERN')) {
    return false;
  }
}
```

## Best Practices

1. **Don't Use Blanket Suppression**
   - Avoid using `NODE_OPTIONS=--no-deprecation` as it hides all warnings
   - Be selective about which warnings to suppress

2. **Document Suppressions**
   - When adding a new suppression, document why it's needed
   - Include a plan for eventual resolution

3. **Regular Maintenance**
   - Periodically review suppressed warnings
   - Update dependencies to remove the need for suppressions