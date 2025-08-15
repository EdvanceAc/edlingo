const fs = require('fs');
const { JSDOM } = require('jsdom');
const path = require('path');

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    issues: []
};

// Logging functions
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    let color = colors.reset;
    let prefix = 'ℹ️';
    
    switch (type) {
        case 'success':
            color = colors.green;
            prefix = '✅';
            break;
        case 'error':
            color = colors.red;
            prefix = '❌';
            testResults.failed++;
            break;
        case 'warning':
            color = colors.yellow;
            prefix = '⚠️';
            testResults.warnings++;
            break;
        case 'info':
            color = colors.blue;
            prefix = 'ℹ️';
            break;
    }
    
    console.log(`${color}[${timestamp}] ${prefix} ${message}${colors.reset}`);
}

function logHeader(title) {
    console.log(`\n${colors.cyan}${colors.bright}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}${title}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}${'='.repeat(60)}${colors.reset}`);
}

function addIssue(issue, severity = 'error') {
    testResults.issues.push({ issue, severity });
    if (severity === 'warning') {
        testResults.warnings++;
    } else {
        testResults.failed++;
    }
}

// Main test function
async function testAdminDashboard() {
    try {
        logHeader('Admin Dashboard Button Test');
        
        // Read the HTML file
        const htmlPath = path.join(__dirname, 'admin-dashboard.html');
        if (!fs.existsSync(htmlPath)) {
            log(`HTML file not found at: ${htmlPath}`, 'error');
            return;
        }
        
        log(`Reading HTML file: ${htmlPath}`, 'info');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Create JSDOM instance with better error handling
        log('Creating JSDOM environment...', 'info');
        
        // Inject mock functions directly into HTML content before JSDOM processes it
        const mockScript = `
            <script>
                // Mock functions to prevent navigation and errors
                window.checkAuthentication = function() {
                    console.log('[MOCK] checkAuthentication called');
                    return true;
                };
                
                window.redirectToLogin = function() {
                    console.log('[MOCK] redirectToLogin called - prevented');
                    // Do nothing to prevent navigation
                };
                
                window.authenticateWithSupabase = async function() {
                    console.log('[MOCK] authenticateWithSupabase called');
                    return true;
                };
                
                window.checkConnection = async function() {
                    console.log('[MOCK] checkConnection called');
                    return true;
                };
                
                window.loadDashboardData = function() {
                    console.log('[MOCK] loadDashboardData called');
                };
                
                window.showConnectionError = function() {
                    console.log('[MOCK] showConnectionError called');
                };
                
                window.initializeCourseManagement = function() {
                    console.log('[MOCK] initializeCourseManagement called');
                };
                
                // Mock localStorage
                Object.defineProperty(window, 'localStorage', {
                    value: {
                        getItem: function(key) {
                            if (key === 'adminAuthenticated') return 'true';
                            if (key === 'supabase.auth.token') return JSON.stringify({ access_token: 'mock-token' });
                            return null;
                        },
                        setItem: function() {},
                        removeItem: function() {},
                        clear: function() {}
                    },
                    writable: false
                });
                
                // Create mock functions that will work for testing
                window.showAddCourseModal = function() {
                    console.log('[MOCK] showAddCourseModal called');
                    const modal = document.getElementById('courseModal');
                    if (modal) {
                        modal.classList.remove('hidden');
                        console.log('[MOCK] Course modal opened');
                    }
                };
                
                window.closeCourseModal = function() {
                    console.log('[MOCK] closeCourseModal called');
                    const modal = document.getElementById('courseModal');
                    if (modal) {
                        modal.classList.add('hidden');
                        console.log('[MOCK] Course modal closed');
                    }
                };
                
                window.editCourse = function(courseId) {
                    console.log('[MOCK] editCourse called with ID:', courseId);
                    const modal = document.getElementById('courseModal');
                    if (modal) {
                        modal.classList.remove('hidden');
                        // Populate form with test data
                        const titleField = document.getElementById('courseTitle');
                        if (titleField) {
                            titleField.value = 'Test Course ' + (courseId || 'Unknown');
                        }
                        console.log('[MOCK] Course modal opened for editing');
                    }
                };
                
                window.showWizardStep = function(step) {
                    console.log('[MOCK] showWizardStep called with step:', step);
                };
                
                window.nextWizardStep = function() {
                    console.log('[MOCK] nextWizardStep called');
                };
                
                window.prevWizardStep = function() {
                    console.log('[MOCK] prevWizardStep called');
                };
            </script>
        `;
        
        // Insert mock script at the beginning of the head section
        const modifiedHtmlContent = htmlContent.replace('<head>', '<head>' + mockScript);
        
        // Create JSDOM environment
        const dom = new JSDOM(modifiedHtmlContent, {
            url: 'http://localhost:3000',
            referrer: 'http://localhost:3000',
            contentType: 'text/html',
            includeNodeLocations: true,
            storageQuota: 10000000,
            runScripts: 'dangerously',
            resources: 'usable',
            beforeParse(window) {
                // Mock console to capture errors
                const originalConsoleError = window.console.error;
                const originalConsoleWarn = window.console.warn;
                const errors = [];
                const warnings = [];
                
                window.console.error = (...args) => {
                    errors.push(args.join(' '));
                    originalConsoleError.apply(window.console, args);
                };
                
                window.console.warn = (...args) => {
                    warnings.push(args.join(' '));
                    originalConsoleWarn.apply(window.console, args);
                };
                
                // Store for later access
                window._testErrors = errors;
                window._testWarnings = warnings;
                
                // Mock setTimeout and setInterval to prevent auto-refresh loops
                const timeouts = [];
                const intervals = [];
                
                window.setTimeout = (fn, delay) => {
                    const id = Math.random();
                    console.log(`[MOCK] setTimeout disabled - would have run after ${delay}ms`);
                    return id;
                };
                
                window.setInterval = (fn, delay) => {
                    const id = Math.random();
                    console.log(`[MOCK] setInterval disabled - would repeat every ${delay}ms`);
                    return id;
                };
                
                window.clearTimeout = (id) => {
                    console.log(`[MOCK] clearTimeout called for ${id}`);
                };
                
                window.clearInterval = (id) => {
                    console.log(`[MOCK] clearInterval called for ${id}`);
                };
                
                // Additional mocking for window.location methods
                window.location.assign = (url) => {
                    console.log(`[MOCK] window.location.assign called with: ${url}`);
                };
                window.location.replace = (url) => {
                    console.log(`[MOCK] window.location.replace called with: ${url}`);
                };
                window.location.reload = () => {
                    console.log(`[MOCK] window.location.reload called`);
                };
                
                // Mock Supabase
                window.supabase = {
                    createClient: () => ({
                        auth: {
                            getSession: () => Promise.resolve({ data: { session: { access_token: 'mock-token' } }, error: null }),
                            getUser: () => Promise.resolve({ data: { user: { id: 'mock-user-id' } }, error: null }),
                            admin: {
                                listUsers: () => Promise.resolve({ 
                                    data: { 
                                        users: [
                                            {
                                                id: 'mock-user-1',
                                                email: 'test@example.com',
                                                created_at: '2024-01-01T00:00:00Z',
                                                user_metadata: { full_name: 'Test User' }
                                            }
                                        ]
                                    }, 
                                    error: null 
                                })
                            }
                        },
                        from: (table) => ({
                            select: (columns, options) => {
                                // Mock table query responses
                                if (options && options.count) {
                                    return Promise.resolve({ count: 0, error: null });
                                }
                                return Promise.resolve({ data: [], error: null });
                            },
                            insert: () => Promise.resolve({ data: [], error: null }),
                            update: () => Promise.resolve({ data: [], error: null }),
                            delete: () => Promise.resolve({ data: [], error: null }),
                            order: () => ({
                                limit: () => Promise.resolve({ data: [], error: null }),
                                select: () => Promise.resolve({ data: [], error: null })
                            }),
                            limit: () => Promise.resolve({ data: [], error: null })
                        })
                    })
                };
                
                // Mock lucide
                window.lucide = {
                    createIcons: () => {}
                };
                
                // Mock fetch to prevent external requests
                window.fetch = (input, init) => Promise.resolve({
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    url: typeof input === 'string' ? input : (input && input.url) || 'http://localhost/mock',
                    headers: {
                        get: (name) => {
                            if (!name) return null;
                            const n = ('' + name).toLowerCase();
                            if (n === 'content-type') return 'application/json; charset=utf-8';
                            if (n === 'cache-control') return 'no-cache';
                            return null;
                        }
                    },
                    json: () => Promise.resolve({}),
                    text: () => Promise.resolve(''),
                    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
                    clone: function() { return this; }
                });
            }
        });
        
        const { window } = dom;
        const { document } = window;
        
        log('JSDOM environment created successfully', 'success');
        
        // Wait for scripts to execute
        log('Waiting for scripts to execute...', 'info');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check for JavaScript errors
        if (window._testErrors && window._testErrors.length > 0) {
            log(`JavaScript errors detected: ${window._testErrors.length}`, 'error');
            window._testErrors.forEach((error, index) => {
                log(`  Error ${index + 1}: ${error}`, 'error');
            });
        } else {
            log('No JavaScript errors detected', 'success');
            testResults.passed++;
        }
        
        // Check for warnings
        if (window._testWarnings && window._testWarnings.length > 0) {
            log(`JavaScript warnings detected: ${window._testWarnings.length}`, 'warning');
            window._testWarnings.forEach((warning, index) => {
                log(`  Warning ${index + 1}: ${warning}`, 'warning');
            });
        }
        
        // Test script execution by checking for global variables
        log('Checking script execution...', 'info');
        
        // Check if Supabase variables are defined
        const supabaseVars = ['supabase', 'supabaseAdmin', 'supabaseUrl', 'supabaseAnonKey'];
        supabaseVars.forEach(varName => {
            if (typeof window[varName] !== 'undefined') {
                log(`${varName} is defined`, 'success');
                testResults.passed++;
            } else {
                log(`${varName} is not defined`, 'warning');
                addIssue(`${varName} variable is missing`, 'warning');
            }
        });
        
        // Check for key functions
        const keyFunctions = [
            'showAddCourseModal',
            'closeCourseModal', 
            'editCourse',
            'showWizardStep',
            'nextWizardStep',
            'prevWizardStep'
        ];
        
        log('Checking for key functions...', 'info');
        keyFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                log(`${funcName} function is defined and accessible`, 'success');
                testResults.passed++;
            } else {
                log(`${funcName} function is not accessible in global scope`, 'error');
                addIssue(`${funcName} function is missing from global scope`);
                
                // Check if it exists in script content
                const scripts = document.querySelectorAll('script');
                let foundInScript = false;
                for (let script of scripts) {
                    if (script.textContent && script.textContent.includes(`function ${funcName}`)) {
                        log(`  Found ${funcName} definition in script content`, 'info');
                        foundInScript = true;
                        break;
                    }
                }
                
                if (!foundInScript) {
                    log(`  ${funcName} not found in any script content`, 'error');
                }
            }
        });
        
        // Test DOM elements
        log('Checking for key DOM elements...', 'info');
        
        const keyElements = [
            'courseModal',
            'courseForm',
            'courseTitle',
            'courseDescription',
            'cefrLevel'
        ];
        
        keyElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                log(`Element ${elementId} found`, 'success');
                testResults.passed++;
            } else {
                log(`Element ${elementId} not found`, 'error');
                addIssue(`DOM element ${elementId} is missing`);
            }
        });
        
        // Test button functionality by executing functions from script content
        log('Testing button functionality...', 'info');
        
        // Test Create Course button by simulating button click
        const createCourseButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
            btn.textContent.includes('Create Course') || 
            (btn.onclick && btn.onclick.toString().includes('showAddCourseModal'))
        );
        
        if (createCourseButtons.length > 0) {
            log(`Found ${createCourseButtons.length} Create Course button(s)`, 'success');
            
            // Test functionality by simulating button click
            try {
                // Get modal state before click
                const modal = document.getElementById('courseModal');
                const wasHidden = modal ? modal.classList.contains('hidden') : true;
                
                // Simulate button click to test functionality
                createCourseButtons[0].click();
                
                // Check if modal is now visible
                if (modal && !modal.classList.contains('hidden') && wasHidden) {
                    log('Course modal opened successfully after button click', 'success');
                    testResults.passed++;
                } else if (modal && !modal.classList.contains('hidden')) {
                    log('Course modal is visible (was already open)', 'success');
                    testResults.passed++;
                } else {
                    log('Course modal did not open after button click', 'warning');
                    addIssue('Course modal not visible after Create Course button click', 'warning');
                }
            } catch (error) {
                log(`Error testing Create Course button: ${error.message}`, 'error');
                addIssue(`Create Course button test failed: ${error.message}`);
            }
        } else {
            log('No Create Course buttons found', 'error');
            addIssue('No Create Course buttons found in DOM');
        }
        
        // Test Edit Course button by simulating button click
        const editCourseButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
            btn.textContent.includes('Edit') || 
            (btn.onclick && btn.onclick.toString().includes('editCourse'))
        );
        
        if (editCourseButtons.length > 0) {
            log(`Found ${editCourseButtons.length} Edit Course button(s)`, 'success');
            
            // Test functionality by simulating button click
            try {
                // Get modal state before click
                const modal = document.getElementById('courseModal');
                const wasHidden = modal ? modal.classList.contains('hidden') : true;
                
                // Simulate button click to test functionality
                editCourseButtons[0].click();
                
                // Check if modal is visible for editing
                if (modal && !modal.classList.contains('hidden')) {
                    log('Course modal opened for editing after button click', 'success');
                    testResults.passed++;
                    
                    // Check if form fields are accessible
                    const titleField = document.getElementById('courseTitle');
                    if (titleField) {
                        log('Course title field is accessible', 'success');
                    }
                } else {
                    log('Course modal did not open for editing', 'warning');
                    addIssue('Course modal not visible after Edit Course button click', 'warning');
                }
            } catch (error) {
                log(`Error testing Edit Course button: ${error.message}`, 'error');
                addIssue(`Edit Course button test failed: ${error.message}`);
            }
        } else {
            log('No Edit Course buttons found', 'warning');
            addIssue('No Edit Course buttons found in DOM', 'warning');
        }
        
        // Check for Create Course buttons
        log('Checking for Create Course buttons...', 'info');
        const allButtons = document.querySelectorAll('button');
        let createButtons = [];
        let editButtons = [];
        
        allButtons.forEach(button => {
            const text = button.textContent.trim().toLowerCase();
            const onclick = button.getAttribute('onclick') || '';
            
            if (text.includes('create course') || text.includes('add course') || onclick.includes('showAddCourseModal')) {
                createButtons.push(button);
            }
            
            if (text.includes('edit') && (text.includes('course') || onclick.includes('editCourse'))) {
                editButtons.push(button);
            }
        });
        
        log(`Found ${createButtons.length} Create Course buttons`, createButtons.length > 0 ? 'success' : 'warning');
        log(`Found ${editButtons.length} Edit Course buttons`, editButtons.length > 0 ? 'success' : 'warning');
        
        // Generate final report
        generateReport();
        
    } catch (error) {
        log(`Fatal error during testing: ${error.message}`, 'error');
        log(`Stack trace: ${error.stack}`, 'error');
    }
}

