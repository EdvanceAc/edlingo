require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Please check your .env file.');
  console.error('Required variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Enhanced CEFR assessment questions with more variety
const cefrQuestions = [
  // A1 Level Questions
  {
    question_type: 'multiple-choice',
    cefr_level: 'A1',
    skill_type: 'reading',
    question_text: 'What is the correct form of the verb "to be" in this sentence: "She ___ a teacher"?',
    instructions: 'Choose the correct form of the verb "to be".',
    options: JSON.stringify(['am', 'is', 'are', 'be']),
    correct_answer: 'is',
    points: 1,
    difficulty_level: 'easy'
  },
  {
    question_type: 'true-false',
    cefr_level: 'A1',
    skill_type: 'grammar',
    question_text: 'The sentence "I am happy" is grammatically correct.',
    instructions: 'Determine if the sentence is correct.',
    correct_answer: 'true',
    points: 1,
    difficulty_level: 'easy'
  },
  {
    question_type: 'fill-in-blank',
    cefr_level: 'A1',
    skill_type: 'grammar',
    question_text: 'My name _____ John.',
    instructions: 'Complete the sentence with the correct verb.',
    correct_answer: 'is',
    points: 2,
    difficulty_level: 'easy'
  },
  {
    question_type: 'multiple-choice',
    cefr_level: 'A1',
    skill_type: 'vocabulary',
    question_text: 'What do you use to write?',
    instructions: 'Choose the correct answer.',
    options: JSON.stringify(['pen', 'cup', 'shoe', 'hat']),
    correct_answer: 'pen',
    points: 1,
    difficulty_level: 'easy'
  },
  
  // A2 Level Questions
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
    points: 3,
    difficulty_level: 'medium'
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
    question_type: 'multiple-choice',
    cefr_level: 'A2',
    skill_type: 'reading',
    question_text: 'Read the text: "Maria lives in Madrid. She works as a teacher. She likes her job very much." What is Maria\'s profession?',
    instructions: 'Choose the correct answer based on the text.',
    options: JSON.stringify(['doctor', 'teacher', 'nurse', 'student']),
    correct_answer: 'teacher',
    points: 2,
    difficulty_level: 'easy'
  },
  
  // B1 Level Questions
  {
    question_type: 'listening',
    cefr_level: 'B1',
    skill_type: 'listening',
    question_text: 'Listen to the audio and answer: What time does the meeting start?',
    instructions: 'Listen carefully to the audio clip and select the correct time.',
    options: JSON.stringify(['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM']),
    correct_answer: '9:30 AM',
    points: 4,
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
    question_type: 'multiple-choice',
    cefr_level: 'B1',
    skill_type: 'grammar',
    question_text: 'If I _____ more time, I would learn a new language.',
    instructions: 'Choose the correct conditional form.',
    options: JSON.stringify(['have', 'had', 'will have', 'would have']),
    correct_answer: 'had',
    points: 3,
    difficulty_level: 'medium'
  },
  
  // B2 Level Questions
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
    question_type: 'multiple-choice',
    cefr_level: 'B2',
    skill_type: 'vocabulary',
    question_text: 'The company\'s decision to expand internationally was quite _____.',
    instructions: 'Choose the most appropriate word.',
    options: JSON.stringify(['ambitious', 'ambiguous', 'ambivalent', 'ambulatory']),
    correct_answer: 'ambitious',
    points: 4,
    difficulty_level: 'hard'
  },
  
  // C1 Level Questions
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
    question_type: 'short-answer',
    cefr_level: 'C1',
    skill_type: 'speaking',
    question_text: 'Discuss the implications of climate change on global economic policies. How should governments balance environmental concerns with economic growth?',
    instructions: 'Provide a nuanced response demonstrating advanced language skills.',
    expected_response: 'Should show sophisticated reasoning, complex sentence structures, and advanced vocabulary.',
    points: 12,
    difficulty_level: 'hard'
  },
  
  // C2 Level Questions
  {
    question_type: 'essay',
    cefr_level: 'C2',
    skill_type: 'writing',
    question_text: 'Critically examine the statement: "Language shapes thought, and thought shapes reality." Draw upon philosophical, linguistic, and cultural perspectives.',
    instructions: 'Write an advanced academic essay (500-600 words).',
    expected_response: 'Should demonstrate native-like proficiency, complex reasoning, and sophisticated academic discourse.',
    points: 25,
    difficulty_level: 'hard'
  },
  
  // Conversation Assessment Questions (using 'speaking' type for database compatibility)
  {
    question_type: 'speaking',
    cefr_level: 'A1',
    skill_type: 'speaking',
    question_text: 'Conversation Assessment: Let\'s start with a simple conversation. Please introduce yourself and tell me about your hobbies or interests. Speak naturally for about 2-3 minutes.',
    instructions: 'Expected time: 3 minutes. Speak naturally and clearly. This is a conversation-style assessment.',
    points: 10,
    difficulty_level: 'easy'
  },
  {
    question_type: 'speaking',
    cefr_level: 'A2',
    skill_type: 'speaking',
    question_text: 'Conversation Assessment: Tell me about your daily routine and what you like to do on weekends. Describe your favorite activities and explain why you enjoy them.',
    instructions: 'Expected time: 4 minutes. Use past and present tenses naturally. This is a conversation-style assessment.',
    points: 12,
    difficulty_level: 'easy'
  },
  {
    question_type: 'speaking',
    cefr_level: 'B1',
    skill_type: 'speaking',
    question_text: 'Conversation Assessment: Discuss a memorable travel experience or a place you would like to visit. Explain what makes it special and how it has influenced or might influence you.',
    instructions: 'Expected time: 5 minutes. Express opinions and give detailed descriptions. This is a conversation-style assessment.',
    points: 15,
    difficulty_level: 'medium'
  },
  {
    question_type: 'speaking',
    cefr_level: 'B2',
    skill_type: 'speaking',
    question_text: 'Conversation Assessment: What are your thoughts on the impact of technology on modern communication? Discuss both advantages and disadvantages, providing specific examples.',
    instructions: 'Expected time: 6 minutes. Present balanced arguments with supporting evidence. This is a conversation-style assessment.',
    points: 18,
    difficulty_level: 'medium'
  },
  {
    question_type: 'speaking',
    cefr_level: 'C1',
    skill_type: 'speaking',
    question_text: 'Conversation Assessment: Analyze the role of education in addressing social inequality. How can educational systems be reformed to create more equitable opportunities?',
    instructions: 'Expected time: 7 minutes. Demonstrate sophisticated reasoning and complex language structures. This is a conversation-style assessment.',
    points: 22,
    difficulty_level: 'hard'
  },
  {
    question_type: 'speaking',
    cefr_level: 'C2',
    skill_type: 'speaking',
    question_text: 'Conversation Assessment: Evaluate the philosophical implications of artificial intelligence on human consciousness and identity. How might AI development challenge our understanding of what it means to be human?',
    instructions: 'Expected time: 8 minutes. Demonstrate native-like fluency with nuanced argumentation. This is a conversation-style assessment.',
    points: 25,
    difficulty_level: 'hard'
  }
];

