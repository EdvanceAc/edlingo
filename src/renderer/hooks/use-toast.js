import React, { useState, useCallback, useEffect } from 'react';

// Toast types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Default toast configuration
const DEFAULT_DURATION = 5000;
const MAX_TOASTS = 5;

let toastId = 0;

// Global toast state
let globalToasts = [];
let globalListeners = [];

// Notify all listeners of toast changes
const notifyListeners = () => {
  globalListeners.forEach(listener => listener(globalToasts));
};

// Add a new toast
const addToast = (toast) => {
  const id = ++toastId;
  const newToast = {
    id,
    type: TOAST_TYPES.INFO,
    duration: DEFAULT_DURATION,
    ...toast,
    timestamp: Date.now()
  };

  globalToasts = [newToast, ...globalToasts].slice(0, MAX_TOASTS);
  notifyListeners();

  // Auto-remove toast after duration
  if (newToast.duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  }

  return id;
};

// Remove a toast
const removeToast = (id) => {
  globalToasts = globalToasts.filter(toast => toast.id !== id);
  notifyListeners();
};

// Clear all toasts
const clearToasts = () => {
  globalToasts = [];
  notifyListeners();
};

// Main hook
export const useToast = () => {
  const [toasts, setToasts] = useState(globalToasts);

  // Subscribe to global toast changes
  const updateToasts = useCallback((newToasts) => {
    setToasts([...newToasts]);
  }, []);

  // Register listener on mount, cleanup on unmount
  useEffect(() => {
    globalListeners.push(updateToasts);
    return () => {
      globalListeners = globalListeners.filter(listener => listener !== updateToasts);
    };
  }, [updateToasts]);

  // Toast methods
  const toast = useCallback((message, options = {}) => {
    return addToast({ message, ...options });
  }, []);

  const success = useCallback((message, options = {}) => {
    return addToast({ message, type: TOAST_TYPES.SUCCESS, ...options });
  }, []);

  const error = useCallback((message, options = {}) => {
    return addToast({ message, type: TOAST_TYPES.ERROR, ...options });
  }, []);

  const warning = useCallback((message, options = {}) => {
    return addToast({ message, type: TOAST_TYPES.WARNING, ...options });
  }, []);

  const info = useCallback((message, options = {}) => {
    return addToast({ message, type: TOAST_TYPES.INFO, ...options });
  }, []);

  const dismiss = useCallback((id) => {
    removeToast(id);
  }, []);

  const clear = useCallback(() => {
    clearToasts();
  }, []);

  return {
    toasts,
    toast,
    success,
    error,
    warning,
    info,
    dismiss,
    clear
  };
};

// Export individual methods for convenience
export const toast = (message, options) => addToast({ message, ...options });
export const toastSuccess = (message, options) => addToast({ message, type: TOAST_TYPES.SUCCESS, ...options });
export const toastError = (message, options) => addToast({ message, type: TOAST_TYPES.ERROR, ...options });
export const toastWarning = (message, options) => addToast({ message, type: TOAST_TYPES.WARNING, ...options });
export const toastInfo = (message, options) => addToast({ message, type: TOAST_TYPES.INFO, ...options });

export default useToast;