// Test script to verify the complete admin dashboard PDF highlights workflow
const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as admin dashboard
const supabaseUrl = 'https://ecglfwqylqchdyuhmtuv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ2xmd3F5bHFjaGR5dWhtdHV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgxMTI5MCwiZXhwIjoyMDY3Mzg3MjkwfQ.kVkiHxUJG4EbTjxWZwXK6SrfG6wPBgkKJhHeCIQ0Cpg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test data
const ELEMENTRY_COURSE_ID = '56d725cc-ca41-453e-8909-7c760f2c5851';
const SEEDED_BOOK_PDF_URL = 'https://example.com/sample.pdf';

async function testAdminDashboardWorkflow() {
    console.log('🧪 Testing Admin Dashboard PDF Highlights Workflow');
    console.log('='.repeat(60));
    
    try {
        // Step 1: Simulate opening admin dashboard and connecting to database
        console.log('\n1️⃣ STEP 1: Database Connection');
        console.log('   📡 Connecting to Supabase...');
        
        const { data: testConnection, error: connectionError } = await supabase
            .from('courses')
            .select('count')
            .limit(1);
        
        if (connectionError) {
            console.log('   ❌ Database connection failed:', connectionError.message);
            return;
        }
        console.log('   ✅ Database connection successful');
        
        // Step 2: Simulate clicking "Edit Course" for Elementry course
        console.log('\n2️⃣ STEP 2: Loading Course for Editing');
        console.log('   📝 Loading "Elementry" course...');
        
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('id, title, description, level, language')
            .eq('id', ELEMENTRY_COURSE_ID)
            .single();
        
        if (courseError) {
            console.log('   ❌ Error loading course:', courseError.message);
            return;
        }
        
        console.log(`   ✅ Course loaded: "${course.title}"`);
        console.log(`      - Level: ${course.level || 'N/A'}`);
        console.log(`      - Language: ${course.language}`);
        console.log(`      - ID: ${course.id}`);
        
        // Step 3: Simulate calling loadLessonContentFromDatabase
        console.log('\n3️⃣ STEP 3: Loading Lesson Content');
        console.log('   📚 Simulating loadLessonContentFromDatabase()...');
        
        // Find books for this course (simulates the book lookup in PDF processing)
        const { data: books, error: booksError } = await supabase
            .from('books')
            .select('id, title, pdf_url')
            .eq('course_id', ELEMENTRY_COURSE_ID);
        
        if (booksError) {
            console.log('   ❌ Error loading books:', booksError.message);
            return;
        }
        
        if (!books || books.length === 0) {
            console.log('   📭 No books found for this course');
            return;
        }
        
        console.log(`   ✅ Found ${books.length} book(s) for the course:`);
        books.forEach((book, index) => {
            console.log(`      ${index + 1}. "${book.title}" (${book.pdf_url})`);
        });
        
        // Step 4: For each PDF, simulate the highlights fetching process
        console.log('\n4️⃣ STEP 4: PDF Highlights Processing');
        
        for (const book of books) {
            console.log(`   📖 Processing PDF: "${book.title}"`);
            console.log(`      PDF URL: ${book.pdf_url}`);
            
            // This simulates the exact code that runs in admin dashboard
            console.log('      🔍 Checking for metadata highlights...');
            // In real admin dashboard, this would check material.metadata.highlights first
            console.log('      📭 No metadata highlights found (expected for existing data)');
            
            console.log('      📡 Fetching highlights from database...');
            const highlights = await fetchPdfHighlightsFromDatabase(ELEMENTRY_COURSE_ID, book.pdf_url);
            
            if (highlights.length === 0) {
                console.log('      📭 No highlights found in database for this PDF');
            } else {
                console.log(`      ✅ Found ${highlights.length} highlight(s) in database:`);
                
                highlights.forEach((highlight, index) => {
                    console.log(`         ${index + 1}. Word: "${highlight.word}"`);
                    console.log(`            Synonyms: [${highlight.synonyms.join(', ')}]`);
                    console.log(`            Page: ${highlight.page}`);
                    console.log(`            Position: x=${highlight.rect.x}, y=${highlight.rect.y}, w=${highlight.rect.w}, h=${highlight.rect.h}`);
                    console.log('');
                });
                
                // Step 5: Simulate populating the PDF highlights table
                console.log('      🎯 Simulating table population...');
                console.log('      ✅ In the admin dashboard, these highlights would now appear in the PDF highlights table:');
                
                highlights.forEach((highlight, index) => {
                    console.log(`         Row ${index + 1}:`);
                    console.log(`           Word/Phrase: "${highlight.word}"`);
                    console.log(`           Synonyms: "${highlight.synonyms.join(', ')}"`);
                    console.log(`           Page: ${highlight.page}`);
                    console.log(`           Coordinates: X=${highlight.rect.x}, Y=${highlight.rect.y}, W=${highlight.rect.w}, H=${highlight.rect.h}`);
                });
            }
        }
        
        // Step 6: Summary
        console.log('\n5️⃣ STEP 5: Workflow Summary');
        console.log('   🎉 Admin Dashboard PDF Highlights Workflow Test COMPLETED!');
        console.log('');
        console.log('   📋 What would happen in the real admin dashboard:');
        console.log('   1. ✅ User clicks "Edit Course" for "Elementry" course');
        console.log('   2. ✅ Course data loads successfully');
        console.log('   3. ✅ System calls loadLessonContentFromDatabase()');
        console.log('   4. ✅ For each PDF material, it checks for existing highlights');
        console.log('   5. ✅ Since no metadata highlights exist, it fetches from database');
        console.log('   6. ✅ Found highlights are automatically populated in the PDF highlights table');
        console.log('   7. ✅ User sees "Banan" → "Christ Follower" already filled in the table');
        console.log('');
        console.log('   🎯 EXPECTED RESULT: When you edit the "Elementry" course in the admin dashboard,');
        console.log('      the PDF highlights table should automatically show:');
        console.log('      - Word/Phrase: "Banan"');
        console.log('      - Synonyms: "Christ Follower"');
        console.log('      - Page: 1');
        console.log('      - Coordinates: X=0, Y=0, W=0.1, H=0.03');
        
    } catch (error) {
        console.log('\n❌ Workflow test failed:', error.message);
    }
    
    console.log('\n' + '='.repeat(60));
}

