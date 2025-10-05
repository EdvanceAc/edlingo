import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import LoadingScreen from './components/ui/LoadingScreen';
import DatabaseStatus from './components/DatabaseStatus';

// Pages
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import EnhancedChat from './pages/EnhancedChat';
import LiveConversation from './pages/LiveConversation';
import Pronunciation from './pages/Pronunciation';
import Vocabulary from './pages/Vocabulary';
import Grammar from './pages/Grammar';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import AuthCallback from './pages/AuthCallback';
import AssessmentPage from './pages/AssessmentPage';
import AssessmentTest from './pages/AssessmentTest';

// Auth Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import DatabaseHealthCheck from './components/DatabaseHealthCheck';

// Providers
import { ThemeProvider } from './providers/ThemeProvider';
import { AudioProvider } from './providers/AudioProvider';
import { ProgressProvider } from './providers/ProgressProvider';
import { AIProvider } from './providers/AIProvider';
import { AuthProvider } from './contexts/AuthContext';

// Database
import { AppConfig } from '../config/AppConfig.js';
import databaseSyncService from './services/databaseSyncService.js';

// Layout component that conditionally renders sidebar and header
function AppLayout({ children }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAuthRoute = location.pathname.startsWith('/auth');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (isAdminRoute || isAuthRoute) {
    // Admin or Auth layout without sidebar and header
    return (
      <div className="min-h-screen bg-background text-foreground">
        {children}
      </div>
    );
  }

  // Student layout with sidebar and header
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          width: sidebarCollapsed ? '80px' : '280px'
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-shrink-0 border-r border-border"
      >
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate app initialization
    const initializeApp = async () => {
      try {
        // Validate environment configuration
        AppConfig.validate();
        
        // Load user preferences
        const theme = await window.electronAPI?.getTheme?.() || 'light';
        document.documentElement.classList.toggle('dark', theme === 'dark');
        
        // Load user progress
        await window.electronAPI?.loadProgress?.();
        
        // Initialize database services
        if (AppConfig.isDatabaseEnabled()) {
          console.log('🗄️ Database services initialized');
          // Database sync service is automatically initialized
        } else {
          console.warn('⚠️ Database services disabled - check environment variables');
        }
        
        // Initialize audio services
        // Add any other initialization logic here
        
        setTimeout(() => setIsLoading(false), 1500); // Minimum loading time for smooth UX
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <AudioProvider>
          <ProgressProvider>
            <AIProvider>
            <Router
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <AppLayout>
                <AnimatePresence mode="wait">
                  <Routes>
                    {/* Authentication Routes */}
                    <Route 
                      path="/auth/login" 
                      element={
                        <motion.div
                          key="login"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Login />
                        </motion.div>
                      } 
                    />
                    <Route 
                       path="/auth/signup" 
                       element={
                         <motion.div
                           key="signup"
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -20 }}
                           transition={{ duration: 0.3 }}
                         >
                           <SignUp />
                         </motion.div>
                       } 
                     />
                     <Route 
                       path="/auth/callback" 
                       element={
                         <motion.div
                           key="auth-callback"
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -20 }}
                           transition={{ duration: 0.3 }}
                         >
                           <AuthCallback />
                         </motion.div>
                       } 
                     />
                     
                     {/* Admin Dashboard Route */}
                     <Route 
                       path="/admin" 
                       element={
                         <motion.div
                           key="admin-dashboard"
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -20 }}
                           transition={{ duration: 0.3 }}
                         >
                           <AdminDashboard />
                         </motion.div>
                       } 
                     />
                      <Route 
                        path="/" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="dashboard"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Dashboard />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/chat" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="chat"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Chat />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/enhanced-chat" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="enhanced-chat"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <EnhancedChat />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/live-conversation" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="live-conversation"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <LiveConversation />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pronunciation" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="pronunciation"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Pronunciation />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/vocabulary" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="vocabulary"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Vocabulary />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/grammar" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="grammar"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Grammar />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/settings" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="settings"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Settings />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/assessment" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="assessment"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <AssessmentPage />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/assessment-test" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="assessment-test"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <AssessmentTest />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/database-health" 
                        element={
                          <motion.div
                            key="database-health"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            <DatabaseHealthCheck />
                          </motion.div>
                        } 
                      />
                  </Routes>
                </AnimatePresence>
              </AppLayout>
            </Router>
            </AIProvider>
          </ProgressProvider>
        </AudioProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;