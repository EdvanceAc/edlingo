This comprehensive list outlines the required tasks, strategic decisions, and features necessary for the development of the AI Language Learning Platform, presented in a change-log style format.

## AI Language Learning Platform Project: Detailed Task Checklist (Changelog Style)

### Phase 0: Project Foundation, Legal, and Architecture Setup

| Task ID | Component | Description | Status | Source Citations |
| :--- | :--- | :--- | :--- | :--- |
| 0.1 | Strategy & Planning | Define and finalize detailed **Product, Technical, and UI Requirements** specification documents. | In Progress | `EdLingo_Technical_Presentation.md` |
| 0.2 | Technical Architecture | Ensure the programming is **open and extensible** for future additions and modifications. | In Progress | `vite.config.js`, `src/` modular services, Electron build in `package.json` |
| 0.3 | Deployment Strategy | Configure deployment using **foreign web servers** and platforms like **GitHub** to potentially bypass censorship and enable access to restricted AI services. | In Progress | Netlify build (`build:netlify`), `edlingo_netlify_index.html`, `server.js` |
| 0.4 | Code Management | Set up **private repositories on GitHub** for secure version control and code ownership. | Completed ✅ | Repo present `.git/` |
| 0.5 | AI Integration Layer | Configure a **direct connection to the main AI source** (Real-time API) to avoid intermediaries and ensure low latency. | In Progress | Supabase Edge Functions: `supabase/functions/process-gemini-chat/index.ts`, `supabase/functions/process-live-conversation/index.ts` |
| 0.6 | UI/UX Design | Design a **modern, minimal, and unique user interface** (UI) for the application. | In Progress | React/Electron UI, Tailwind usage in `src/renderer/pages/*`, `admin-dashboard.html` |
| 0.7 | Legal/Business | Establish a formal legal entity/company (e.g., outside of Iran, potentially US LLC) for contracting, ongoing support, and development. | To Do | |
| 0.8 | Technical Stack | Build the core platform as a **web application** (potentially using React) and/or a cross-platform mobile application using **Flutter**. | Completed ✅ | React 18 + Vite + Electron (`package.json`), Supabase SDK |

### Feature Group 1: User Management & Client Customization (CMS)

| Task ID | Component | Description | Status | Source Citations |
| :--- | :--- | :--- | :--- | :--- |
| 1.1 | Core Management | Implement a **user-friendly Content Management System (CMS)** interface, similar to WordPress, for platform administrators. | Completed ✅ | `admin-dashboard.html`, course/lesson utilities, `lesson_file_index.json` |
| 1.2 | Enterprise Access | Develop **granular access management** tools for enterprise users, allowing specification of **folder access and permissions**. | To Do | |
| 1.3 | User Monitoring | Integrate a **visual chart** functionality within the CMS for tracking and monitoring **user growth**. | In Progress | Placeholders in `admin-dashboard.html` (CEFR distribution/progress charts) |
| 1.4 | Authentication | Support **SSO (Single Sign-On)** and general enterprise logins. | In Progress | Supabase Auth email/password and Google OAuth in `src/renderer/services/supabaseService.js` |
| 1.5 | Client Branding | Implement **white-labeling and customization options** for institutional clients, allowing them to use their own names and logos. | To Do | |

### Feature Group 2: Payment and Financial Systems

| Task ID | Component | Description | Status | Source Citations |
| :--- | :--- | :--- | :--- | :--- |
| 2.1 | Cryptocurrency | Implement **cryptocurrency payment integration** (e.g., Bitcoin, Solana, Ethereum, USDC, USDT) to potentially bypass sanctions and restrictions. | To Do | |
| 2.2 | Crypto Transactions | Develop a system to generate automatic **QR codes** for instant crypto payments and direct transfer to a digital wallet. | To Do | |
| 2.3 | Currency Support | Plan architecture to support **multiple payment options**, including local currencies, foreign currencies, and digital wallets. | To Do | |
| 2.4 | Pricing Logic | Implement **IP-based pricing functionality** to adjust fees/prices based on the user's geographical location. | To Do | |
| 2.5 | Affiliate CRM | Develop a **CRM/management panel** for tracking affiliate marketing relationships, calculating commissions/fees, and managing discounts. | To Do | |

### Feature Group 3: Assessment and Learning Flow

| Task ID | Component | Description | Status | Source Citations |
| :--- | :--- | :--- | :--- | :--- |
| 3.1 | Initial Assessment | Develop the **AI-driven initial level assessment** based on a short **conversation (5-10 minutes)** and a **brief writing sample (a paragraph)**. | In Progress | Assessment APIs in `src/renderer/services/supabaseService.js` (assessment_sessions/tasks); `supabase/functions/process-live-conversation` |
| 3.2 | AI Evaluation | Configure AI to analyze language proficiency based on **grammar, fluency, pronunciation, and vocabulary range**. | In Progress | Pronunciation analysis hooks in `LessonsSection.jsx`, AI prompts in `supabaseGeminiService.js` |
| 3.3 | Level Placement | Ensure users are automatically placed into the appropriate proficiency level (A1-C2) using CFR standards and custom metrics. | In Progress | CEFR tables and queries in `supabaseService.js` (cefr_assessment_questions), course level fields |
| 3.4 | Content Gating | Implement the **"dripping system"** to lock content sequentially, requiring completion of assignments, passing tests, and a minimum amount of free conversation practice. | In Progress | `Lessons.jsx` and `CourseDetailsPage.jsx` show unlocked/completed states and gating UI |
| 3.5 | Content Locking | Implement content restriction so material for **higher proficiency levels is locked** for users at lower levels. | In Progress | UI gating indicators; backend enforcement TBD |
| 3.6 | Beginner Interaction | Implement a **pattern-based approach** for A1 learners using 300-400 basic questions/answers with scaffolding and modeling techniques. | To Do | |

