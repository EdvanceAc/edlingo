// React utilities to ensure proper loading and prevent useLayoutEffect errors
import React from 'react';
import ReactDOM from 'react-dom/client';

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
