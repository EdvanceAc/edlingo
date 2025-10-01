import { useEffect, useLayoutEffect } from 'react';

// Safe version of useLayoutEffect that falls back to useEffect
// This prevents the "Cannot read properties of undefined (reading 'useLayoutEffect')" error
export const useSafeLayoutEffect = (...args) => {
  // Check if we're in a browser environment and React hooks are available
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  if (!isBrowser) {
    // On server-side, always use useEffect
    return useEffect(...args);
  }

  try {
    // Try to use useLayoutEffect first
    return useLayoutEffect(...args);
  } catch (error) {
    // If useLayoutEffect fails, fall back to useEffect
    if (error.message && error.message.includes('useLayoutEffect')) {
      console.warn('useLayoutEffect not available, using useEffect instead');
      return useEffect(...args);
    }
    // Re-throw other errors
    throw error;
  }
};

export default useSafeLayoutEffect;
