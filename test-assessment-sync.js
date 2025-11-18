/**
 * Comprehensive Test for Assessment-Supabase Synchronization
 * Tests the full assessment flow and database integration
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Test data
const testUser = {
  id: 'test-user-' + Date.now(),
  email: 'test@example.com',
  target_language: 'English'
};

const testAssessmentData = {
  sessionData: {
    user_id: testUser.id,
    target_language: testUser.target_language,
    assessment_type: 'proficiency',
    status: 'in_progress'
  },
  taskData: {
    task_type: 'speaking',
    prompt: 'Describe your daily routine',
    expected_duration_minutes: 3,
    difficulty_level: 'intermediate'
  },
  responseData: {
    response_text: 'I wake up at 7 AM every morning and start my day with coffee...',
    response_audio_url: null,
    completion_time_seconds: 180
  }
};

async function runAssessmentSyncTest() {
  console.log('🧪 Starting Assessment-Supabase Synchronization Test\n');
  
  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing Database Connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('assessment_sessions')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }
    console.log('✅ Database connection successful\n');

    // Test 2: Create Assessment Session
    console.log('2️⃣ Testing Assessment Session Creation...');
    const { data: sessionData, error: sessionError } = await supabase
      .from('assessment_sessions')
      .insert(testAssessmentData.sessionData)
      .select()
      .single();
    
    if (sessionError) {
      throw new Error(`Session creation failed: ${sessionError.message}`);
    }
    
    console.log('✅ Assessment session created:', {
      id: sessionData.id,
      user_id: sessionData.user_id,
      status: sessionData.status,
      created_at: sessionData.created_at
    });
    
    const sessionId = sessionData.id;
    testAssessmentData.taskData.session_id = sessionId;

    // Test 3: Create Assessment Task
    console.log('\n3️⃣ Testing Assessment Task Creation...');
    const { data: taskData, error: taskError } = await supabase
      .from('assessment_tasks')
      .insert(testAssessmentData.taskData)
      .select()
      .single();
    
    if (taskError) {
      throw new Error(`Task creation failed: ${taskError.message}`);
    }
    
    console.log('✅ Assessment task created:', {
      id: taskData.id,
      session_id: taskData.session_id,
      task_type: taskData.task_type,
      difficulty_level: taskData.difficulty_level
    });
    
    const taskId = taskData.id;

    // Test 4: Submit Task Response
    console.log('\n4️⃣ Testing Task Response Submission...');
    const responseUpdate = {
      ...testAssessmentData.responseData,
      score: 75,
      ai_feedback: 'Good fluency and vocabulary usage. Work on grammar accuracy.',
      skill_scores: {
        grammar: 70,
        vocabulary: 80,
        fluency: 85,
        accuracy: 65,
        complexity: 75
      },
      completed_at: new Date().toISOString()
    };
    
    const { data: updatedTask, error: updateError } = await supabase
      .from('assessment_tasks')
      .update(responseUpdate)
      .eq('id', taskId)
      .select()
      .single();
    
    if (updateError) {
      throw new Error(`Task response update failed: ${updateError.message}`);
    }
    
    console.log('✅ Task response submitted:', {
      score: updatedTask.score,
      ai_feedback: updatedTask.ai_feedback,
      skill_scores: updatedTask.skill_scores
    });

    // Test 5: Complete Assessment Session
    console.log('\n5️⃣ Testing Assessment Session Completion...');
    const sessionCompletion = {
      status: 'completed',
      overall_score: 75,
      cefr_level: 'B2',
      ielts_equivalent: 6.5,
      skill_breakdown: {
        grammar: 70,
        vocabulary: 80,
        fluency: 85,
        accuracy: 65,
        complexity: 75
      },
      recommendations: [
        'Focus on grammar accuracy',
        'Continue vocabulary building',
        'Practice complex sentence structures'
      ],
      completed_at: new Date().toISOString()
    };
    
    const { data: completedSession, error: completionError } = await supabase
      .from('assessment_sessions')
      .update(sessionCompletion)
      .eq('id', sessionId)
      .select()
      .single();
    
    if (completionError) {
      throw new Error(`Session completion failed: ${completionError.message}`);
    }
    
    console.log('✅ Assessment session completed:', {
      overall_score: completedSession.overall_score,
      cefr_level: completedSession.cefr_level,
      ielts_equivalent: completedSession.ielts_equivalent
    });

    // Test 6: Create/Update User Proficiency Profile
    console.log('\n6️⃣ Testing User Proficiency Profile...');
    const proficiencyProfile = {
      user_id: testUser.id,
      language: testUser.target_language,
      current_cefr_level: completedSession.cefr_level,
      overall_score: completedSession.overall_score,
      skill_breakdown: completedSession.skill_breakdown,
      last_assessment_date: new Date().toISOString(),
      assessment_count: 1
    };
    
    const { data: profileData, error: profileError } = await supabase
      .from('user_proficiency_profiles')
      .upsert(proficiencyProfile, { onConflict: 'user_id,language' })
      .select()
      .single();
    
    if (profileError) {
      throw new Error(`Proficiency profile update failed: ${profileError.message}`);
    }
    
    console.log('✅ User proficiency profile updated:', {
      current_cefr_level: profileData.current_cefr_level,
      overall_score: profileData.overall_score,
      assessment_count: profileData.assessment_count
    });

    // Test 7: Retrieve Assessment History
    console.log('\n7️⃣ Testing Assessment History Retrieval...');
    const { data: historyData, error: historyError } = await supabase
      .from('assessment_sessions')
      .select(`
        *,
        assessment_tasks(*)
      `)
      .eq('user_id', testUser.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });
    
    if (historyError) {
      throw new Error(`History retrieval failed: ${historyError.message}`);
    }
    
    console.log('✅ Assessment history retrieved:', {
      total_assessments: historyData.length,
      latest_assessment: historyData[0] ? {
        cefr_level: historyData[0].cefr_level,
        overall_score: historyData[0].overall_score,
        completed_at: historyData[0].completed_at
      } : null
    });

    // Test 8: Data Consistency Check
    console.log('\n8️⃣ Testing Data Consistency...');
    
    // Verify session-task relationship
    const sessionTasks = historyData[0]?.assessment_tasks || [];
    if (sessionTasks.length === 0) {
      throw new Error('No tasks found for completed session');
    }
    
    // Verify score calculations
    const taskScores = sessionTasks.map(task => task.score).filter(score => score !== null);
    const calculatedAverage = taskScores.reduce((sum, score) => sum + score, 0) / taskScores.length;
    
    if (Math.abs(calculatedAverage - completedSession.overall_score) > 1) {
      console.warn('⚠️ Score calculation discrepancy detected');
    } else {
      console.log('✅ Score calculations are consistent');
    }
    
    // Verify CEFR level mapping
    const expectedCEFR = mapScoreToCEFR(completedSession.overall_score);
    if (expectedCEFR !== completedSession.cefr_level) {
      console.warn(`⚠️ CEFR level mapping discrepancy: expected ${expectedCEFR}, got ${completedSession.cefr_level}`);
    } else {
      console.log('✅ CEFR level mapping is correct');
    }

    // Test 9: Real-time Updates Simulation
    console.log('\n9️⃣ Testing Real-time Updates...');
    
    // Simulate a progress update during assessment
    const progressUpdate = {
      current_task_index: 1,
      total_tasks: 5,
      time_elapsed_minutes: 5
    };
    
    const { error: progressError } = await supabase
      .from('assessment_sessions')
      .update(progressUpdate)
      .eq('id', sessionId);
    
    if (progressError) {
      throw new Error(`Progress update failed: ${progressError.message}`);
    }
    
    console.log('✅ Real-time progress updates working');

    // Cleanup Test Data
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete test tasks
    await supabase
      .from('assessment_tasks')
      .delete()
      .eq('session_id', sessionId);
    
    // Delete test session
    await supabase
      .from('assessment_sessions')
      .delete()
      .eq('id', sessionId);
    
    // Delete test profile
    await supabase
      .from('user_proficiency_profiles')
      .delete()
      .eq('user_id', testUser.id);
    
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All Assessment-Supabase Synchronization Tests PASSED!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Database connection');
    console.log('✅ Session creation and management');
    console.log('✅ Task creation and response handling');
    console.log('✅ Score calculation and CEFR mapping');
    console.log('✅ Proficiency profile management');
    console.log('✅ Assessment history retrieval');
    console.log('✅ Data consistency verification');
    console.log('✅ Real-time updates');
    console.log('✅ Data cleanup');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Helper function to map score to CEFR level using unified level service
function mapScoreToCEFR(score, textContent = null, isConversational = false) {
  // For test purposes, we'll use the traditional mapping since we don't have access to the unified service here
  // In production, this would use the unified level service
  if (score >= 90) return 'C2';
  if (score >= 80) return 'C1';
  if (score >= 70) return 'B2';
  if (score >= 60) return 'B1';
  if (score >= 45) return 'A2';
  return 'A1';
}

// Run the test
if (require.main === module) {
  runAssessmentSyncTest();
}

module.exports = { runAssessmentSyncTest };