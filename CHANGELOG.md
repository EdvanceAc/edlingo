# EdLingo Changelog

All notable changes to the EdLingo project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.11] - 2025-08-15

### 🧪 Tests
- Stabilized Admin Buttons JSDOM test execution for admin-dashboard.html.
  - Implemented a Response-like fetch mock including headers.get, status fields, and body helpers to satisfy supabase-js expectations and prevent runtime errors.
  - Added comprehensive Supabase client mocks: auth.getSession, auth.getUser, and auth.admin.listUsers, plus from().select/order/limit behaviors, eliminating undefined method access during test runs.
  - Disabled timers in the JSDOM environment by mocking setTimeout/setInterval to avoid infinite auto-refresh loops during tests.
  - Resolved "Cannot read properties of undefined (reading 'get')" errors triggered by supabase-js when inspecting response headers in the test environment.
  - Ensured the test completes deterministically with exit code 0 and without hanging.

### 🐛 Fixed
- Resolved Supabase-related runtime error in tests: 'Cannot read properties of undefined (reading 'get')' by providing headers.get in the fetch mock and aligning with supabase-js expectations.
- Prevented hanging JSDOM tests by disabling auto-refresh timers (setTimeout/setInterval) in the test harness.

### 🛠️ Technical Improvements
- Strengthened test isolation by mocking localStorage and lucide icon initialization to prevent side effects.
- Preserved app logic while focusing changes strictly within the test harness (no production code paths altered).

## [1.0.10] - 2025-08-14

### 🐛 Fixed
- Course Wizard step indicator and progress bar now update correctly in the admin dashboard modal.
  - The header displays the accurate "Step X of 4" based on the current step.
  - The step title reflects the active step (e.g., "Basic Information", "Course Content", "Instructor Settings", "Review & Publish").
  - The progress bar width is now calculated from the current step and targets the progress bar inside the course modal header to avoid conflicts with other progress bars on the page.

### 🛠️ Technical Improvements
- Centralized and simplified progress UI updates inside `updateProgressIndicator`, called by `showWizardStep`.
- Added defensive bounds on progress percentage to prevent overflow/underflow (0–100%).

## [1.0.9] - 2025-01-03

### 🐛 Fixed
- **Critical Issues**: Resolved multiple critical issues including frontend resource loading errors (`net::ERR_EMPTY_RESPONSE`), Supabase database schema mismatches, and Vite development server configuration problems.
- **Database Schema**: Applied necessary database migrations to fix schema inconsistencies. This includes adding missing columns like `lessons_completed`, `difficulty_level`, and creating necessary triggers and functions.
- **Development Server**: Resolved port conflicts that prevented the Vite development server from starting, ensuring a stable development environment.
- **Application Stability**: Ensured the Electron application, database, and Supabase client initialize correctly, leading to a stable and fully operational state.

### 🛠️ Technical Improvements
- **Error Handling**: Improved error handling and debugging for database and server-related issues.
- **Development Workflow**: Streamlined the development workflow by resolving critical blockers and ensuring a stable build process.

## [1.0.8] - 2025-01-02

### 🐛 Fixed
- **Database Schema**: Added missing `cefr_level` column to courses table
  - Fixed PGRST204 error "Could not find the 'cefr_level' column of 'courses' in the schema cache"
  - Applied migration to add `cefr_level` TEXT column with default value 'A1'
  - Updated existing courses with appropriate CEFR levels based on difficulty mapping

- **Course Management**: Fixed course creation and update validation errors
  - Corrected CEFR level validation to check `formData.cefr_level` instead of `formData.level`
  - Added missing `updateCourse` method to Supabase courseService implementation
  - Fixed "TypeError: courseService.updateCourse is not a function" error
  - Enhanced course form data collection to properly map CEFR level field

### 🛠️ Technical Improvements
- **Admin Dashboard**: Improved course management functionality with proper CEFR level handling
- **Database Consistency**: Ensured all courseService implementations have consistent method signatures
- **Form Validation**: Enhanced validation logic to properly handle CEFR level requirements

## [1.0.7] - 2024-12-27

### ⚡ Ultra-Fast Streaming Optimizations
- **Gemini Live Response Speed**: Dramatically improved streaming response times from 30+ seconds to sub-second delivery
  - Reduced Edge Function timeout from 30s to 8s with optimized retry logic (250ms linear backoff)
  - Optimized Gemini generation config: reduced tokens to 100, temperature 0.6, topP 0.7, topK 20
  - Implemented immediate chunk delivery with forced flush for zero-delay first chunk
  - Enhanced client-side chunk processing with smart batching (immediate display for first 3 chunks)
  - Added ultra-fast streaming timeout (8s) with AbortController for maximum responsiveness

