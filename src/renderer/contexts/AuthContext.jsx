import React, { createContext, useContext, useState, useEffect } from 'react';
import supabaseService from '../services/supabaseService.js';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Initialize auth state and listen for changes
  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        // Check if Supabase is properly configured
        const connectionStatus = await supabaseService.getConnectionStatus();
        
        if (connectionStatus) {
          const { success, session: currentSession } = await supabaseService.getSession();
          if (mounted && success && currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
          }
        } else {
          // Fallback for development - create a mock user
          console.warn('Supabase not connected, using fallback authentication');
          const mockUser = {
            id: '8bd24835-6cb5-4f76-ac99-83a50fabb6ae',
            email: 'dev@edlingo.com',
            user_metadata: { name: 'Development User' }
          };
          setUser(mockUser);
          setSession({ user: mockUser });
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        // Fallback for development - create a mock user
        console.warn('Authentication error, using fallback user');
        const mockUser = {
          id: '8bd24835-6cb5-4f76-ac99-83a50fabb6ae',
          email: 'dev@edlingo.com',
          user_metadata: { name: 'Development User' }
        };
        setUser(mockUser);
        setSession({ user: mockUser });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes only if Supabase is available
    let subscription;
    try {
      const authListener = supabaseService.onAuthStateChange(
        async (event, session) => {
          if (mounted) {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
          }
        }
      );
      subscription = authListener?.data?.subscription;
    } catch (error) {
      console.warn('Could not set up auth state listener:', error);
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);
  
  const signUp = async (email, password, metadata = {}) => {
    try {
      setLoading(true);
      const result = await supabaseService.signUp(email, password, metadata);
      
      if (result.success) {
        return { data: result.data, error: null };
      } else {
        return { data: null, error: new Error(result.error) };
      }
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const result = await supabaseService.signIn(email, password);
      
      if (result.success) {
        return { data: result.data, error: null };
      } else {
        return { data: null, error: new Error(result.error) };
      }
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await supabaseService.signInWithGoogle();
      
      if (result.success) {
        return { data: result.data, error: null };
      } else {
        return { data: null, error: new Error(result.error) };
      }
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const result = await supabaseService.signOut();
      
      if (result.success) {
        setUser(null);
        setSession(null);
        return { error: null };
      } else {
        return { error: new Error(result.error) };
      }
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      const result = await supabaseService.resetPassword(email);
      
      if (result.success) {
        return { data: result.data, error: null };
      } else {
        return { data: null, error: new Error(result.error) };
      }
    } catch (error) {
      return { data: null, error };
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      const result = await supabaseService.updatePassword(newPassword);
      
      if (result.success) {
        return { data: result.data, error: null };
      } else {
        return { data: null, error: new Error(result.error) };
      }
    } catch (error) {
      return { data: null, error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;