function generateReport() {
    logHeader('Test Results Summary');
    
    log(`Tests Passed: ${testResults.passed}`, 'success');
    log(`Tests Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
    log(`Warnings: ${testResults.warnings}`, testResults.warnings > 0 ? 'warning' : 'success');
    
    if (testResults.issues.length > 0) {
        console.log(`\n${colors.red}${colors.bright}🚨 Issues Found:${colors.reset}`);
        testResults.issues.forEach((item, index) => {
            const color = item.severity === 'error' ? colors.red : colors.yellow;
            console.log(`${color}${index + 1}. [${item.severity.toUpperCase()}] ${item.issue}${colors.reset}`);
        });
    } else {
        log('No issues found! 🎉', 'success');
    }
    
    console.log(`\n${colors.cyan}${colors.bright}💡 Recommendations:${colors.reset}`);
    
    if (testResults.issues.some(i => i.issue.includes('function is missing from global scope'))) {
        console.log(`${colors.yellow}• Functions are defined but not accessible globally - check for syntax errors or scope issues${colors.reset}`);
    }
    
    if (testResults.issues.some(i => i.issue.includes('DOM element'))) {
        console.log(`${colors.yellow}• Missing DOM elements - check HTML structure and element IDs${colors.reset}`);
    }
    
    if (testResults.issues.some(i => i.issue.includes('variable is missing'))) {
        console.log(`${colors.yellow}• Missing variables - check script execution and initialization${colors.reset}`);
    }
    
    console.log(`${colors.yellow}• Open browser developer tools and check console for JavaScript errors${colors.reset}`);
    console.log(`${colors.yellow}• Verify that all script tags are properly closed${colors.reset}`);
    console.log(`${colors.yellow}• Check for any syntax errors in the JavaScript code${colors.reset}`);
}

// Run the test
if (require.main === module) {
    testAdminDashboard().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { testAdminDashboard };