// Test script to verify PDF highlights fetching functionality
const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as env.js
const supabaseUrl = 'https://ecglfwqylqchdyuhmtuv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ2xmd3F5bHFjaGR5dWhtdHV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgxMTI5MCwiZXhwIjoyMDY3Mzg3MjkwfQ.kVkiHxUJG4EbTjxWZwXK6SrfG6wPBgkKJhHeCIQ0Cpg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testHighlightsFetching() {
    console.log('🧪 Testing PDF highlights fetching functionality...\n');
    
    try {
        // Find the Elementry course
        console.log('1️⃣ Finding Elementry course...');
        const { data: courses, error: coursesError } = await supabase
            .from('courses')
            .select('id, title')
            .eq('title', 'Elementry')
            .single();
        
        if (coursesError || !courses) {
            console.error('❌ Error finding Elementry course:', coursesError?.message);
            return;
        }
        
        console.log('✅ Found course:', courses.title, '(ID:', courses.id, ')');
        
        // Find books for this course
        console.log('\n2️⃣ Finding books for this course...');
        const { data: books, error: booksError } = await supabase
            .from('books')
            .select('id, title, pdf_url')
            .eq('course_id', courses.id);
        
        if (booksError) {
            console.error('❌ Error finding books:', booksError.message);
            return;
        }
        
        if (!books || books.length === 0) {
            console.log('📭 No books found for this course.');
            return;
        }
        
        console.log('✅ Found', books.length, 'book(s):');
        books.forEach((book, index) => {
            console.log(`   ${index + 1}. ${book.title} (${book.pdf_url})`);
        });
        
        // Test fetching highlights for each book
        for (const book of books) {
            console.log(`\n3️⃣ Testing highlights fetching for book: "${book.title}"`);
            
            const highlights = await fetchPdfHighlightsFromDatabase(courses.id, book.pdf_url);
            
            if (highlights.length === 0) {
                console.log('📭 No highlights found for this book.');
            } else {
                console.log(`✅ Found ${highlights.length} highlight(s):`);
                highlights.forEach((highlight, index) => {
                    console.log(`   ${index + 1}. "${highlight.word}"`);
                    console.log(`      Synonyms: [${highlight.synonyms.join(', ')}]`);
                    console.log(`      Page: ${highlight.page}`);
                    console.log(`      Position: x=${highlight.rect.x}, y=${highlight.rect.y}, w=${highlight.rect.w}, h=${highlight.rect.h}`);
                    console.log('');
                });
            }
        }
        
        console.log('🎉 PDF highlights fetching test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Implement the fetchPdfHighlightsFromDatabase function (copied from admin-dashboard.html)
async function fetchPdfHighlightsFromDatabase(courseId, pdfUrl) {
    try {
        console.log('   📡 Fetching highlights for course:', courseId, 'PDF:', pdfUrl);

        // First, find the book for this course and PDF URL
        const { data: books, error: booksError } = await supabase
            .from('books')
            .select('id')
            .eq('course_id', courseId)
            .eq('pdf_url', pdfUrl)
            .limit(1);

        if (booksError) {
            console.error('   ❌ Error fetching books:', booksError.message);
            return [];
        }

        if (!books || books.length === 0) {
            console.log('   📭 No book found for this PDF');
            return [];
        }

        const bookId = books[0].id;
        console.log('   ✅ Found book ID:', bookId);

        // Fetch highlights for this book
        const { data: highlights, error: highlightsError } = await supabase
            .from('word_highlights')
            .select('id, word, synonyms, page_number, position')
            .eq('book_id', bookId)
            .order('page_number', { ascending: true });

        if (highlightsError) {
            console.error('   ❌ Error fetching highlights:', highlightsError.message);
            return [];
        }

        if (!highlights || highlights.length === 0) {
            console.log('   📭 No highlights found for this book');
            return [];
        }

        console.log('   ✅ Found', highlights.length, 'highlights in database');

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
        console.error('   ❌ fetchPdfHighlightsFromDatabase error:', e?.message || e);
        return [];
    }
}

// Run the test
testHighlightsFetching();

