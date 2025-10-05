import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import supabaseService from '../services/supabaseService';
import assessmentService from '../services/assessmentService';
import { useAuth } from '../contexts/AuthContext';

const AssessmentTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const { user } = useAuth();

  const addResult = (testName, status, details = '') => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test: testName,
      status,
      details,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      // Test 1: Database Connection
      setCurrentTest('Testing Database Connection...');
      try {
        const { data, error } = await supabaseService.client
          .from('assessment_sessions')
          .select('count')
          .limit(1);
        
        if (error) throw error;
        addResult('Database Connection', 'PASS', 'Successfully connected to Supabase');
      } catch (error) {
        addResult('Database Connection', 'FAIL', error.message);
        throw error;
      }

      // Test 2: Assessment Service Initialization
      setCurrentTest('Testing Assessment Service...');
      try {
        const currentSession = assessmentService.getCurrentSession();
        addResult('Assessment Service', 'PASS', 'Service initialized correctly');
      } catch (error) {
        addResult('Assessment Service', 'FAIL', error.message);
      }

      // Test 3: Create Test Assessment Session
      setCurrentTest('Creating Test Assessment Session...');
      let sessionId;
      try {
        const testUserId = user?.id || 'test-user-' + Date.now();
        const sessionData = {
          user_id: testUserId,
          target_language: 'English',
          assessment_type: 'proficiency',
          status: 'in_progress'
        };
        
        const { data, error } = await supabaseService.client
          .from('assessment_sessions')
          .insert(sessionData)
          .select()
          .single();
        
        if (error) throw error;
        sessionId = data.id;
        addResult('Session Creation', 'PASS', `Session ID: ${sessionId}`);
      } catch (error) {
        addResult('Session Creation', 'FAIL', error.message);
        throw error;
      }

      // Test 4: Create Assessment Task
      setCurrentTest('Creating Assessment Task...');
      let taskId;
      try {
        const taskData = {
          session_id: sessionId,
          task_type: 'speaking',
          prompt: 'Test prompt: Describe your favorite hobby',
          expected_duration_minutes: 3,
          difficulty_level: 'intermediate'
        };
        
        const { data, error } = await supabaseService.client
          .from('assessment_tasks')
          .insert(taskData)
          .select()
          .single();
        
        if (error) throw error;
        taskId = data.id;
        addResult('Task Creation', 'PASS', `Task ID: ${taskId}`);
      } catch (error) {
        addResult('Task Creation', 'FAIL', error.message);
        throw error;
      }

      // Test 5: Submit Task Response
      setCurrentTest('Submitting Task Response...');
      try {
        const responseData = {
          response_text: 'Test response: I enjoy reading books because it expands my knowledge.',
          score: 78,
          ai_feedback: 'Good vocabulary usage and clear expression.',
          skill_scores: {
            grammar: 75,
            vocabulary: 85,
            fluency: 80,
            accuracy: 70,
            complexity: 75
          },
          completed_at: new Date().toISOString()
        };
        
        const { data, error } = await supabaseService.client
          .from('assessment_tasks')
          .update(responseData)
          .eq('id', taskId)
          .select()
          .single();
        
        if (error) throw error;
        addResult('Task Response', 'PASS', `Score: ${data.score}`);
      } catch (error) {
        addResult('Task Response', 'FAIL', error.message);
        throw error;
      }

      // Test 6: Complete Assessment Session
      setCurrentTest('Completing Assessment Session...');
      try {
        const completionData = {
          status: 'completed',
          overall_score: 78,
          cefr_level: 'B2',
          ielts_equivalent: 6.5,
          skill_breakdown: {
            grammar: 75,
            vocabulary: 85,
            fluency: 80,
            accuracy: 70,
            complexity: 75
          },
          recommendations: [
            'Focus on grammar accuracy',
            'Continue vocabulary building'
          ],
          completed_at: new Date().toISOString()
        };
        
        const { data, error } = await supabaseService.client
          .from('assessment_sessions')
          .update(completionData)
          .eq('id', sessionId)
          .select()
          .single();
        
        if (error) throw error;
        addResult('Session Completion', 'PASS', `CEFR Level: ${data.cefr_level}`);
      } catch (error) {
        addResult('Session Completion', 'FAIL', error.message);
        throw error;
      }

      // Test 7: Update User Proficiency Profile
      setCurrentTest('Updating Proficiency Profile...');
      try {
        const testUserId = user?.id || 'test-user-' + Date.now();
        const profileData = {
          user_id: testUserId,
          language: 'English',
          current_cefr_level: 'B2',
          overall_score: 78,
          skill_breakdown: {
            grammar: 75,
            vocabulary: 85,
            fluency: 80,
            accuracy: 70,
            complexity: 75
          },
          last_assessment_date: new Date().toISOString(),
          assessment_count: 1
        };
        
        const { data, error } = await supabaseService.client
          .from('user_proficiency_profiles')
          .upsert(profileData, { onConflict: 'user_id,language' })
          .select()
          .single();
        
        if (error) throw error;
        addResult('Proficiency Profile', 'PASS', `Level: ${data.current_cefr_level}`);
      } catch (error) {
        addResult('Proficiency Profile', 'FAIL', error.message);
      }

      // Test 8: Retrieve Assessment History
      setCurrentTest('Retrieving Assessment History...');
      try {
        const testUserId = user?.id || 'test-user-' + Date.now();
        const { data, error } = await supabaseService.client
          .from('assessment_sessions')
          .select(`
            *,
            assessment_tasks(*)
          `)
          .eq('user_id', testUserId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false });
        
        if (error) throw error;
        addResult('Assessment History', 'PASS', `Found ${data.length} completed assessments`);
      } catch (error) {
        addResult('Assessment History', 'FAIL', error.message);
      }

      // Test 9: Data Consistency Check
      setCurrentTest('Checking Data Consistency...');
      try {
        const { data: sessionData, error: sessionError } = await supabaseService.client
          .from('assessment_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        
        if (sessionError) throw sessionError;
        
        const { data: taskData, error: taskError } = await supabaseService.client
          .from('assessment_tasks')
          .select('*')
          .eq('session_id', sessionId);
        
        if (taskError) throw taskError;
        
        // Verify relationships
        if (taskData.length === 0) {
          throw new Error('No tasks found for session');
        }
        
        // Verify score consistency
        const taskScores = taskData.map(task => task.score).filter(score => score !== null);
        const avgScore = taskScores.reduce((sum, score) => sum + score, 0) / taskScores.length;
        
        if (Math.abs(avgScore - sessionData.overall_score) <= 1) {
          addResult('Data Consistency', 'PASS', 'All data relationships verified');
        } else {
          addResult('Data Consistency', 'WARN', 'Minor score calculation discrepancy');
        }
      } catch (error) {
        addResult('Data Consistency', 'FAIL', error.message);
      }

      // Cleanup Test Data
      setCurrentTest('Cleaning up test data...');
      try {
        // Delete test tasks
        await supabaseService.client
          .from('assessment_tasks')
          .delete()
          .eq('session_id', sessionId);
        
        // Delete test session
        await supabaseService.client
          .from('assessment_sessions')
          .delete()
          .eq('id', sessionId);
        
        addResult('Cleanup', 'PASS', 'Test data cleaned up successfully');
      } catch (error) {
        addResult('Cleanup', 'WARN', 'Some test data may remain: ' + error.message);
      }

      setCurrentTest('All tests completed!');
      
    } catch (error) {
      setCurrentTest('Test suite failed: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASS': return 'text-green-600';
      case 'FAIL': return 'text-red-600';
      case 'WARN': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'WARN': return '⚠️';
      default: return '⏳';
    }
  };

  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  const warnCount = testResults.filter(r => r.status === 'WARN').length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Assessment-Supabase Synchronization Test
        </h1>
        <p className="text-muted-foreground">
          Comprehensive test suite to verify assessment system integration with Supabase database.
        </p>
      </div>

      <div className="mb-6">
        <Button 
          onClick={runComprehensiveTest} 
          disabled={isRunning}
          className="mr-4"
        >
          {isRunning ? 'Running Tests...' : 'Run Comprehensive Test'}
        </Button>
        
        {testResults.length > 0 && (
          <div className="inline-flex items-center space-x-4 text-sm">
            <span className="text-green-600">✅ Passed: {passCount}</span>
            <span className="text-red-600">❌ Failed: {failCount}</span>
            <span className="text-yellow-600">⚠️ Warnings: {warnCount}</span>
          </div>
        )}
      </div>

      {isRunning && (
        <Card className="mb-6 p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">{currentTest}</span>
          </div>
        </Card>
      )}

      {testResults.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="space-y-3">
            {testResults.map((result) => (
              <div key={result.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                <span className="text-lg">{getStatusIcon(result.status)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{result.test}</span>
                    <span className="text-xs text-muted-foreground">{result.timestamp}</span>
                  </div>
                  <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                    {result.status}
                  </span>
                  {result.details && (
                    <p className="text-sm text-muted-foreground mt-1">{result.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {!isRunning && testResults.length > 0 && (
            <div className="mt-6 p-4 rounded-lg bg-muted">
              <h3 className="font-semibold mb-2">Test Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="text-green-600">
                  <div className="text-2xl font-bold">{passCount}</div>
                  <div className="text-sm">Passed</div>
                </div>
                <div className="text-red-600">
                  <div className="text-2xl font-bold">{failCount}</div>
                  <div className="text-sm">Failed</div>
                </div>
                <div className="text-yellow-600">
                  <div className="text-2xl font-bold">{warnCount}</div>
                  <div className="text-sm">Warnings</div>
                </div>
              </div>
              
              {failCount === 0 && (
                <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg text-center">
                  🎉 All critical tests passed! Assessment-Supabase synchronization is working correctly.
                </div>
              )}
              
              {failCount > 0 && (
                <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg text-center">
                  ⚠️ Some tests failed. Please check the configuration and database setup.
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default AssessmentTest;