import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css'

// Components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import LoadingScreen from './components/ui/LoadingScreen';
import DatabaseStatus from './components/DatabaseStatus';

// Pages
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import EnhancedChat from './pages/EnhancedChat';
import LiveConversation from './pages/LiveConversation';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import ComingSoon from './pages/ComingSoon';
import AdminDashboard from './pages/AdminDashboard';
import AdminSupport from './pages/AdminSupport';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import AuthCallback from './pages/AuthCallback';
import AssessmentPage from './pages/AssessmentPage';
import AssessmentTest from './pages/AssessmentTest';
import Courses from './pages/Courses';
import SupabaseGeminiTest from './components/SupabaseGeminiTest';
import Support from './pages/Support';

// Course Components
import CourseDetailsPage from '../components/Course/CourseDetailsPage';

// Auth Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import DatabaseHealthCheck from './components/DatabaseHealthCheck';

// Providers
import { ThemeProvider } from './providers/ThemeProvider';
import { AudioProvider } from './providers/AudioProvider';
import { ProgressProvider } from './providers/ProgressProvider';
import { AIProvider } from './providers/AIProvider';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext.jsx';

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
        className="hidden md:block flex-shrink-0 border-r border-border"
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
        <main className="flex-1 overflow-auto pb-[calc(var(--bottom-nav-height,88px)+env(safe-area-inset-bottom))] md:pb-0 bg-background">
          {children}
        </main>
        <BottomNav />
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
        <NotificationProvider>
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
                       path="/admin/support" 
                       element={
                         <motion.div
                           key="admin-support"
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -20 }}
                           transition={{ duration: 0.3 }}
                         >
                           <AdminSupport />
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
                        path="/courses" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="courses"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Courses />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/courses/:courseId" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="course-details"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <CourseDetailsPage />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />

                      {/* Coming Soon Route */}
                      <Route 
                        path="/coming-soon/:feature" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="coming-soon"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <ComingSoon />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />

                      <Route 
                        path="/profile" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="profile"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Profile />
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
                        path="/support" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="support"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Support />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/assessment" 
                        element={
                          <ProtectedRoute allowWithoutAssessment>
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
                          <ProtectedRoute allowWithoutAssessment>
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
                      <Route 
                        path="/supabase-gemini-test" 
                        element={
                          <ProtectedRoute>
                            <motion.div
                              key="supabase-gemini-test"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <SupabaseGeminiTest />
                            </motion.div>
                          </ProtectedRoute>
                        } 
                      />
                  </Routes>
                </AnimatePresence>
              </AppLayout>
            </Router>
              </AIProvider>
            </ProgressProvider>
          </AudioProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;