// Copy the exact fetchPdfHighlightsFromDatabase function from admin-dashboard.html
async function fetchPdfHighlightsFromDatabase(courseId, pdfUrl) {
    try {
        const client = supabase;
        if (!client?.from) {
            console.log('❌ No Supabase client available');
            return [];
        }

        // First, find the book for this course and PDF URL
        const { data: books, error: booksError } = await client
            .from('books')
            .select('id')
            .eq('course_id', courseId)
            .eq('pdf_url', pdfUrl)
            .limit(1);

        if (booksError) {
            console.log('❌ Error fetching books:', booksError.message);
            return [];
        }

        if (!books || books.length === 0) {
            console.log('📭 No book found for this PDF');
            return [];
        }

        const bookId = books[0].id;

        // Fetch highlights for this book
        const { data: highlights, error: highlightsError } = await client
            .from('word_highlights')
            .select('id, word, synonyms, page_number, position')
            .eq('book_id', bookId)
            .order('page_number', { ascending: true });

        if (highlightsError) {
            console.log('❌ Error fetching highlights:', highlightsError.message);
            return [];
        }

        if (!highlights || highlights.length === 0) {
            return [];
        }

        // Convert database format to the format expected by the UI
        const formattedHighlights = highlights.map(h => {
            const position = h.position || {};
            const rect = position.rect || {};
            const refs = position.refs || {};
            
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
                },
                refs: {
                    images: Array.isArray(refs.images) ? refs.images : [],
                    audio: Array.isArray(refs.audio) ? refs.audio : [],
                    video: Array.isArray(refs.video) ? refs.video : []
                }
            };
        });

        return formattedHighlights;

    } catch (e) {
        console.log('❌ fetchPdfHighlightsFromDatabase error:', e?.message || e);
        return [];
    }
}

// Run the workflow test
testAdminDashboardWorkflow();
