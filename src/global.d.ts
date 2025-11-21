declare module './renderer/App.jsx';

// Matches imports inside src/renderer/App.tsx (relative to that file)
declare module './components/layout/Sidebar';
declare module './components/layout/Header';
declare module './components/ui/LoadingScreen';

declare module './pages/Dashboard';
declare module './pages/Chat';
declare module './pages/EnhancedChat';
declare module './pages/LiveConversation';
declare module './pages/Settings';
declare module './pages/AdminDashboard';
declare module './pages/Login';
declare module './pages/SignUp';
declare module './pages/AuthCallback';
declare module './pages/AssessmentPage';
declare module './pages/AssessmentTest';

declare module './components/auth/ProtectedRoute';
declare module './components/DatabaseHealthCheck';

declare module './providers/ThemeProvider';
declare module './providers/AudioProvider';
declare module './providers/ProgressProvider';
declare module './providers/AIProvider';

// Imports that go one level up from src/renderer
declare module '../config/AppConfig.js';
declare module './services/databaseSyncService.js';
declare module '*';