### 🚀 Performance Improvements
- **First Chunk Delivery**: Reduced from ~2-5s to ~0.5-1s for instant user feedback
- **Total Response Time**: Maximum timeout reduced from 90+ seconds to 30 seconds
- **Token Optimization**: Reduced from 150 to 100 tokens for lightning-fast generation
- **Prompt Optimization**: Implemented concise, context-aware prompts for faster AI processing

### 🎨 UI/UX Enhancements
- **StreamingChat Component**: Enhanced with optimized chunk rendering and improved visual indicators
- **StreamingChatDemo Page**: Updated with ultra-fast performance metrics and hyper-streaming branding
- **Visual Feedback**: Added gradient styling and enhanced streaming progress indicators
- **Performance Metrics**: Updated demo page to showcase sub-second response capabilities

### 🛠️ Technical Improvements
- **Edge Function**: Hyper-optimized `process-gemini-chat` with immediate Server-Sent Events delivery
- **Client Architecture**: Ultra-fast chunk processing with zero buffering delay
- **Error Handling**: Maintained robust error handling while maximizing speed
- **Streaming Protocol**: Enhanced SSE implementation with optimized flush timing

## [1.0.6] - 2024-12-27

### 🐛 Fixed
- **Live Conversation Stack Overflow**: Resolved critical `RangeError: Maximum call stack size exceeded` in live conversation feature
  - Fixed recursive call issue in `modernGeminiLiveService.js` `onstop` handler that prevented long audio recordings
  - Replaced direct `btoa` conversion with chunked `arrayBufferToBase64` method to handle large audio data safely
  - Implemented 1KB chunk processing with 512-byte sub-chunks to prevent memory overflow
  - Added asynchronous processing with `setTimeout` to yield control and prevent blocking the main thread
  - Enhanced session management with unique `recordingSessionId` to prevent cross-session interference
  - Improved audio resource cleanup to invalidate old recording sessions
  - Optimized `MediaRecorder` configuration for 0.5-second chunks for better real-time processing

### 🛠️ Technical Improvements
- **Audio Processing**: Restructured audio handling to support unlimited recording duration
- **Memory Management**: Enhanced memory efficiency for large audio data processing
- **Session Management**: Improved recording session isolation and cleanup
- **Error Handling**: Better error recovery for audio processing failures

### ✨ Enhanced
- Live conversation feature now supports long recordings (5+ minutes) without crashes
- Improved real-time audio processing with chunked transmission
- Better user experience with stable audio recording functionality
- Enhanced debugging capabilities for audio processing issues

## [1.0.5] - 2024-12-27

### 🐛 Fixed
- **Course Editing Duplicate Issue**: Resolved critical bug where editing a course created duplicate entries instead of updating existing records
  - Modified `submitCourseToDatabase` function in `admin-scripts.js` to properly detect edit vs create operations
  - Added conditional logic to call `courseService.updateCourse` for existing courses
  - Enhanced form state management with `dataset.isEdit` and `dataset.courseId` properties
  - Improved success messaging to differentiate between course creation and updates
  - Added proper form reset functionality to clear edit state after operations

- **Gemini Chat Service**: Fixed "Unknown error occurred" issues in Supabase Gemini service
  - Corrected response format handling in `supabaseGeminiService.js` to match Edge Function output
  - Fixed AI initialization logic in `AIProvider.jsx` for browser mode with Gemini API
  - Added automatic session ID creation when none is provided
  - Enhanced error handling and debugging logs for better troubleshooting

### 🛠️ Technical Improvements
- **Database Operations**: Enhanced course update functionality with proper IPC handlers
- **AI Service**: Improved browser mode detection and Gemini API key validation
- **Error Handling**: Better error messages and logging throughout the application
- **Code Quality**: Refactored course management logic for better maintainability

### ✨ Enhanced
- Course editing workflow now properly updates existing records
- Gemini chat responses now work correctly without mock fallbacks
- Improved user feedback for course management operations
- Better session management for AI chat functionality

## [1.0.4] - 2024-12-26

### Added
- Scroll feature to sidebar navigation by adding `overflow-y-auto` to the `nav` element in `Sidebar.jsx`.

## [1.0.3] - 2024-12-25

### ✨ Added
- **Course Editing Feature**: Comprehensive course editing functionality in admin dashboard
  - Enhanced course modal to support both create and edit operations
  - Dynamic modal title and button text based on operation mode
  - Implemented `editCourse` function to fetch and populate existing course data
  - Updated form submission handler to support both course creation and updates
  - Added proper state management for switching between create/edit modes
  - Integrated with Supabase for seamless course data updates
  - Maintains all existing file upload capabilities for course materials