// Function to sync questions to database
async function syncQuestionsToDatabase() {
  try {
    console.log('🔄 Starting CEFR questions sync to database...');
    
    // Check if table exists
    const { count: tableCount, error: tableError } = await supabase
      .from('cefr_assessment_questions')
      .select('*', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('❌ Error checking table:', tableError.message);
      console.log('💡 Make sure you have run the database migrations first:');
      console.log('   Apply migration: database/migrations/012_add_cefr_assessment_questions.sql');
      return false;
    }
    
    console.log(`📊 Current questions in database: ${tableCount || 0}`);
    
    // Clear existing questions (optional)
    console.log('🗑️  Clearing existing questions...');
    const { error: deleteError } = await supabase
      .from('cefr_assessment_questions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.warn('⚠️  Warning: Could not clear existing questions:', deleteError.message);
    }
    
    // Insert new questions
    console.log(`📝 Inserting ${cefrQuestions.length} new questions...`);
    
    // Handle potential missing columns gracefully
     const questionsToInsert = cefrQuestions.map(q => {
       const baseQuestion = {
         question_type: q.question_type,
         cefr_level: q.cefr_level,
         skill_type: q.skill_type,
         question_text: q.question_text,
         instructions: q.instructions,
         options: q.options,
         correct_answer: q.correct_answer,
         points: q.points,
         difficulty_level: q.difficulty_level
       };
       
       // Add optional fields if they exist in the question
       if (q.expected_response) baseQuestion.expected_response = q.expected_response;
       
       return baseQuestion;
     });

    const { data, error } = await supabase
      .from('cefr_assessment_questions')
      .insert(questionsToInsert)
      .select();
    
    if (error) {
      console.error('❌ Error inserting questions:', error.message);
      console.error('Details:', error.details);
      return false;
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
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

// Function to fetch questions from database
async function fetchQuestionsFromDatabase() {
  try {
    console.log('📥 Fetching questions from database...');
    
    const { data, error } = await supabase
      .from('cefr_assessment_questions')
      .select('*')
      .eq('is_active', true)
      .order('cefr_level')
      .order('skill_type')
      .order('created_at');
    
    if (error) {
      console.error('❌ Error fetching questions:', error.message);
      return null;
    }
    
    console.log(`📊 Found ${data.length} questions in database`);
    return data;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return null;
  }
}

// Function to generate HTML for admin dashboard
async function generateAdminDashboardHTML() {
  const questions = await fetchQuestionsFromDatabase();
  
  if (!questions) {
    console.error('❌ Could not fetch questions from database');
    return;
  }
  
  let html = `<!-- CEFR Assessment Questions - Generated from Database -->\n`;
  html += `<div id="assessment-questions-content" class="assessment-subtab-content p-6">\n`;
  html += `    <div class="flex justify-between items-center mb-6">\n`;
  html += `        <h3 class="text-lg font-semibold text-gray-900">CEFR Assessment Questions (${questions.length} total)</h3>\n`;
  html += `        <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center" onclick="showCreateAssessmentQuestionModal()">\n`;
  html += `            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 mr-2"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>\n`;
  html += `            Create Question\n`;
  html += `        </button>\n`;
  html += `    </div>\n\n`;
  
  // Add filters
  html += `    <!-- CEFR Level Filter -->\n`;
  html += `    <div class="flex flex-wrap gap-4 mb-6">\n`;
  html += `        <select id="cefr-level-filter" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" onchange="filterAssessmentQuestions()">\n`;
  html += `            <option value="">All CEFR Levels</option>\n`;
  html += `            <option value="A1">A1 - Beginner</option>\n`;
  html += `            <option value="A2">A2 - Elementary</option>\n`;
  html += `            <option value="B1">B1 - Intermediate</option>\n`;
  html += `            <option value="B2">B2 - Upper Intermediate</option>\n`;
  html += `            <option value="C1">C1 - Advanced</option>\n`;
  html += `            <option value="C2">C2 - Proficient</option>\n`;
  html += `        </select>\n`;
  html += `        <select id="skill-type-filter" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" onchange="filterAssessmentQuestions()">\n`;
  html += `            <option value="">All Skills</option>\n`;
  html += `            <option value="reading">Reading</option>\n`;
  html += `            <option value="writing">Writing</option>\n`;
  html += `            <option value="listening">Listening</option>\n`;
  html += `            <option value="speaking">Speaking</option>\n`;
  html += `            <option value="grammar">Grammar</option>\n`;
  html += `            <option value="vocabulary">Vocabulary</option>\n`;
  html += `        </select>\n`;
  html += `        <select id="question-type-filter" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" onchange="filterAssessmentQuestions()">\n`;
  html += `            <option value="">All Question Types</option>\n`;
  html += `            <option value="multiple-choice">Multiple Choice</option>\n`;
  html += `            <option value="true-false">True/False</option>\n`;
  html += `            <option value="fill-in-blank">Fill in the Blank</option>\n`;
  html += `            <option value="essay">Essay</option>\n`;
  html += `            <option value="listening">Listening Comprehension</option>\n`;
  html += `            <option value="speaking">Speaking Prompt</option>\n`;
  html += `            <option value="short-answer">Short Answer</option>\n`;
  html += `        </select>\n`;
  html += `    </div>\n\n`;
  
  // Add questions list
  html += `    <!-- Questions List -->\n`;
  html += `    <div id="assessment-questions-list" class="space-y-4">\n`;
  
  questions.forEach((question, index) => {
    const levelColor = {
      'A1': 'bg-green-100 text-green-800',
      'A2': 'bg-blue-100 text-blue-800', 
      'B1': 'bg-yellow-100 text-yellow-800',
      'B2': 'bg-orange-100 text-orange-800',
      'C1': 'bg-red-100 text-red-800',
      'C2': 'bg-purple-100 text-purple-800'
    }[question.cefr_level] || 'bg-gray-100 text-gray-800';
    
    const skillColor = {
      'reading': 'bg-green-100 text-green-800',
      'writing': 'bg-blue-100 text-blue-800',
      'listening': 'bg-purple-100 text-purple-800',
      'speaking': 'bg-orange-100 text-orange-800',
      'grammar': 'bg-yellow-100 text-yellow-800',
      'vocabulary': 'bg-pink-100 text-pink-800'
    }[question.skill_type] || 'bg-gray-100 text-gray-800';
    
    const typeColor = 'bg-indigo-100 text-indigo-800';
    
    html += `        <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow" data-cefr="${question.cefr_level}" data-skill="${question.skill_type}" data-type="${question.question_type}">\n`;
    html += `            <div class="flex justify-between items-start mb-4">\n`;
    html += `                <div class="flex-1">\n`;
    html += `                    <div class="flex items-center gap-2 mb-2">\n`;
    html += `                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${levelColor}">${question.cefr_level}</span>\n`;
    html += `                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${skillColor}">${question.skill_type}</span>\n`;
    html += `                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColor}">${question.question_type.replace('-', ' ')}</span>\n`;
    html += `                        <span class="text-xs text-gray-500">${question.points} pts</span>\n`;
    html += `                        <span class="text-xs text-gray-500">(${question.difficulty_level})</span>\n`;
    html += `                    </div>\n`;
    html += `                    <h4 class="text-md font-semibold text-gray-900 mb-2">${question.question_text}</h4>\n`;
    
    if (question.options) {
      const options = JSON.parse(question.options);
      html += `                    <div class="text-sm text-gray-600 mb-2">\n`;
      html += `                        <strong>Options:</strong> ${options.join(', ')}\n`;
      html += `                    </div>\n`;
    }
    
    if (question.correct_answer) {
      html += `                    <div class="text-sm text-green-600 mb-2">\n`;
      html += `                        <strong>Answer:</strong> ${question.correct_answer}\n`;
      html += `                    </div>\n`;
    }
    
    const createdDate = new Date(question.created_at).toLocaleDateString();
    html += `                    <p class="text-sm text-gray-500">Created: ${createdDate}</p>\n`;
    html += `                </div>\n`;
    html += `                <div class="flex items-center space-x-2 ml-4">\n`;
    html += `                    <button class="text-blue-600 hover:text-blue-800 p-1" onclick="editAssessmentQuestion('${question.id}')" title="Edit">\n`;
    html += `                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path></svg>\n`;
    html += `                    </button>\n`;
    html += `                    <button class="text-red-600 hover:text-red-800 p-1" onclick="deleteAssessmentQuestion('${question.id}')" title="Delete">\n`;
    html += `                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>\n`;
    html += `                    </button>\n`;
    html += `                </div>\n`;
    html += `            </div>\n`;
    html += `        </div>\n\n`;
  });
  
  html += `    </div>\n`;
  html += `</div>\n`;
  
  // Save to file
  const outputPath = path.join(__dirname, 'generated-cefr-questions.html');
  fs.writeFileSync(outputPath, html);
  
  console.log(`✅ Generated HTML saved to: ${outputPath}`);
  console.log('💡 You can copy this HTML into your admin dashboard.');
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'sync';
  
  switch (command) {
    case 'sync':
      const success = await syncQuestionsToDatabase();
      if (success) {
        console.log('\n🎉 Sync completed successfully!');
        console.log('💡 You can now view these questions in your admin dashboard.');
        console.log('💡 Run "node manage-cefr-questions.js generate" to create HTML for your dashboard.');
      }
      break;
      
    case 'fetch':
      const questions = await fetchQuestionsFromDatabase();
      if (questions) {
        console.log('\n📋 Questions Summary:');
        const summary = {};
        questions.forEach(q => {
          const key = `${q.cefr_level}-${q.skill_type}`;
          summary[key] = (summary[key] || 0) + 1;
        });
        Object.entries(summary).forEach(([key, count]) => {
          console.log(`   ${key}: ${count} questions`);
        });
      }
      break;
      
    case 'generate':
      await generateAdminDashboardHTML();
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node manage-cefr-questions.js sync     - Sync questions to database');
      console.log('  node manage-cefr-questions.js fetch    - Fetch and display questions from database');
      console.log('  node manage-cefr-questions.js generate - Generate HTML for admin dashboard');
  }
}

// Run the script
main();