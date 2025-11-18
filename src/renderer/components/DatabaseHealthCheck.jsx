import React, { useState, useEffect } from 'react';
import supabaseService from '../services/supabaseService';

const DatabaseHealthCheck = () => {
  const [healthStatus, setHealthStatus] = useState({
    connected: false,
    tablesExist: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    checkDatabaseHealth();
  }, []);

  const checkDatabaseHealth = async () => {
    setHealthStatus(prev => ({ ...prev, loading: true }));
    
    try {
      // Check connection
      const connected = supabaseService.isConnected;
      
      let tablesExist = false;
      let error = null;
      
      if (connected) {
        // Test if tables exist
        try {
          const result = await supabaseService.client
            .from('user_profiles')
            .select('id')
            .limit(1);
          
          tablesExist = !result.error || result.error.code !== '42P01';
          if (result.error && result.error.code === '42P01') {
            error = 'Database tables not found';
          }
        } catch (err) {
          error = err.message;
        }
      } else {
        error = 'Not connected to Supabase';
      }
      
      setHealthStatus({
        connected,
        tablesExist,
        loading: false,
        error
      });
    } catch (err) {
      setHealthStatus({
        connected: false,
        tablesExist: false,
        loading: false,
        error: err.message
      });
    }
  };

  const getStatusIcon = (status) => {
    if (healthStatus.loading) return '⏳';
    return status ? '✅' : '❌';
  };

  const getStatusColor = (status) => {
    if (healthStatus.loading) return 'text-yellow-600';
    return status ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Database Health Check</h2>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getStatusIcon(healthStatus.connected)}</span>
          <span className={`font-medium ${getStatusColor(healthStatus.connected)}`}>
            Supabase Connection: {healthStatus.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getStatusIcon(healthStatus.tablesExist)}</span>
          <span className={`font-medium ${getStatusColor(healthStatus.tablesExist)}`}>
            Database Tables: {healthStatus.tablesExist ? 'Found' : 'Missing'}
          </span>
        </div>
        
        {healthStatus.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800 font-medium">Error Details:</p>
            <p className="text-red-600">{healthStatus.error}</p>
          </div>
        )}
        
        {(!healthStatus.connected || !healthStatus.tablesExist) && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-blue-800 font-medium mb-2">Setup Required</h3>
            <div className="text-blue-700 space-y-2">
              {!healthStatus.connected && (
                <p>• Check your .env file has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY</p>
              )}
              {!healthStatus.tablesExist && (
                <div>
                  <p>• Database tables need to be created. Follow these steps:</p>
                  <ol className="list-decimal list-inside ml-4 mt-2 space-y-1">
                    <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Supabase Dashboard</a></li>
                    <li>Go to SQL Editor</li>
                    <li>Copy contents from <code className="bg-gray-100 px-1 rounded">database/migrations/001_initial_schema.sql</code></li>
                    <li>Paste and run the migration</li>
                  </ol>
                </div>
              )}
              <p>• See <code className="bg-gray-100 px-1 rounded">SETUP_DATABASE.md</code> for detailed instructions</p>
            </div>
          </div>
        )}
        
        {healthStatus.connected && healthStatus.tablesExist && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-800 font-medium">✅ Database is properly configured!</p>
            <p className="text-green-700">All systems are working correctly.</p>
          </div>
        )}
        
        <button
          onClick={checkDatabaseHealth}
          disabled={healthStatus.loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          {healthStatus.loading ? 'Checking...' : 'Recheck Status'}
        </button>
      </div>
    </div>
  );
};

export default DatabaseHealthCheck;