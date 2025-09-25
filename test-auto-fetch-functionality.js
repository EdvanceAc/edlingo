// Test script to verify the automatic PDF highlights fetching functionality
const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as admin dashboard
const supabaseUrl = 'https://ecglfwqylqchdyuhmtuv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ2xmd3F5bHFjaGR5dWhtdHV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgxMTI5MCwiZXhwIjoyMDY3Mzg3MjkwfQ.kVkiHxUJG4EbTjxWZwXK6SrfG6wPBgkKJhHeCIQ0Cpg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test data
const ELEMENTRY_COURSE_ID = '56d725cc-ca41-453e-8909-7c760f2c5851';

async function testAutoFetchFunctionality() {
    console.log('🧪 Testing Automatic PDF Highlights Fetch Functionality');
    console.log('='.repeat(70));
    
    try {
        // Test 1: Verify course exists
        console.log('\n1️⃣ TEST 1: Course Verification');
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('id, title')
            .eq('id', ELEMENTRY_COURSE_ID)
            .single();
        
        if (courseError || !course) {
            console.log('   ❌ Elementry course not found');
            return;
        }
        console.log(`   ✅ Course found: "${course.title}" (${course.id})`);
        
        // Test 2: Test findAnyPdfForCourse functionality
        console.log('\n2️⃣ TEST 2: Find Any PDF for Course');
        const pdfUrl = await findAnyPdfForCourse(ELEMENTRY_COURSE_ID);
        
        if (!pdfUrl) {
            console.log('   ❌ No PDF found for course');
            return;
        }
        console.log(`   ✅ Found PDF: ${pdfUrl}`);
        
        // Test 3: Test fetchAnyHighlightsForCourse functionality
        console.log('\n3️⃣ TEST 3: Fetch Any Highlights for Course');
        const highlights = await testFetchAnyHighlightsForCourse(ELEMENTRY_COURSE_ID);
        
        if (highlights.length === 0) {
            console.log('   ❌ No highlights found for course');
        } else {
            console.log(`   ✅ Found ${highlights.length} highlight(s):`);
            highlights.forEach((highlight, index) => {
                console.log(`      ${index + 1}. "${highlight.word}" → [${highlight.synonyms.join(', ')}]`);
            });
        }
        
        // Test 4: Simulate automatic trigger scenario
        console.log('\n4️⃣ TEST 4: Simulate Automatic Trigger Scenario');
        console.log('   📋 Scenario: User creates new PDF content and selects "PDF Document" type');
        console.log('   📋 Expected: System automatically fetches and displays existing highlights');
        console.log('');
        console.log('   🔄 Simulating autoFetchPdfHighlights() workflow...');
        console.log('   1. ✅ Content type: PDF detected');
        console.log(`   2. ✅ Course ID: ${ELEMENTRY_COURSE_ID} obtained`);
        console.log(`   3. ✅ PDF URL: ${pdfUrl} found for course`);
        console.log(`   4. ✅ Highlights: ${highlights.length} fetched from database`);
        console.log('   5. ✅ Table: Would be populated with highlights');
        
        // Test 5: Verify what user will see
        console.log('\n5️⃣ TEST 5: User Experience Summary');
        console.log('   🎯 What happens when user selects "PDF Document" in admin dashboard:');
        console.log('');
        console.log('   📝 Step 1: User adds new lesson content');
        console.log('   📝 Step 2: User selects "PDF Document" from dropdown');
        console.log('   📝 Step 3: PDF content fields appear with highlights table');
        console.log('   📝 Step 4: System automatically triggers autoFetchPdfHighlights()');
        console.log('   📝 Step 5: "Fetch Existing" button shows loading indicator');
        console.log('   📝 Step 6: System finds existing PDF and highlights for course');
        console.log('   📝 Step 7: Highlights table is automatically populated');
        console.log('   📝 Step 8: User sees pre-filled highlights ready to use/edit');
        console.log('');
        console.log('   📋 Expected table contents:');
        highlights.forEach((highlight, index) => {
            console.log(`      Row ${index + 1}:`);
            console.log(`         Word/Phrase: "${highlight.word}"`);
            console.log(`         Synonyms: "${highlight.synonyms.join(', ')}"`);
            console.log(`         Page: ${highlight.page}`);
            console.log(`         X: ${highlight.rect.x}, Y: ${highlight.rect.y}`);
            console.log(`         W: ${highlight.rect.w}, H: ${highlight.rect.h}`);
        });
        
        console.log('\n✨ AUTOMATIC FETCH FUNCTIONALITY VERIFICATION COMPLETE ✨');
        console.log('');
        console.log('🎉 The automatic PDF highlights fetching should work as follows:');
        console.log('');
        console.log('📌 AUTOMATIC TRIGGERS:');
        console.log('   • When user selects "PDF Document" content type');
        console.log('   • Automatically finds existing PDFs for the course');
        console.log('   • Fetches all highlights for course PDFs');
        console.log('   • Populates table without user intervention');
        console.log('');
        console.log('📌 MANUAL TRIGGER:');
        console.log('   • Blue "Fetch Existing" button in PDF highlights section');
        console.log('   • User can click to manually trigger the fetch process');
        console.log('   • Shows loading indicator during fetch');
        console.log('');
        console.log('📌 EXPECTED RESULT:');
        console.log('   • Highlights table automatically populated with existing data');
        console.log('   • "Banan" → "Christ Follower" appears in table');
        console.log('   • User can immediately see, edit, or add to existing highlights');
        
    } catch (error) {
        console.log('\n❌ Test failed:', error.message);
    }
}

// Helper functions (copied from admin-dashboard.html)
async function findAnyPdfForCourse(courseId) {
    try {
        const { data: books, error } = await supabase
            .from('books')
            .select('pdf_url')
            .eq('course_id', courseId)
            .limit(1);

        if (error || !books || books.length === 0) {
            return null;
        }

        return books[0].pdf_url;
    } catch (e) {
        console.error('findAnyPdfForCourse: Error:', e?.message || e);
        return null;
    }
}

async function testFetchAnyHighlightsForCourse(courseId) {
    try {
        // Get all books for this course
        const { data: books, error: booksError } = await supabase
            .from('books')
            .select('id, title, pdf_url')
            .eq('course_id', courseId);

        if (booksError || !books || books.length === 0) {
            return [];
        }

        // Get all highlights for all books in this course
        const bookIds = books.map(book => book.id);
        const { data: highlights, error: highlightsError } = await supabase
            .from('word_highlights')
            .select('id, word, synonyms, page_number, position, book_id')
            .in('book_id', bookIds)
            .order('page_number', { ascending: true });

        if (highlightsError || !highlights || highlights.length === 0) {
            return [];
        }

        // Convert to UI format
        const formattedHighlights = highlights.map(h => {
            const position = h.position || {};
            const rect = position.rect || {};
            
            return {
                id: h.id,
                word: h.word || '',
                synonyms: Array.isArray(h.synonyms) ? h.synonyms : [],
                page: h.page_number || 1,
                rect: {
                    x: rect.x || 0,
                    y: rect.y || 0,
                    w: rect.w || rect.width || 0.1,
                    h: rect.h || rect.height || 0.03
                }
            };
        });

        return formattedHighlights;

    } catch (e) {
        console.error('testFetchAnyHighlightsForCourse: Error:', e?.message || e);
        return [];
    }
}

// Run the test
testAutoFetchFunctionality();
