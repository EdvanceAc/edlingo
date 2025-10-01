// React utilities to ensure proper loading and prevent useLayoutEffect errors

// This utility ensures React is properly loaded before using its hooks
export const ensureReactLoaded = () => {
  if (typeof React === 'undefined') {
    console.error('React is not loaded. This may cause useLayoutEffect errors.');
    // Try to load React from global scope as fallback
    if (typeof window !== 'undefined' && window.React) {
      return window.React;
    }
    throw new Error('React is not available. Please check your build configuration.');
  }
  return React;
};

// Safe wrapper for useLayoutEffect that falls back to useEffect
export const safeUseLayoutEffect = (effect, deps) => {
  try {
    // Try to use the original useLayoutEffect first
    return React.useLayoutEffect(effect, deps);
  } catch (error) {
    if (error.message.includes('useLayoutEffect') && error.message.includes('undefined')) {
      // Fallback to useEffect if useLayoutEffect is not available
      console.warn('useLayoutEffect not available, falling back to useEffect');
      return React.useEffect(effect, deps);
    }
    throw error;
  }
};

// This should be called early in the app to ensure React is available
export const initializeReactGlobals = () => {
  if (typeof window !== 'undefined') {
    // Make React available globally as a safety measure
    if (typeof React !== 'undefined') {
      window.React = React;
    }
    if (typeof ReactDOM !== 'undefined') {
      window.ReactDOM = ReactDOM;
    }
  }
};