### 🛠️ Technical Improvements
- **Modal State Management**: Enhanced modal functions for proper state reset
- **Form Data Handling**: Improved form submission logic with edit/create detection
- **Database Integration**: Optimized Supabase update operations for course modifications
- **User Experience**: Smooth transitions between create and edit workflows
- **Error Handling**: Comprehensive error management for course operations

### 🔧 Enhanced
- Course management workflow in admin dashboard
- Modal reusability for multiple operations
- Form validation and data persistence
- User feedback and success messaging

## [1.0.2] - 2024-12-20

### Fixed
- **Netlify Deployment**: Fixed admin page routing issue on Netlify deployment
  - Added proper redirect rule for `/admin` route to serve `admin-dashboard.html`
  - Updated Vite build configuration to copy admin HTML files to dist folder
  - Added cache-busting headers for admin HTML files to prevent caching issues
  - Resolved issue where admin page was loading old cached version after deployment

### Technical Improvements
- Enhanced `vite.config.js` with `generateBundle` hook to copy admin files during build
- Updated `netlify.toml` with specific routing and caching rules for admin pages
- Improved deployment reliability for standalone admin HTML files

## [1.0.1] - 2024-12-20

### 🔧 Enhanced Database Management & Admin Features

#### ✨ Added
- **Database Health Monitoring**: Real-time database connection status and health checks
- **Database Migration System**: Automated database schema migration scripts
- **Admin Database Service**: Dedicated service for admin database operations
- **Enhanced Error Handling**: Improved error reporting and debugging capabilities
- **Migration Scripts**: Complete set of database migration files (002-005)
  - Grammar lessons table structure
  - User progress columns fixes
  - Learning sessions relationship improvements
  - Sample vocabulary data

#### 🛠️ Technical Improvements
- **DatabaseHealthCheck Component**: React component for monitoring database status
- **Admin Database Service**: Centralized admin database operations
- **Migration Runner**: Automated database migration execution
- **Setup Scripts**: Admin database initialization and setup

#### 📁 New Files
- `src/renderer/components/DatabaseHealthCheck.jsx`
- `src/renderer/services/adminDatabaseService.js`
- `run-migrations.js`
- `scripts/setup-admin-database.js`
- `database/migrations/002_add_grammar_lessons.sql`
- `database/migrations/003_fix_user_progress_columns.sql`
- `database/migrations/004_fix_learning_sessions_relationship.sql`
- `database/migrations/005_add_sample_vocabulary.sql`
- `SETUP_DATABASE.md`

#### 🔄 Updated
- Enhanced admin dashboard functionality
- Improved database service configurations
- Updated authentication context
- Refined AI provider services
- Enhanced Supabase service integration

---

## [1.0.0] - 2024-12-20

### 🎉 Initial Release

First stable release of EdLingo - AI-Powered Language Learning Desktop App.

### ✨ Added

#### Core Application
- **Desktop Application**: Cross-platform Electron app for Windows, macOS, and Linux
- **Modern UI**: React 18 with Tailwind CSS and Framer Motion animations
- **Responsive Design**: Adaptive interface with dark/light theme support
- **Real-time Updates**: Live session handling and real-time data synchronization

#### AI Integration
- **Google Gemini AI**: Advanced AI-powered language learning conversations
- **Hugging Face Integration**: Alternative AI model support for offline capabilities
- **Smart Conversations**: Context-aware AI responses for natural language practice
- **Multi-language Support**: AI assistance for multiple target languages

#### Learning Features
- **Interactive Chat**: Real-time AI conversation practice with voice support
- **Enhanced Chat**: Advanced chat interface with audio playback and settings
- **Grammar Lessons**: Interactive grammar exercises with instant feedback
- **Vocabulary Building**: Personalized vocabulary learning and tracking
- **Lesson System**: Structured learning modules with progress tracking
- **Audio Support**: Text-to-speech and speech recognition capabilities

#### Progress Tracking
- **XP System**: Experience points and level progression
- **Streak Tracking**: Daily learning streak monitoring
- **Achievement System**: Badges and rewards for learning milestones
- **Analytics Dashboard**: Comprehensive progress visualization
- **Learning History**: Detailed session and conversation history

#### Admin Dashboard
- **User Management**: Complete user account administration
- **Course Management**: Create and manage learning courses
- **Assignment System**: Create, assign, and grade student work
- **Analytics & Reports**: Detailed analytics and reporting tools
- **Settings Management**: System configuration and customization
- **Student Progress Monitoring**: Track individual and group progress

