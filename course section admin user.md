**Objective:**
Develop and integrate a **"Course Section" into the existing user dashboard** and a **"Course Management Section" into the existing admin dashboard** of our AI-powered language learning Electron JS web application. The implementation should be seamless, leveraging the existing architecture and AI capabilities, and maintaining the current modern, minimal, and unique UI.

**Current Platform Context:**
Our platform is an AI-powered language learning web application, currently developed using **Electron JS**. It features real-time AI interactions, an initial language proficiency assessment, and existing user management capabilities. The architecture is designed to be open and extensible, with direct connections to main AI sources for low latency. User data, progress, and content are managed and tracked (implicitly via existing features like progress tracking, content locking, and content management).

---

### **Section 1: User Dashboard - "Course Section"**

This section should provide users with a structured and interactive learning experience.

**Core Functionality:**
*   **Display Structured Learning Paths:** Implement the presentation of **structured learning paths** that guide users through diverse materials. These paths should clearly outline the sequence of lessons, modules, and topics.
*   **Content Progression ("Dripping System"):** Integrate the existing **"dripping system"** to control learner progression. Users should only be able to unlock subsequent content (lessons, modules) after completing prerequisites, which include:
    *   Finishing assignments.
    *   Passing tests/quizzes associated with the content.
    *   Potentially engaging in a minimum amount of free conversation practice relevant to the session or module.
*   **Level-Based Content Access:** Ensure that **content for higher proficiency levels is locked** for users currently at lower levels. This ties into the AI's initial and ongoing assessment of user proficiency.
*   **Diverse Material Presentation:** The course section must effectively present various learning materials:
    *   **Audio podcasts**.
    *   **Educational videos**.
    *   **Textual content**.
    *   **Interactive tests and quizzes** to check comprehension.
    *   Display uploaded **PDF books**.
    *   Allow students to **click on highlighted words within books to see synonyms**.
*   **Continuous Material Delivery:** The platform should be capable of providing learning material **throughout a session, from minute 1 to minute 90**, ensuring continuous engagement.

**AI Integration for Learning within Courses:**
*   **AI for Initial & Ongoing Assessment:** Leverage AI to track and **assess user progress** throughout the courses, building upon the initial AI-driven level assessment.
*   **Content Simplification:** Implement the AI's ability to **"break down text"** by simplifying complex language (grammar and vocabulary). The AI should tailor content suitability based on international standards like the CFR and custom metrics defined for different proficiency levels (A1-C2).
*   **Error Correction:** Display **AI-powered correction of language learners' errors** in pronunciation, vocabulary, and grammar within course activities or after interactions. Users should have options to review these errors and potentially self-correct.
*   **AI Speaking Speed Adjustment:** The system should allow for **adjusting the speaking speed of the AI** for different proficiency levels, especially slowing it down for beginners.
*   **Pattern-Based Learning for A1:** For absolute beginner (A1) learners, the course activities should primarily use a **pattern-based approach** with a limited set of basic questions and answers (e.g., 300-400), providing examples and **"scaffolding"** techniques to help learners formulate responses and build foundational sentence structures.
*   **Conversation History and Progress Tracking:** Ensure that all course-related interactions, including conversations and test results, are **recorded and stored in a database** for individual user progress tracking and personalization of future free discussion sessions.

**Content Presentation & User Experience:**
*   **Visual Aids for Vocabulary:** Implement the display of **pre-produced images from a custom image library** for core vocabulary words (e.g., 3000-4000) when a learner interacts with them. Avoid on-demand AI image generation for this purpose.
*   **Notifications:** The user dashboard should prominently display or provide access to **targeted notifications** about new courses, discounts, and promotions.
*   **Minimal and Intuitive UI:** The course section must adhere to the platform's **modern, minimal, and unique UI** design.

---

### **Section 2: Admin Dashboard - "Course Management Section"**

This section should provide administrators with comprehensive tools to create, manage, and monitor all aspects of courses.

**Core Functionality (Extension of Existing CMS-like Interface):**
*   **Comprehensive Course Creation & Editing Tools:** Extend the existing **CMS-like interface** (similar to WordPress) to allow administrators to:
    *   **Create new courses** and define structured learning paths.
    *   **Edit existing course content**, including modules, lessons, and individual materials.
    *   Upload and manage diverse learning materials such as **audio podcasts, educational videos, text documents, and quizzes/tests**.
    *   **Upload PDF books** for students to read and take quizzes on.
    *   Define and apply **highlighted words with synonyms** within uploaded books.
*   **Content Gating & Progression Rules:** Provide tools to configure and manage the **"dripping system"**:
    *   Set requirements for completing assignments and passing tests for course progression.
    *   Configure minimum free conversation hours needed to unlock subsequent levels.
    *   Define rules for re-attempts or retaking levels if assessment criteria are not met.