### Feature Group 4: AI Interaction and Correction

| Task ID | Component | Description | Status | Source Citations |
| :--- | :--- | :--- | :--- | :--- |
| 4.1 | Low Latency | Ensure **real-time AI processing** for simultaneous speech-to-text, processing, generation, and text-to-speech conversion to minimize delay. | In Progress | SSE streaming in Edge Functions; STT/TTS via Web Speech in `AUDIO_FUNCTIONALITY.md` |
| 4.2 | Error Correction | Implement AI correction functionality for **pronunciation, vocabulary, and grammar**. | In Progress | Pronunciation prompts and analysis; grammar/vocab prompts in `supabaseGeminiService.js` |
| 4.3 | Feedback System | Develop a system to **record and save conversation history** (text and voice/audio files) in the database for post-conversation review. | In Progress | Inserts into `live_conversation_messages`; optional `chat_messages` persistence in Edge Function |
| 4.4 | Error Analysis UI | Design a feature to analyze, list, and display **learner errors** (including potential analysis of **intonation** and pronunciation) after a conversation session. | To Do | |
| 4.5 | Self-Correction | Implement functionality allowing the learner to attempt **self-correction** of listed errors before receiving the correct answers from the AI. | To Do | |
| 4.6 | Speaking Speed | Implement the ability to **adjust the AI speaking speed** based on the learner's proficiency level (slowing down for beginner levels). | Completed ✅ | TTS options in `AUDIO_FUNCTIONALITY.md` and `src/renderer/services/modernGeminiLiveService.js` |
| 4.7 | Content Simplification | Implement the **"breaking down text"** feature, configuring AI using CFR and custom metrics to simplify complex language suitable for varying proficiency levels. | In Progress | AI prompts for vocabulary introductions and simplification in `supabaseGeminiService.js` |
| 4.8 | Pronunciation Visuals | Integrate **phonetic symbols** and potentially a simple avatar/visual aid (like moving lips) to demonstrate correct pronunciation. | Completed ✅ | IPA displays in `src/renderer/pages/Lessons.jsx` |

### Feature Group 5: Content Creation and Assets

| Task ID | Component | Description | Status | Source Citations |
| :--- | :--- | :--- | :--- | :--- |
| 5.1 | Image Dictionary | Create a **pre-produced database/library of images** for a core vocabulary (e.g., **3000-4000 words**). | In Progress | Supabase Storage assets referenced in `lesson_file_index.json` |
| 5.2 | Visual Retrieval | Configure the system to instantly **retrieve and display images** from the pre-built library when a word is searched, avoiding real-time AI generation. | In Progress | Retrieval via pre-indexed lesson file JSON and storage paths |
| 5.3 | Teacher Upload | Implement a section allowing teachers to **upload educational materials** (e.g., PDF books) for students to read and take quizzes on. | Completed ✅ | Upload + storage in `admin-dashboard.html`; persisted files in `lesson_file_index.json` |
| 5.4 | Highlighting Feature | Develop functionality for teachers to **highlight words in uploaded content** and add synonyms/definitions for student viewing. | Completed ✅ | PDF highlights table in `admin-dashboard.html`; automatic fetch functionality; database persistence in `books` and `word_highlights` tables |
| 5.5 | Advanced Media | Explore and potentially implement **AI voice cloning** and realistic **lip-syncing** capabilities for personalized learning experiences and translated content (future/premium feature). | To Do | |

### Feature Group 6: Deployment, UX, and Testing

| Task ID | Component | Description | Status | Source Citations |
| :--- | :--- | :--- | :--- | :--- |
| 6.1 | Notifications | Implement a system for sending **targeted push notifications** to users about new courses, discounts, and promotions. | To Do | |
| 6.2 | Subscription Models | Configure infrastructure to support individual, family sharing, and **corporate/enterprise subscription plans**. | To Do | |
| 6.3 | UX Toggles | Implement a user-facing **dark/light mode toggle**. | Completed ✅ | Electron theme IPC (`src/main/main.js`), preload bridge, `src/renderer/App.jsx` toggle |
| 6.4 | Security/DRM | Implement a **screenshot prevention feature** (where the captured image is empty/blank). | To Do | |
| 6.5 | Testing | **Run the app and debug it thoroughly** to make the beta version ready for launch, initially focusing on the Iranian market. | In Progress | Numerous test harnesses: `testsprite_tests/*`, `test-*.js/html`; `SPEECH_RECOGNITION_FIXES.md` |
| 6.6 | CI/CD | Set up a basic **CI/CD pipeline** (e.g., using GitHub Actions) for automated building, testing, and deployment (specifically for Flutter/Mobile implementation). | To Do | |
| 6.7 | Code Structure | Implement a **clean architecture pattern** (Domain, Data, Presentation layers) to ensure maintainability and testability (specifically for Flutter/Mobile implementation). | In Progress | Service/provider layering in `src/renderer/services/*`, `providers/*` |
| 6.8 | Model Selection | Finalize the selection of specific AI models (e.g., Gemini, DeepSeek, Grok, OpenAI) to be used for various platform functionalities, considering cost and performance. | In Progress | Gemini selected in Edge Functions; HF transformers dependency present |


