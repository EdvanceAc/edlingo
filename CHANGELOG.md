# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### ✨ Added
- Admin Electron entrypoint for the Admin Dashboard via src/main/admin-main.js with dev/prod loading and GPU/IPC hardening for stability
- Netlify test index (edlingo_netlify_index.html) to validate Netlify build output and asset loading

### 🐛 Fixed
- **ProgressProvider PGRST204 Error**: Fixed `PGRST204` errors caused by unmapped camelCase fields in progress updates
  - Replaced `lessonsCompleted` with `total_lessons_completed` in `completeLesson` function
  - Fixed `dailyProgress` to use `daily_progress` to align with COLUMN_MAPPING
  - Corrected weekday string generation using proper `toLowerCase()` method
  - Updated fallback progress structure in `databaseService.js` to use consistent field names
  - All progress fields now properly map through `mapToDB()` function to prevent database column errors

### 🎯 Enhanced
- Lessons view: Hardened schema fallbacks in LessonsSection to support tables named "terms" or "sections" and FK columns "term_id" or "section_id", preventing blank views when schemas differ
- EnhancedAdminDashboard: improved rendering resilience and loading states for admin data flows
- Supabase service: tightened diagnostics and safer lookups used by Lessons and Admin views
- Build/dev parity: ensured env.js generation and Vite/Netlify compatibility; updated Vite config for consistent behavior across dev and production
- Improved error handling and field consistency across progress tracking systems
- Better alignment between local storage and Supabase database schemas

---

## [1.0.7] - 2025-08-04

### ✨ Added
- Streaming chat experience and demo: `src/renderer/components/StreamingChat.jsx`, `src/renderer/pages/StreamingChatDemo.jsx`
- Supabase Edge Function `process-gemini-chat` (Deno) for server-side chat processing
- Database migrations: `026_add_last_study_date_and_notifications.sql`, `016_add_cefr_level_to_courses.sql`
- Verification and utilities: `verify-database-schema.js`, `verify-pronunciation-accuracy-fix.js`, `refresh-postgrest-cache.js`
- Extensive automated tests and TestSprite scenarios

### 🐛 Fixed
- Admin Dashboard: course count accuracy and table alignment across RLS policies
- Netlify console errors and deployment stability
- RLS policies and user progress access (`fix-user-progress-rls.sql`, policy scripts)

### 🎯 Enhanced
- Ultra-fast streaming and lower-latency audio/text pipeline in `modernGeminiLiveService.js` and `supabaseGeminiService.js`
- Build/dev parity and migration stability (`run-migrations.js`, related scripts)
- Vite configuration and Electron startup robustness

## [1.0.6] - 2025-08-03

### 🐛 Fixed
- Live conversation stack overflow fix; improved stability of streaming conversation flow

## [1.0.5] - 2025-08-01

### ✨ Added
- Theme management and IPC handlers; documentation: `DEPRECATION_WARNINGS.md`, `THEME_MANAGEMENT.md`
- Supabase Edge Function deployment helper: `deploy-edge-function.js`

### 🐛 Fixed
- Gemini API key suspension handling with graceful fallback in `AIProvider.jsx` and services
- Netlify browser console errors; null-safety and error handling in providers
- Courses/admin schema alignment and RLS access; migration `025_update_courses_table_for_wizard.sql`

### 🎯 Enhanced
- Progress tracking flows and auth/routing resilience
- Streaming service robustness; `vite.config.js` optimizations

## [1.0.4] - 2025-07-26–2025-07-29

### 🐛 Fixed
- Course editing duplicate entry and delete-button behavior
- Skills Focus checkbox persistence; max students field population
- Course creation errors (removed obsolete `status`, switched to admin client for RLS bypass)

### 🎯 Enhanced
- Admin dashboard UX and schema consistency

## [1.0.3] - 2025-07-20–2025-07-25

### ✨ Added
- Comprehensive course management system (courses, lessons, assessments, RLS)
- New content delivery components and personalization hooks
- Seed scripts and Supabase storage upload tests

### 🐛 Fixed
- ProgressProvider null achievements error
- Admin RLS policy updates and migrations

## [1.0.2] - 2025-07-11–2025-07-17

### ✨ Added
- CEFR integration and MCP setup; assessment improvements and scripts
- Sidebar scroll feature and course wizard navigation fixes

### 🐛 Fixed
- Audio playback by buffering chunks before playback
- PGRST116 error and user profile creation; added `create-profile-function.sql`

## [1.0.1] - 2025-07-07–2025-07-08

### ✨ Added
- Database health monitoring, admin improvements, and migration scripts

### 🐛 Fixed
- Netlify build errors; `vite.config.js` env handling, admin/auth routing
- Gemini API key access in renderer process
- Netlify MIME type deployment issues

### 🎯 Enhanced
- Supabase configuration and Electron integration

## [1.0.0] - 2025-06-28

### ✨ Added
- Initial EdLingo Electron app with Gemini AI integration, core UI, services, and pipeline
- Netlify configuration and app scaffolding