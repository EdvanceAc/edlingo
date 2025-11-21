require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedCourses() {
  const sampleCourses = [
    {
      title: 'Beginner English',
      description: 'Introduction to basic English.',
      terms: [{ term: 'Hello', definition: 'Greeting' }],
      cefr_level: 'A1',
      locked: false
    },
    // Add more sample courses
  ];

  const { data: coursesData, error: coursesError } = await supabase.from('courses').insert(sampleCourses).select();
  if (coursesError) throw coursesError;

  const sampleLessons = [
    {
      course_id: coursesData[0].id,
      session_type: 'text',
      content: { text: 'Basic greetings.' },
      ai_prompts: { prompt: 'Explain greetings.' },
      required_progress: 0
    },
    // Add more sample lessons
  ];

  const { error: lessonsError } = await supabase.from('lessons').insert(sampleLessons);
  if (lessonsError) throw lessonsError;

  console.log('Seeding completed.');
}

seedCourses().catch(console.error);