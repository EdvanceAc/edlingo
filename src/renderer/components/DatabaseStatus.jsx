import React from 'react';
import { useDatabaseStatus } from '../hooks/useDatabase.js';
import { AppConfig } from '../../config/AppConfig.js';

/**
 * Database Status Component
 * Shows connection status, sync progress, and database health
 */
const DatabaseStatus = ({ className = '', showDetails = false }) => {
  const status = useDatabaseStatus();
  
  if (!AppConfig.isDatabaseEnabled()) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm text-gray-500">Database disabled</span>
      </div>
    );
  }
  
  if (!status) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }
  
  const getStatusColor = () => {
    if (!status.isOnline) return 'bg-red-500';
    if (status.syncInProgress) return 'bg-yellow-500 animate-pulse';
    if (status.pendingItems > 0) return 'bg-orange-500';
    return 'bg-green-500';
  };
  
  const getStatusText = () => {
    if (!status.isOnline) return 'Offline';
    if (status.syncInProgress) return 'Syncing...';
    if (status.pendingItems > 0) return `${status.pendingItems} pending`;
    return 'Synced';
  };
  
  const getStatusIcon = () => {
    if (!status.isOnline) return '📴';
    if (status.syncInProgress) return '🔄';
    if (status.pendingItems > 0) return '⏳';
    return '✅';
  };
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {getStatusIcon()} {getStatusText()}
      </span>
      
      {showDetails && (
        <div className="ml-4 text-xs text-gray-500 space-y-1">
          <div>Online: {status.isOnline ? 'Yes' : 'No'}</div>
          <div>Pending: {status.pendingItems}</div>
          {status.lastSyncTime && (
            <div>Last sync: {new Date(status.lastSyncTime).toLocaleTimeString()}</div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Detailed Database Status Panel
 * Shows comprehensive database information
 */
export const DatabaseStatusPanel = ({ className = '' }) => {
  const status = useDatabaseStatus();
  
  if (!AppConfig.isDatabaseEnabled()) {
    return (
      <div className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <h3 className="text-lg font-semibold mb-2">Database Status</h3>
        <div className="text-yellow-600 dark:text-yellow-400">
          ⚠️ Database is not configured. Please check your environment variables.
        </div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
        </div>
      </div>
    );
  }
  
  if (!status) {
    return (
      <div className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <span className="mr-2">🗄️</span>
        Database Status
      </h3>
      
      <div className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection:</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              status.isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className={`text-sm ${
              status.isOnline ? 'text-green-600' : 'text-red-600'
            }`}>
              {status.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        
        {/* Sync Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Sync Status:</span>
          <div className="flex items-center space-x-2">
            {status.syncInProgress ? (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-yellow-600">Syncing...</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Ready</span>
              </>
            )}
          </div>
        </div>
        
        {/* Pending Items */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Pending Items:</span>
          <span className={`text-sm ${
            status.pendingItems > 0 ? 'text-orange-600' : 'text-gray-600'
          }`}>
            {status.pendingItems}
          </span>
        </div>
        
        {/* Last Sync */}
        {status.lastSyncTime && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last Sync:</span>
            <span className="text-sm text-gray-600">
              {new Date(status.lastSyncTime).toLocaleString()}
            </span>
          </div>
        )}
        
        {/* Database URL */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Database:</span>
          <span className="text-sm text-gray-600 font-mono">
            {AppConfig.getSupabaseConfig().url.replace('https://', '').split('.')[0]}...supabase.co
          </span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          disabled={status.syncInProgress}
        >
          {status.syncInProgress ? 'Syncing...' : 'Force Refresh'}
        </button>
      </div>
    </div>
  );
};

export default DatabaseStatus;