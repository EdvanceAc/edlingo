# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🐛 Fixed
- **ProgressProvider PGRST204 Error**: Fixed `PGRST204` errors caused by unmapped camelCase fields in progress updates
  - Replaced `lessonsCompleted` with `total_lessons_completed` in `completeLesson` function
  - Fixed `dailyProgress` to use `daily_progress` to align with COLUMN_MAPPING
  - Corrected weekday string generation using proper `toLowerCase()` method
  - Updated fallback progress structure in `databaseService.js` to use consistent field names
  - All progress fields now properly map through `mapToDB()` function to prevent database column errors

### 🎯 Enhanced
- Improved error handling and field consistency across progress tracking systems
- Better alignment between local storage and Supabase database schemas

---

## Previous versions and changes would be documented here...