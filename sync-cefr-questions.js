require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  console.error('Required variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sample CEFR assessment questions to sync
const cefrQuestions = [
  {
    question_type: 'multiple-choice',
    cefr_level: 'A1',
    skill_type: 'reading',
    question_text: 'What is the correct form of the verb "to be" in this sentence: "She ___ a teacher"?',
    instructions: 'Choose the correct form of the verb "to be".',
    options: JSON.stringify([
      'am',
      'is',
      'are',
      'be'
    ]),
    correct_answer: 'is',
    points: 1,
    difficulty_level: 'easy'
  },
  {
    question_type: 'listening',
    cefr_level: 'B1',
    skill_type: 'listening',
    question_text: 'Listen to the audio and answer: What time does the meeting start?',
    instructions: 'Listen carefully to the audio clip and select the correct time.',
    options: JSON.stringify([
      '9:00 AM',
      '9:30 AM',
      '10:00 AM',
      '10:30 AM'
    ]),
    correct_answer: '9:30 AM',
    points: 2,
    difficulty_level: 'medium'
  },
  {
    question_type: 'multiple-choice',
    cefr_level: 'A2',
    skill_type: 'grammar',
    question_text: 'Which sentence uses the past tense correctly?',
    instructions: 'Choose the grammatically correct sentence.',
    options: JSON.stringify([
      'I go to school yesterday',
      'I went to school yesterday',
      'I going to school yesterday',
      'I goes to school yesterday'
    ]),
    correct_answer: 'I went to school yesterday',
    points: 2,
    difficulty_level: 'easy'
  },
  {
    question_type: 'fill-in-blank',
    cefr_level: 'A1',
    skill_type: 'grammar',
    question_text: 'My name _____ John.',
    instructions: 'Complete the sentence with the correct verb.',
    correct_answer: 'is',
    points: 1,
    difficulty_level: 'easy'
  },
  {
    question_type: 'short-answer',
    cefr_level: 'A2',
    skill_type: 'writing',
    question_text: 'Describe your daily routine in 3-4 sentences.',
    instructions: 'Write about what you do every day.',
    expected_response: 'Sample: I wake up at 7 AM. I have breakfast and go to work. In the evening, I watch TV and read books.',
    points: 5,
    difficulty_level: 'medium'
  },
  {
    question_type: 'essay',
    cefr_level: 'B1',
    skill_type: 'writing',
    question_text: 'Do you think social media has a positive or negative impact on society? Explain your opinion.',
    instructions: 'Write a short essay (150-200 words) expressing your viewpoint.',
    expected_response: 'Students should present a clear opinion with supporting arguments and examples.',
    points: 10,
    difficulty_level: 'medium'
  },
  {
    question_type: 'essay',
    cefr_level: 'B2',
    skill_type: 'writing',
    question_text: 'Analyze the advantages and disadvantages of remote work. How has it changed the modern workplace?',
    instructions: 'Write a balanced analysis (250-300 words).',
    expected_response: 'Should include multiple perspectives, clear structure, and sophisticated vocabulary.',
    points: 15,
    difficulty_level: 'hard'
  },
  {
    question_type: 'short-answer',
    cefr_level: 'B2',
    skill_type: 'reading',
    question_text: 'After reading the passage, explain the author\'s main argument and provide your critical assessment.',
    instructions: 'Demonstrate comprehension and critical thinking.',
    expected_response: 'Should identify main points and provide thoughtful analysis.',
    points: 8,
    difficulty_level: 'hard'
  },
  {
    question_type: 'essay',
    cefr_level: 'C1',
    skill_type: 'writing',
    question_text: 'Evaluate the role of artificial intelligence in education. Consider both the opportunities and challenges it presents.',
    instructions: 'Write a comprehensive analysis (400-500 words).',
    expected_response: 'Should demonstrate sophisticated language use, complex argumentation, and nuanced understanding.',
    points: 20,
    difficulty_level: 'hard'
  },
  {
    question_type: 'essay',
    cefr_level: 'C2',
    skill_type: 'writing',
    question_text: 'Critically examine the statement: "Language shapes thought, and thought shapes reality." Draw upon philosophical, linguistic, and cultural perspectives.',
    instructions: 'Write an advanced academic essay (500-600 words).',
    expected_response: 'Should demonstrate native-like proficiency, complex reasoning, and sophisticated academic discourse.',
    points: 25,
    difficulty_level: 'hard'
  }
];

async function syncCEFRQuestions() {
  try {
    console.log('🔄 Starting CEFR questions sync...');
    
    // Check if table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('cefr_assessment_questions')
      .select('count', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('❌ Error checking table:', tableError.message);
      console.log('💡 Make sure you have run the database migrations first:');
      console.log('   npm run migrate or apply migration 012_add_cefr_assessment_questions.sql');
      return;
    }
    
    console.log(`📊 Current questions in database: ${tableCheck.count || 0}`);
    
    // Clear existing questions (optional - remove this if you want to keep existing data)
    console.log('🗑️  Clearing existing questions...');
    const { error: deleteError } = await supabase
      .from('cefr_assessment_questions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) {
      console.warn('⚠️  Warning: Could not clear existing questions:', deleteError.message);
    }
    
    // Insert new questions
    console.log(`📝 Inserting ${cefrQuestions.length} new questions...`);
    
    const { data, error } = await supabase
      .from('cefr_assessment_questions')
      .insert(cefrQuestions)
      .select();
    
    if (error) {
      console.error('❌ Error inserting questions:', error.message);
      console.error('Details:', error.details);
      return;
    }
    
    console.log(`✅ Successfully synced ${data.length} CEFR assessment questions!`);
    
    // Display summary
    const summary = {};
    data.forEach(q => {
      const key = `${q.cefr_level}-${q.skill_type}`;
      summary[key] = (summary[key] || 0) + 1;
    });
    
    console.log('\n📈 Questions by level and skill:');
    Object.entries(summary).forEach(([key, count]) => {
      console.log(`   ${key}: ${count} questions`);
    });
    
    console.log('\n🎉 Sync completed successfully!');
    console.log('💡 You can now view these questions in your admin dashboard.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the sync
syncCEFRQuestions();