#### Database & Storage
- **Local SQLite Database**: Offline-first data storage
- **Supabase Integration**: Cloud database synchronization
- **Data Migration System**: Structured database schema management
- **Row Level Security**: Secure data access policies
- **Automatic Backups**: Data persistence and recovery

#### Services & Infrastructure
- **Service Architecture**: Modular service-based design
- **Health Monitoring**: Real-time service status monitoring
- **Performance Tracking**: Application performance metrics
- **Error Handling**: Comprehensive error management system
- **API Integration**: External service integration framework

#### UI Components
- **Component Library**: Reusable UI components with Radix UI
- **Loading States**: Smooth loading animations and transitions
- **Toast Notifications**: User feedback and notification system
- **Modal Dialogs**: Interactive dialog and form components
- **Navigation**: Intuitive sidebar and header navigation

#### Security Features
- **API Key Management**: Secure API key storage and handling
- **User Authentication**: Secure login and session management
- **Data Encryption**: Protected user data and conversations
- **Admin Access Control**: Role-based access for administrative functions

### 🛠️ Technical Stack

#### Frontend
- React 18.2.0
- Vite 6.3.5 (Build tool)
- Tailwind CSS 3.4.17 (Styling)
- Framer Motion 10.16.16 (Animations)
- React Router DOM 6.20.1 (Navigation)
- Radix UI (Component primitives)
- Lucide React (Icons)

#### Backend
- Electron 28.1.0 (Desktop framework)
- Node.js (Runtime)
- SQLite (Local database)
- WebSocket (Real-time communication)

#### AI & External Services
- Google Generative AI 0.24.1
- Hugging Face Transformers 3.5.2
- Supabase 2.50.3 (Cloud database)
- Google APIs 144.0.0

#### Development Tools
- ESLint (Code linting)
- Vitest (Testing framework)
- Electron Builder (App packaging)
- Concurrently (Development workflow)

### 📁 Project Structure

```
EdLingo/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.js          # Application entry point
│   │   └── LiveSession.js   # Real-time session handling
│   ├── renderer/            # React frontend
│   │   ├── components/      # UI components
│   │   │   ├── admin/       # Admin dashboard components
│   │   │   ├── layout/      # Layout components
│   │   │   └── ui/          # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── EnhancedChat.jsx
│   │   │   ├── Grammar.jsx
│   │   │   └── Lessons.jsx
│   │   ├── providers/      # Context providers
│   │   ├── services/       # Frontend services
│   │   └── utils/          # Utility functions
│   ├── preload/            # Electron preload scripts
│   ├── services/           # Backend services
│   ├── database/           # Database schemas
│   ├── monitoring/         # Performance monitoring
│   └── utils/              # Shared utilities
├── database/
│   └── migrations/         # Database migration files
├── admin-dashboard.html    # Standalone admin interface
├── admin-login.html        # Admin authentication
└── Documentation files
```

### 📚 Documentation

- **README.md**: Comprehensive project documentation
- **ADMIN_DASHBOARD_README.md**: Admin dashboard user guide
- **SUPABASE_SETUP.md**: Database setup instructions
- **GOOGLE_DRIVE_SETUP.md**: Google Drive integration guide

### 🔧 Configuration

- **Environment Variables**: Secure API key and configuration management
- **Vite Configuration**: Optimized build and development setup
- **Tailwind Configuration**: Custom styling and theme configuration
- **ESLint Configuration**: Code quality and style enforcement
- **Electron Builder**: Multi-platform build configuration

### 🚀 Deployment

- **Cross-platform Builds**: Windows (NSIS), macOS (DMG), Linux (AppImage)
- **Netlify Integration**: Web deployment configuration
- **Development Workflow**: Hot reload and concurrent development
- **Production Builds**: Optimized and minified distributions

### 📊 Features Overview

#### For Students
- Interactive AI conversations for language practice
- Structured lessons with immediate feedback
- Progress tracking with XP and achievements
- Vocabulary building with spaced repetition
- Grammar exercises with explanations
- Audio support for pronunciation practice

#### For Teachers/Admins
- Complete user and course management
- Assignment creation and grading tools
- Detailed analytics and progress reports
- System configuration and settings
- Student progress monitoring
- Content management capabilities

#### For Developers
- Modular architecture with clear separation of concerns
- Comprehensive error handling and logging
- Performance monitoring and health checks
- Extensible service architecture
- Well-documented codebase
- Modern development tooling

---

## Repository Information

**Repository**: [EdLingo on GitHub](https://github.com/username/EdLingo)
**License**: MIT
**Author**: EdLingo Team
**Version**: 1.0.0
**Release Date**: December 20, 2024

---

*This changelog will be updated with each new release. For the latest changes, please check the [GitHub repository](https://github.com/username/EdLingo).*