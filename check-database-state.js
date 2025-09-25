// Script to check database state for PDF highlights
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://ecglfwqylqchdyuhmtuv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ2xmd3F5bHFjaGR5dWhtdHV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgxMTI5MCwiZXhwIjoyMDY3Mzg3MjkwfQ.kVkiHxUJG4EbTjxWZwXK6SrfG6wPBgkKJhHeCIQ0Cpg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
    console.log('🔍 Checking database state...\n');
    
    try {
        // Check courses
        console.log('📚 COURSES:');
        const { data: courses, error: coursesError } = await supabase
            .from('courses')
            .select('id, title, level, language, created_at')
            .order('created_at', { ascending: false });
        
        if (coursesError) {
            console.error('❌ Error fetching courses:', coursesError.message);
        } else if (courses && courses.length > 0) {
            courses.forEach((course, index) => {
                console.log(`${index + 1}. ${course.title} (${course.level}) - ${course.language}`);
                console.log(`   ID: ${course.id}`);
                console.log(`   Created: ${new Date(course.created_at).toLocaleString()}\n`);
            });
        } else {
            console.log('No courses found.\n');
        }
        
        // Check books
        console.log('📖 BOOKS:');
        const { data: books, error: booksError } = await supabase
            .from('books')
            .select('id, course_id, title, pdf_url')
        
        if (booksError) {
            console.error('❌ Error fetching books:', booksError.message);
        } else if (books && books.length > 0) {
            books.forEach((book, index) => {
                console.log(`${index + 1}. ${book.title}`);
                console.log(`   ID: ${book.id}`);
                console.log(`   Course ID: ${book.course_id}`);
                console.log(`   PDF URL: ${book.pdf_url}`);
                console.log('');
            });
        } else {
            console.log('No books found.\n');
        }
        
        // Check word highlights
        console.log('💡 WORD HIGHLIGHTS:');
        const { data: highlights, error: highlightsError } = await supabase
            .from('word_highlights')
            .select(`
                id, 
                book_id, 
                word, 
                synonyms, 
                page_number, 
                position,
                books(title, course_id, courses(title))
            `)
        
        if (highlightsError) {
            console.error('❌ Error fetching highlights:', highlightsError.message);
        } else if (highlights && highlights.length > 0) {
            highlights.forEach((highlight, index) => {
                console.log(`${index + 1}. "${highlight.word}"`);
                console.log(`   Synonyms: [${highlight.synonyms ? highlight.synonyms.join(', ') : 'none'}]`);
                console.log(`   Page: ${highlight.page_number}`);
                console.log(`   Book: ${highlight.books?.title || 'Unknown'}`);
                console.log(`   Course: ${highlight.books?.courses?.title || 'Unknown'}`);
                console.log(`   Position: ${JSON.stringify(highlight.position)}`);
                console.log('');
            });
        } else {
            console.log('No word highlights found.\n');
        }
        
        // Check for elementary courses specifically
        console.log('🔍 ELEMENTARY COURSES:');
        const { data: elementaryCourses, error: elemError } = await supabase
            .from('courses')
            .select('id, title, level, language')
            .or('level.eq.beginner,level.eq.elementary,title.ilike.%elementary%')
            .order('created_at', { ascending: false });
        
        if (elemError) {
            console.error('❌ Error fetching elementary courses:', elemError.message);
        } else if (elementaryCourses && elementaryCourses.length > 0) {
            elementaryCourses.forEach((course, index) => {
                console.log(`${index + 1}. ${course.title} (${course.level}) - ${course.language}`);
                console.log(`   ID: ${course.id}\n`);
            });
        } else {
            console.log('No elementary courses found.\n');
        }
        
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
    }
}

checkDatabase();