*   **Proficiency Level Mapping & Locking:** Allow administrators to associate specific course content and materials with defined **language proficiency levels (A1-C2)**. Implement tools to configure the **locking of higher-level content** for users at lower proficiency levels.
*   **AI Content Generation & Simplification Configuration:**
    *   Integrate tools to **leverage AI agents for content creation**, such as generating course titles, descriptions, lesson outlines, or initial textual content for lessons.
    *   Provide controls to **configure AI content simplification settings** based on proficiency levels, using CFR standards or custom metrics.
*   **Pre-built Image Library Management:** Enable administrators to **upload, categorize, and manage images for the pre-built vocabulary library** (3000-4000 words).
*   **Notification Management:** Provide an interface to **create and send targeted notifications** to users about new courses, discounts, and promotions.
*   **User & Access Management Integration:**
    *   Directly connect with the existing user management system to **control access to specific courses or course bundles for enterprise users**, including specifying "folder access and permissions".
    *   Manage **individual plan, family sharing plan, and corporate plan subscriptions**. These plans should directly influence which courses or features are accessible.
    *   Implement controls for **IP-based pricing** if applicable.
*   **Analytics and Reporting:** Extend the functionality to **view charts of user growth** to include course-specific metrics such as:
    *   Course enrollment numbers.
    *   Course completion rates.
    *   Average test scores within courses.
    *   User progression through learning paths.
*   **User-Friendly Interface:** The entire course management section must maintain a **simple and user-friendly interface**, allowing manual changes without requiring programming knowledge. This should empower clients/administrators to manage content and users directly.

---

### **Technical Implementation Considerations (for Electron JS Web App):**

*   **Electron JS Framework:** The development must integrate seamlessly with the existing Electron JS web application [User Statement]. Focus on using **web technologies (HTML, CSS, JavaScript)** for UI/UX, and ensure backend communication for data and AI services.
*   **Modular & Extensible Codebase:** Ensure the new sections are built with a **modular and open architecture**, allowing for future additions and modifications without significant rework.
*   **Backend Integration:** The Electron app will require robust communication with the backend for:
    *   Storing and retrieving course content, user progress, and assessment data.
    *   Interacting with AI services for content generation, simplification, error correction, and level assessment.
    *   Managing user accounts, permissions, and payment details.
*   **Database Design:** Design or extend the existing database schema to efficiently store course information, lesson materials, user progress, quiz results, and relationships between users, courses, and proficiency levels.
*   **UI/UX Consistency:** Maintain the established **modern, minimal, and unique UI** throughout the new course and management sections.
*   **Performance Optimization:** Ensure the addition of these sections does not negatively impact the application's speed or responsiveness.
*   **Version Control:** All code should be managed in private repositories on **GitHub**.

---

### **AI Prompting Guidelines (for this AI's execution):**

*   **Create Detailed Specification Files:** Before coding, create detailed specification documents within the project (e.g., in a `specs` folder) for each sub-feature of the course and course management sections. Elaborate on UI flows, data models, and specific functionalities. `@mention` these files in subsequent prompts for context.
*   **Establish Cursor Rules:** Define project-specific rules in the `.cursor/rules` directory to guide AI behavior, including coding style, folder structure, component reusability, and error handling. `@mention` these rule files.
*   **Iterate in Small Steps:** Break down the development of each section into smaller, manageable coding tasks.
*   **Use Agent Mode Effectively:** Utilize the AI's agent mode (Cmd+K or Ctrl+K) on smaller code selections (e.g., 1-50 lines) for specific coding tasks (e.g., building a UI component, implementing a data model, writing a backend integration function).
*   **Provide Explicit and Context-Rich Prompts:** Be very specific in each prompt, explicitly stating the desired outcome. `@mention` relevant specification files, rule files, and existing code files to provide maximum context.
*   **Reference Existing Code:** When modifying or adding to existing code, explicitly instruct the AI to consider the current codebase and avoid rewriting existing methods unless absolutely necessary.
*   **Request Planning for Complex Tasks:** For complex features or architectural decisions, ask the AI to outline a plan or present multiple approaches before generating any code.
*   **Utilize Apply and Accept:** Use the "Apply" and "Accept" options to carefully review and integrate AI-generated code, ensuring it aligns with project standards and requirements.
*   **Test Frequently and Debug with AI:** Run and test the application frequently. Provide the AI with error messages and logs and ask for suggestions on debugging and fixing issues.
*   **Commit Regularly:** Commit code changes frequently to maintain a clear version history and allow for easier rollback if needed.
*   **Focus on Simplicity and Accuracy:** When generating learning content or AI interactions, emphasize simplified language appropriate for different proficiency levels.
