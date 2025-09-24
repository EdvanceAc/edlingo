// Test script to verify PDF highlights persistence
// This script can be run in the browser console to debug the highlights issue

console.log('🔍 Testing PDF Highlights Persistence...');

// Test data
const testCourseId = '123e4567-e89b-12d3-a456-426614174000';
const testLessonsData = [
    {
        title: 'Test Lesson',
        materials: [
            {
                type: 'pdf',
                file_url: 'https://example.com/test.pdf',
                metadata: {
                    highlights: [
                        {
                            id: 'test-1',
                            word: 'example',
                            synonyms: ['sample', 'instance'],
                            page: 1,
                            rect: { x: 0.1, y: 0.2, w: 0.15, h: 0.05 },
                            refs: { images: [], audio: [], video: [] }
                        },
                        {
                            id: 'test-2',
                            word: 'learning',
                            synonyms: ['studying', 'education'],
                            page: 1,
                            rect: { x: 0.3, y: 0.4, w: 0.12, h: 0.04 },
                            refs: { images: [], audio: [], video: [] }
                        }
                    ]
                }
            }
        ]
    }
];

async function testDatabaseAccess() {
    console.log('📡 Testing database access...');
    
    // Check if Supabase is available
    if (!window.supabase || !window.supabaseClient) {
        console.error('❌ Supabase not available');
        return false;
    }
    
    const client = window.supabaseAdminClient || window.supabaseClient;
    
    try {
        // Test basic connectivity
        const { data: testData, error: testError } = await client
            .from('courses')
            .select('count')
            .limit(1);
        
        if (testError) {
            console.error('❌ Basic connectivity test failed:', testError.message);
            return false;
        }
        
        console.log('✅ Basic connectivity test passed');
        
        // Test books table access
        const { data: booksData, error: booksError } = await client
            .from('books')
            .select('count')
            .limit(1);
        
        if (booksError) {
            console.error('❌ Books table access failed:', booksError.message);
            return false;
        }
        
        console.log('✅ Books table accessible');
        
        // Test word_highlights table access
        const { data: highlightsData, error: highlightsError } = await client
            .from('word_highlights')
            .select('count')
            .limit(1);
        
        if (highlightsError) {
            console.error('❌ Word highlights table access failed:', highlightsError.message);
            return false;
        }
        
        console.log('✅ Word highlights table accessible');
        return true;
        
    } catch (e) {
        console.error('❌ Database access test failed:', e.message);
        return false;
    }
}

async function testCourseCreation() {
    console.log('🏗️ Testing course creation...');
    
    const client = window.supabaseAdminClient || window.supabaseClient;
    
    try {
        // Check if test course exists
        const { data: existingCourse, error: checkError } = await client
            .from('courses')
            .select('id')
            .eq('id', testCourseId)
            .single();
        
        if (checkError && checkError.code === 'PGRST116') {
            // Course doesn't exist, create it
            console.log('🔨 Creating test course...');
            const { data: newCourse, error: createError } = await client
                .from('courses')
                .insert({
                    id: testCourseId,
                    title: 'Test Course for Highlights',
                    description: 'Test course for PDF highlights functionality',
                    language: 'en',
                    level: 'beginner'
                })
                .select('id')
                .single();
            
            if (createError) {
                console.error('❌ Failed to create test course:', createError.message);
                return false;
            }
            
            console.log('✅ Test course created:', newCourse.id);
        } else if (checkError) {
            console.error('❌ Error checking for existing course:', checkError.message);
            return false;
        } else {
            console.log('✅ Test course already exists:', existingCourse.id);
        }
        
        return true;
    } catch (e) {
        console.error('❌ Course creation test failed:', e.message);
        return false;
    }
}

async function testHighlightsPersistence() {
    console.log('💾 Testing highlights persistence...');
    
    // Check if persistPdfHighlightsToDb function is available
    if (typeof persistPdfHighlightsToDb !== 'function') {
        console.error('❌ persistPdfHighlightsToDb function not found');
        return false;
    }
    
    try {
        await persistPdfHighlightsToDb(testCourseId, testLessonsData);
        console.log('✅ Highlights persistence completed - check console for detailed logs');
        return true;
    } catch (e) {
        console.error('❌ Highlights persistence failed:', e.message);
        return false;
    }
}

async function runFullTest() {
    console.log('🚀 Starting full PDF highlights test...');
    
    const dbAccess = await testDatabaseAccess();
    if (!dbAccess) {
        console.log('❌ Test stopped - database access failed');
        return;
    }
    
    const courseCreated = await testCourseCreation();
    if (!courseCreated) {
        console.log('❌ Test stopped - course creation failed');
        return;
    }
    
    const highlightsPersisted = await testHighlightsPersistence();
    if (!highlightsPersisted) {
        console.log('❌ Test stopped - highlights persistence failed');
        return;
    }
    
    console.log('🎉 All tests passed! Check the database for highlights data.');
}

// Auto-run the test if this script is loaded
if (typeof window !== 'undefined') {
    console.log('🔧 PDF Highlights test script loaded. Run runFullTest() to start testing.');
    window.runFullTest = runFullTest;
    window.testDatabaseAccess = testDatabaseAccess;
    window.testCourseCreation = testCourseCreation;
    window.testHighlightsPersistence = testHighlightsPersistence;
}
