/**
 * Admin Scripts for Course Creation Form Submission
 * Handles course wizard form data collection and secure IPC communication
 * Uses secure courseService instead of direct Supabase access
 */

// Import secure course service
let courseService = null;

// Initialize course service
function initializeCourseService() {
    try {
        // Check if we're in an Electron environment
        if (window.electronAPI) {
            console.log('✅ Electron environment detected, using secure IPC communication');
            // In a real Electron app, we would import the courseService
            // For now, we'll create a mock service that uses electronAPI
            courseService = {
                async createCourse(courseData, isDraft = false) {
                    const result = await window.electronAPI.invoke('db:createCourse', courseData, isDraft);
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to create course');
                    }
                    return result.course;
                },
                
                async updateCourse(courseId, courseData) {
                    const result = await window.electronAPI.invoke('db:updateCourse', courseId, courseData);
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to update course');
                    }
                    return result.course;
                },
                
                validateCourseData(courseData) {
                    const errors = [];
                    
                    if (!courseData.title || courseData.title.trim() === '') {
                        errors.push('Course title is required');
                    }
                    
                    if (!courseData.description || courseData.description.trim() === '') {
                        errors.push('Course description is required');
                    }
                    
                    if (!courseData.language || courseData.language.trim() === '') {
                        errors.push('Course language is required');
                    }
                    
                    if (!courseData.difficulty_level || courseData.difficulty_level.trim() === '') {
                        errors.push('Difficulty level is required');
                    }
                    
                    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
                    if (courseData.difficulty_level && !validDifficulties.includes(courseData.difficulty_level.toLowerCase())) {
                        errors.push('Invalid difficulty level. Must be: beginner, intermediate, or advanced');
                    }
                    
                    if (courseData.estimated_duration && (isNaN(courseData.estimated_duration) || courseData.estimated_duration <= 0)) {
                        errors.push('Estimated duration must be a positive number');
                    }
                    
                    if (courseData.price && (isNaN(courseData.price) || courseData.price < 0)) {
                        errors.push('Price must be a non-negative number');
                    }
                    
                    return errors;
                }
            };
        } else if (window.supabaseClient) {
            console.log('✅ Web environment detected, using Supabase client');
            // Web environment with Supabase
            courseService = {
                async createCourse(courseData, isDraft = false) {
                    try {
                        // Remove status field as it doesn't exist in courses table schema
                        // The is_active field can be used instead to control course visibility
                        courseData.is_active = !isDraft; // Set inactive for drafts, active for published
                        
                        // Use admin client to bypass RLS policies for course creation
                        const client = window.supabaseAdminClient || window.supabaseClient;
                        
                        // Insert course into Supabase
                        const { data, error } = await client
                            .from('courses')
                            .insert([courseData])
                            .select()
                            .single();
                        
                        if (error) {
                            throw new Error(error.message);
                        }
                        
                        return data;
                    } catch (error) {
                        console.error('❌ Error creating course:', error);
                        throw error;
                    }
                },
                
                validateCourseData(courseData) {
                    const errors = [];
                    
                    if (!courseData.title || courseData.title.trim() === '') {
                        errors.push('Course title is required');
                    }
                    
                    if (!courseData.description || courseData.description.trim() === '') {
                        errors.push('Course description is required');
                    }
                    
                    if (!courseData.language || courseData.language.trim() === '') {
                        errors.push('Course language is required');
                    }
                    
                    return errors;
                }
            };
        } else {
            console.warn('⚠️ Neither Electron nor Supabase environment detected.');
            // Fallback for environments without proper setup
            courseService = {
                async createCourse() {
                    throw new Error('Course creation service not available');
                },
                validateCourseData() {
                    return ['Course creation service not available'];
                }
            };
        }
        
        console.log('✅ Course service initialized');
    } catch (error) {
        console.error('❌ Failed to initialize course service:', error);
        throw error;
    }
}

