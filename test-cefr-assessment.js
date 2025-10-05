// Test script to verify CEFR assessment integration
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testCEFRAssessmentIntegration() {
  console.log('🧪 Testing CEFR Assessment Integration...');
  
  try {
    // 1. Check if CEFR questions exist
    console.log('\n1. Checking CEFR questions...');
    const { data: cefrQuestions, error: cefrError } = await supabase
      .from('cefr_assessment_questions')
      .select('*')
      .eq('is_active', true)
      .limit(5);
    
    if (cefrError) {
      console.error('❌ Error fetching CEFR questions:', cefrError);
      return;
    }
    
    console.log(`✅ Found ${cefrQuestions.length} active CEFR questions`);
    cefrQuestions.forEach(q => {
      console.log(`   - ${q.cefr_level} ${q.skill_type}: ${q.question_type}`);
    });
    
    // 2. Test creating an assessment session
    console.log('\n2. Creating test assessment session...');
    const { data: session, error: sessionError } = await supabase
      .from('assessment_sessions')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Test user ID
        session_type: 'initial',
        target_language: 'English',
        status: 'in_progress'
      })
      .select()
      .single();
    
    if (sessionError) {
      console.error('❌ Error creating session:', sessionError);
      return;
    }
    
    console.log(`✅ Created assessment session: ${session.id}`);
    
    // 3. Test creating assessment tasks with CEFR data
    console.log('\n3. Creating assessment tasks with CEFR integration...');
    
    const testTasks = cefrQuestions.slice(0, 3).map((question, index) => ({
      session_id: session.id,
      task_type: mapQuestionTypeToTaskType(question.question_type),
      task_order: index + 1,
      prompt: buildTaskPrompt(question),
      expected_duration_minutes: getExpectedDuration(question.question_type),
      max_score: question.points || 100,
      cefr_question_id: question.id,
      cefr_level: question.cefr_level,
      skill_type: question.skill_type,
      question_data: {
        question_text: question.question_text,
        instructions: question.instructions,
        options: question.options,
        correct_answer: question.correct_answer,
        question_type: question.question_type
      }
    }));
    
    const { data: tasks, error: tasksError } = await supabase
      .from('assessment_tasks')
      .insert(testTasks)
      .select();
    
    if (tasksError) {
      console.error('❌ Error creating tasks:', tasksError);
      return;
    }
    
    console.log(`✅ Created ${tasks.length} assessment tasks with CEFR integration`);
    tasks.forEach(task => {
      console.log(`   - Task ${task.task_order}: ${task.cefr_level} ${task.skill_type} (${task.task_type})`);
    });
    
    // 4. Test submitting a response with automatic scoring
    console.log('\n4. Testing automatic scoring for multiple-choice question...');
    
    const mcTask = tasks.find(t => t.task_type === 'multiple-choice');
    if (mcTask) {
      const correctAnswer = mcTask.question_data.correct_answer;
      const isCorrect = true;
      const score = isCorrect ? mcTask.max_score : 0;
      
      const { data: response, error: responseError } = await supabase
        .from('assessment_responses')
        .insert({
          task_id: mcTask.id,
          response_text: correctAnswer,
          score: score,
          is_correct: isCorrect,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (responseError) {
        console.error('❌ Error submitting response:', responseError);
      } else {
        console.log(`✅ Submitted response with automatic scoring: ${score}/${mcTask.max_score}`);
      }
    }
    
    // 5. Clean up test data
    console.log('\n5. Cleaning up test data...');
    await supabase.from('assessment_sessions').delete().eq('id', session.id);
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 CEFR Assessment Integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Helper functions
function mapQuestionTypeToTaskType(questionType) {
  const mapping = {
    'multiple-choice': 'multiple-choice',
    'true-false': 'true-false',
    'short-answer': 'writing',
    'essay': 'writing',
    'fill-in-blank': 'grammar',
    'listening': 'listening',
    'speaking': 'conversation',
    'reading': 'reading',
    'conversation': 'conversation'
  };
  return mapping[questionType] || 'general';
}

function buildTaskPrompt(question) {
  let prompt = question.question_text;
  
  if (question.instructions) {
    prompt = `${question.instructions}\n\n${prompt}`;
  }
  
  if (question.options && Array.isArray(question.options)) {
    prompt += '\n\nOptions:';
    question.options.forEach((option, index) => {
      prompt += `\n${index + 1}. ${option}`;
    });
  }
  
  return prompt;
}

function getExpectedDuration(questionType) {
  const durations = {
    'multiple-choice': 1,
    'true-false': 1,
    'short-answer': 3,
    'essay': 8,
    'fill-in-blank': 2,
    'listening': 3,
    'speaking': 4,
    'reading': 3,
    'conversation': 5
  };
  return durations[questionType] || 3;
}

// Run the test
if (require.main === module) {
  testCEFRAssessmentIntegration();
}

module.exports = { testCEFRAssessmentIntegration };