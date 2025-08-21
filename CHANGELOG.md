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

## Previous versions and changes would be documented here...