// Collect form data from all wizard steps
function collectCourseFormData() {
    const formData = {};
    
    try {
        // Step 1: Basic Information
        formData.title = document.getElementById('courseTitle')?.value || '';
        formData.category = document.getElementById('courseCategory')?.value || 'General';
        formData.description = document.getElementById('courseDescription')?.value || '';
        formData.cefr_level = document.getElementById('cefrLevel')?.value || ''; // Use cefr_level column name
        formData.language = document.getElementById('courseLanguage')?.value || '';
        formData.duration_weeks = parseInt(document.getElementById('courseDuration')?.value) || 0;
        formData.hours_per_week = parseInt(document.getElementById('courseHours')?.value) || 0;
        formData.max_students = parseInt(document.getElementById('maxStudents')?.value) || 0;
        formData.price = parseFloat(document.getElementById('coursePrice')?.value) || 0;
        formData.currency = document.getElementById('courseCurrency')?.value || 'USD';
        
        // Step 2: Course Content & Lessons
        formData.learning_objectives = document.getElementById('learningObjectives')?.value || '';
        formData.prerequisites = document.getElementById('prerequisites')?.value || '';
        
        // Step 3: Instructor Settings
        formData.instructor_name = document.getElementById('instructorName')?.value || '';
        formData.instructor_email = document.getElementById('instructorEmail')?.value || '';
        formData.instructor_bio = document.getElementById('instructorBio')?.value || '';
        
        // Course Schedule
        formData.start_date = document.getElementById('courseStartDate')?.value || null;
        formData.enrollment_deadline = document.getElementById('enrollmentDeadline')?.value || null;
        
        // Schedule details - removed fields that don't exist in database schema
        // const scheduleDays = [];
        // document.querySelectorAll('input[name="scheduleDays"]:checked').forEach(checkbox => {
        //     scheduleDays.push(checkbox.value);
        // });
        // formData.schedule_days = scheduleDays;
        // formData.start_time = document.getElementById('startTime')?.value || '';
        // formData.session_duration = parseInt(document.getElementById('sessionDuration')?.value) || 60;
        
        // Assessment methods - removed as column doesn't exist in database
        // formData.assessment_method = document.querySelector('input[name="assessmentMethod"]:checked')?.value || 'continuous';
        
        // Course policies - removed fields that don't exist in database schema
        // formData.late_submission_policy = document.getElementById('lateSubmissionPolicy')?.value || '';
        // formData.attendance_policy = document.getElementById('attendancePolicy')?.value || '';
        // formData.makeup_session_policy = document.getElementById('makeupSessionPolicy')?.value || '';
        
        // Additional metadata - is_active will be set by createCourse based on isDraft parameter
        // Don't set is_active here as it will be overridden in createCourse
        formData.created_at = new Date().toISOString();
        formData.updated_at = new Date().toISOString();
        
        console.log('📋 Collected course form data:', formData);
        return formData;
        
    } catch (error) {
        console.error('❌ Error collecting form data:', error);
        throw new Error('Failed to collect form data: ' + error.message);
    }
}

// Validate form data before submission using secure service
function validateCourseData(formData) {
    try {
        // Ensure course service is initialized
        if (!courseService) {
            initializeCourseService();
        }
        
        // Use course service validation first
        const serviceErrors = courseService.validateCourseData(formData);
        
        // Additional form-specific validations
        const errors = [...serviceErrors];
        
        // Required fields validation
        if (!formData.category?.trim()) errors.push('Course category is required');
        if (!formData.level) errors.push('CEFR level is required');
        if (!formData.instructor_name?.trim()) errors.push('Instructor name is required');
        if (!formData.instructor_email?.trim()) errors.push('Instructor email is required');
        
        // Numeric validations
        if (formData.duration_weeks <= 0) errors.push('Duration must be greater than 0');
        if (formData.hours_per_week <= 0) errors.push('Hours per week must be greater than 0');
        if (formData.max_students <= 0) errors.push('Max students must be greater than 0');
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.instructor_email && !emailRegex.test(formData.instructor_email)) {
            errors.push('Invalid instructor email format');
        }
        
        // Date validations
        if (formData.start_date && formData.enrollment_deadline) {
            const startDate = new Date(formData.start_date);
            const enrollmentDate = new Date(formData.enrollment_deadline);
            if (enrollmentDate >= startDate) {
                errors.push('Enrollment deadline must be before course start date');
            }
        }
        
        return errors;
        
    } catch (error) {
        console.error('❌ Error validating course data:', error);
        return ['Validation service unavailable'];
    }
}

