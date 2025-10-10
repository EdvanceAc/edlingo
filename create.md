# EdLingo – Simple Overview
 
 ## Executive Summary
 EdLingo is an AI-powered language learning app for desktop (Electron) and web (SPA). It blends chat tutoring, courses, assessments, live conversation, progress tracking, and an admin dashboard, backed by Supabase.
 
 ## Quick Demo (2 min)
 1) Open the app → Sign up or log in.
 2) Try Chat or Enhanced Chat for AI help.
 3) Open Courses → pick a course → try an Assessment.
 4) Check your progress on the Dashboard.
 
 ## How to Run Locally
 - Prereqs: Node 18+, npm 9+.
 - Env: copy `.env.example` to `.env`; set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (optional: `VITE_GEMINI_API_KEY` for direct Gemini fallback).
 - Desktop dev: `npm install && npm run dev` (starts Vite on http://127.0.0.1:3002 and Electron).
 - Admin (dev): open http://127.0.0.1:3002/admin for the Admin dashboard.
 - Web preview: `npm run build:netlify && npm run preview` (prebuild generates `public/env.js` from `.env`).
 - Package desktop app: `npm run build` (Vite build + electron-builder).
 
 ## Architecture at a Glance
 React + Vite + Tailwind (UI), Electron (desktop), Supabase (Auth, Postgres, Storage, Edge Functions), Google Gemini via Supabase functions, with offline/browser fallbacks.
 ## Security Note
 Never expose a Supabase service role key in the browser. Use only the anon key client‑side; keep privileged keys server‑side.
 
 - Do not set `VITE_SUPABASE_SERVICE_ROLE_KEY` for web builds; only set `VITE_SUPABASE_ANON_KEY`.
 - `npm run build:netlify` calls `generate:env` to create `public/env.js` from `.env`. Ensure it does not include any service role keys.
 
 ## What is EdLingo?
 EdLingo is a language-learning app with an AI tutor. Learners can chat with the AI, take lessons and assessments, track progress, and practice live conversations. It runs as a desktop app (Electron) and as a regular website.
 
 ## Who is it for?
 - Learners who want interactive, AI‑assisted language practice
 - Instructors/admins who manage courses, content, and learner progress

## Key Features (Easy Summary)
- **AI Chat Tutor**: Ask questions, practice conversations, get explanations.
- **Courses & Lessons**: Browse courses, view lesson content, and attached media.
- **Assessments**: Take quizzes/tests; get results and feedback.
- **Progress & Gamification**: Track XP, streaks, achievements, lesson completion.
- **Live Conversation**: Real‑time conversation practice (voice/text) with streaming AI responses.
- **Vocabulary Builder**: Save words, meanings, and examples.
- **Offline‑Friendly**: Works in browser mode with local storage and background sync.
- **Admin Dashboard**: Manage courses, lessons, analytics, and notifications.

 ## What’s Included in This App
 - **Desktop & Web UI**: React‑based interface with protected routes (login required for most pages).
 - **Backend (Supabase)**:
  - Auth (login/signup)
  - Postgres database with tables for users, courses, lessons, progress, analytics, etc.
  - Storage for lesson files (PDFs/media)
  - Edge Functions for AI and streaming
  - **AI Integration**: Google Gemini (via Supabase functions) with graceful fallbacks.
  - **File Storage**: Supabase Storage; optional Google Drive integration in browser.
  - **Security**: Row Level Security (RLS) so users only see their own data.

## How It Works (At a Glance)
- The React app calls Supabase for authentication and data.
- AI chat and live conversation go through Supabase Edge Functions (serverless) for Gemini.
- In desktop mode, Electron adds IPC hooks and privileged operations; in browser mode, a shim provides safe fallbacks and local syncing.

## Main Screens
- **Dashboard** (home)
- **Chat** and **Enhanced Chat** (AI tutor)
- **Courses** and **Course Details**
- **Assessment**
- **Settings**
- **Admin** (management & analytics)

 ## Tech Snapshot (High‑Level)
 - UI: React + Vite + Tailwind
 - Desktop: Electron
 - Backend as a Service: Supabase (Auth, DB, Storage, Edge Functions)
 - AI: Google Gemini via Supabase functions
 ## Environment (Quick)
 - `VITE_SUPABASE_URL`: Your Supabase project URL
 - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
 - `VITE_GEMINI_API_KEY` or `VITE_GOOGLE_GEMINI_API_KEY` (optional): Required for direct Gemini fallback when Edge Functions aren’t reachable
 
 ## Deployment Options
 - **Desktop App**: Package with Electron for Windows/Mac/Linux.
 - **Web App**: Deploy the built site to Netlify (or any static host). Supabase handles backend.
 - **Supabase**: Host the database, storage, and edge functions.
 
 ## Data & Privacy
 - Row Level Security (RLS) ensures each user can access only their own rows.
 - Supabase Auth persists session in the browser by default; use Sign Out to clear the local session.
 - Keys: Only the anonymous key is used client-side. Never include service role keys in `.env` for web builds.
 - Netlify builds: `npm run build:netlify` generates `public/env.js` from `.env`. Only include safe VITE_* keys; do not set service role keys.
 - Files: Lesson assets live in Supabase Storage; access is controlled by bucket policies and RLS-backed checks.
 
 ## Helpful Docs & Deep Dives
 - `README.md` – top-level setup and scripts
 - `SUPABASE_SETUP.md` – backend setup
 - `SETUP_DATABASE.md` – database schema and RLS
 - `ADMIN_DASHBOARD_README.md` – admin features and usage
 - `CEFR_INTEGRATION_SUMMARY.md` – CEFR levels and assessments
 - `AUDIO_FUNCTIONALITY.md` – audio and live conversation notes
 - `Connecting Your Web App to Gemini via Supabase.md` – AI integration
 - `NETLIFY_ERROR_FIX.md` – deployment troubleshooting
  
 ## Next Steps (Examples)
 - Plug in a production speech-to-text provider for live voice transcription.
 - Finalize admin-only workflows (content approvals, analytics dashboards).
 - Polish docs for onboarding and maintenance.
 
 If you need a quick demo: open the app, sign up or log in, visit “Chat” or “Courses,” try an assessment, and check your progress on the dashboard.