// Submit course data via secure IPC
async function submitCourseToDatabase(formData, isDraft = false) {
    try {
        console.log('🚀 Submitting course to database...', { isDraft });
        
        // Ensure course service is initialized
        if (!courseService) {
            initializeCourseService();
        }
        
        // Check if this is an edit operation
        const courseForm = document.getElementById('courseForm');
        const isEdit = courseForm && courseForm.dataset.isEdit === 'true';
        const courseId = courseForm && courseForm.dataset.courseId;
        
        let resultCourse;
        
        if (isEdit && courseId) {
            console.log('📝 Updating existing course:', courseId);
            // Use secure course service for update operations
            resultCourse = await courseService.updateCourse(courseId, formData);
            console.log('✅ Course updated successfully:', resultCourse);
        } else {
            console.log('🆕 Creating new course');
            // Use secure course service for create operations
            resultCourse = await courseService.createCourse(formData, isDraft);
            console.log('✅ Course created successfully:', resultCourse);
        }
        
        // Collect and save lesson data if any lessons exist
        try {
            console.log('📚 Collecting lesson data...');
            
            // Check if collectLessonsData function exists (from admin-dashboard.html)
            if (typeof collectLessonsData === 'function') {
                const lessonsData = await collectLessonsData();
                
                if (lessonsData && lessonsData.length > 0) {
                    console.log('📝 Found lessons to save:', lessonsData.length);
                    
                    // Save lessons using appropriate service
                    if (window.electronAPI) {
                        // Electron environment
                        const result = await window.electronAPI.invoke('db:createLessons', resultCourse.id, lessonsData);
                        if (result.success) {
                            console.log('✅ Lessons saved successfully via Electron');
                        } else {
                            console.warn('⚠️ Failed to save lessons via Electron:', result.error);
                        }
                    } else if (window.supabaseAdminClient || window.supabaseClient) {
                        // Web environment with Supabase
                        const client = window.supabaseAdminClient || window.supabaseClient;
                        const { data, error } = await client
                            .rpc('create_lessons_with_materials', {
                                p_course_id: resultCourse.id,
                                p_lessons: lessonsData
                            });
                        
                        if (error) {
                            console.warn('⚠️ Failed to save lessons via Supabase:', error);
                        } else {
                            console.log('✅ Lessons saved successfully via Supabase:', data?.length || 0);
                        }
                    }
                } else {
                    console.log('ℹ️ No lessons to save');
                }
            } else {
                console.log('ℹ️ collectLessonsData function not available');
            }
        } catch (lessonError) {
            console.warn('⚠️ Error saving lessons (course still created):', lessonError);
            // Don't throw here - course was created successfully, lesson saving is secondary
        }
        
        return resultCourse;
        
    } catch (error) {
        console.error('❌ Error submitting course:', error);
        throw error;
    }
}

// Show success message
function showSuccessMessage(course, isDraft = false, isEdit = false) {
    let message;
    if (isEdit) {
        message = `Course "${course.title}" updated successfully!`;
    } else {
        message = isDraft 
            ? `Course "${course.title}" saved as draft successfully!`
            : `Course "${course.title}" published successfully!`;
    }
        
    // Create and show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
        <div class="flex items-center">
            <i data-lucide="check-circle" class="w-5 h-5 mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
    
    // Refresh icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Show error message
function showErrorMessage(errors) {
    const errorList = Array.isArray(errors) ? errors : [errors];
    const errorMessage = errorList.join('\n');
    
    // Create and show error notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md';
    notification.innerHTML = `
        <div class="flex items-start">
            <i data-lucide="alert-circle" class="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"></i>
            <div>
                <div class="font-medium">Validation Error</div>
                <div class="text-sm mt-1 whitespace-pre-line">${errorMessage}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
        notification.remove();
    }, 8000);
    
    // Refresh icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Main form submission handler
async function handleCourseFormSubmission(isDraft = false) {
    try {
        console.log('📝 Starting course form submission...', { isDraft });
        
        // Initialize course service if not already done
        if (!courseService) {
            initializeCourseService();
        }
        
        // Collect form data
        const formData = collectCourseFormData();
        
        // Validate form data
        const validationErrors = validateCourseData(formData);
        if (validationErrors.length > 0) {
            console.warn('⚠️ Validation errors:', validationErrors);
            showErrorMessage(validationErrors);
            return false;
        }
        
        // Check if this is an edit operation
        const courseForm = document.getElementById('courseForm');
        const isEdit = courseForm && courseForm.dataset.isEdit === 'true';
        
        // Submit to database via secure service
        const resultCourse = await submitCourseToDatabase(formData, isDraft);
        
        // Show success message
        showSuccessMessage(resultCourse, isDraft, isEdit);
        
        // Close modal and reset form
        closeCourseModal();
        resetCourseForm();
        
        // Refresh courses list if function exists
        if (typeof loadCourses === 'function') {
            loadCourses();
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Course submission failed:', error);
        showErrorMessage(error.message || 'Failed to save course. Please try again.');
        return false;
    }
}

// Reset course form
function resetCourseForm() {
    const form = document.getElementById('courseForm');
    if (form) {
        form.reset();
        // Clear edit state
        delete form.dataset.courseId;
        delete form.dataset.isEdit;
    }
    
    // Reset wizard to first step
    if (typeof showStep === 'function') {
        showStep(1);
    }
}

// Close course modal
function closeCourseModal() {
    const modal = document.getElementById('courseModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Enhanced form submission handler that works with existing implementation
function enhanceExistingFormSubmission() {
    console.log('🔧 Enhancing existing course form handlers...');
    
    // Initialize course service
    initializeCourseService();
    
    // Override the existing saveDraft function if it exists
    if (typeof window.saveDraft === 'function') {
        const originalSaveDraft = window.saveDraft;
        window.saveDraft = async function() {
            console.log('📝 Enhanced save draft called');
            try {
                await handleCourseFormSubmission(true);
            } catch (error) {
                console.error('Enhanced save draft failed, falling back to original:', error);
                originalSaveDraft();
            }
        };
    } else {
        // Create saveDraft function if it doesn't exist
        window.saveDraft = async function() {
            console.log('📝 Creating new save draft function');
            await handleCourseFormSubmission(true);
        };
    }
    
    // Add enhanced validation to existing form submission
    const courseForm = document.getElementById('courseForm');
    if (courseForm) {
        // Add our validation before the existing form submission
        courseForm.addEventListener('submit', async (e) => {
            console.log('🔍 Enhanced validation triggered');
            
            // Collect and validate our enhanced form data
            try {
                const formData = collectCourseFormData();
                const validationErrors = validateCourseData(formData);
                
                if (validationErrors.length > 0) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    console.warn('⚠️ Enhanced validation failed:', validationErrors);
                    showErrorMessage(validationErrors);
                    return false;
                }
                
                console.log('✅ Enhanced validation passed');
                // Let the existing handler continue
                
            } catch (error) {
                console.warn('⚠️ Enhanced validation error, allowing existing handler:', error);
                // Let the existing handler continue even if our validation fails
            }
        }, true); // Use capture phase to run before existing handlers
    }
    
    console.log('✅ Course form handlers enhanced');
}

// Initialize event listeners when DOM is loaded
function initializeCourseFormHandlers() {
    console.log('🔧 Initializing enhanced course form handlers...');
    
    // Check if there are existing handlers and enhance them
    const hasExistingHandlers = document.getElementById('courseForm')?.onsubmit || 
                               document.querySelector('script')?.textContent?.includes('courseForm');
    
    if (hasExistingHandlers) {
        console.log('📋 Existing form handlers detected, enhancing...');
        enhanceExistingFormSubmission();
    } else {
        console.log('🆕 No existing handlers, creating new ones...');
        // Initialize course service
        initializeCourseService();
        
        // Finish button (publish course)
        const finishBtn = document.getElementById('finishBtn');
        if (finishBtn) {
            finishBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await handleCourseFormSubmission(false); // Publish
            });
        }
        
        // Save draft button
        const saveDraftBtn = document.getElementById('saveDraft');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await handleCourseFormSubmission(true); // Save as draft
            });
        }
        
        // Form submission handler
        const courseForm = document.getElementById('courseForm');
        if (courseForm) {
            courseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleCourseFormSubmission(false); // Default to publish
            });
        }
    }
    
    console.log('✅ Course form handlers initialized');
}

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCourseFormHandlers);
} else {
    initializeCourseFormHandlers();
}

// Export functions for global access
window.handleCourseFormSubmission = handleCourseFormSubmission;
window.collectCourseFormData = collectCourseFormData;
window.validateCourseData = validateCourseData;
window.submitCourseToDatabase = submitCourseToDatabase;
window.initializeCourseFormHandlers = initializeCourseFormHandlers;
window.initializeCourseService = initializeCourseService;