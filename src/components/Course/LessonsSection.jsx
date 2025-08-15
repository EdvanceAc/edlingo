import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Play, Lock, CheckCircle, Star, Trophy, ArrowRight, Zap, Mic, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../renderer/components/ui/Card';
import { Progress } from '../../renderer/components/ui/Progress';
import { Badge } from '../../renderer/components/ui/Badge';
import Button from '../../renderer/components/ui/Button';
import { supabase } from '../../renderer/config/supabaseConfig';
import AuthContext from '../../renderer/contexts/AuthContext';
import unifiedLevelService from '../../services/unifiedLevelService';
import pronunciationService from '../../renderer/services/pronunciationService';
import useProgression from '../../hooks/useProgression';
import { useNavigate, useParams } from 'react-router-dom';

const LessonsSection = ({ courseId: propCourseId }) => {
  const params = useParams();
  const courseId = propCourseId || params.courseId;
  const { user } = useContext(AuthContext);
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [userLevel, setUserLevel] = useState(user?.placement_level || 'A1');
  // Add missing state
  const [pdfUrl, setPdfUrl] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [writingFeedback, setWritingFeedback] = useState(null);
  const [pronunciationFeedback, setPronunciationFeedback] = useState(null);
  const { userProgress } = useProgression();
  
  useEffect(() => {
    if (!courseId) return;
    fetchTerms();
  }, [courseId]);

  const fetchTerms = async () => {
    const { data, error } = await supabase.from('terms')
      .select('id,name,course_id,order_number')
      .eq('course_id', courseId)
      .order('order_number');
    if (error) console.error('Error fetching terms:', error);
    else setTerms(data);
  };

  const fetchLessons = async (termId) => {
    const { data, error } = await supabase.from('lessons')
      .select('id,name,level,term_id,content')
      .eq('term_id', termId);
    if (error) console.error('Error fetching lessons:', error);
    else {
      const personalizedLessons = await Promise.all(data.map(async (lesson) => ({
        ...lesson,
        content: await unifiedLevelService.simplifyText(lesson.content, userLevel),
        isUnlocked: checkUnlock(lesson)
      })));
      setLessons(personalizedLessons);
    }
  };

  const checkUnlock = (lesson) => {
    // TODO: Implement real progression/XP checking
    return true;
  };

  const fetchLessonDetails = async (lessonId) => {
    const { data: materials } = await supabase.from('lesson_materials')
      .select('id,lesson_id,type,url')
      .eq('lesson_id', lessonId);
    const { data: book } = await supabase.from('books')
      .select('id,lesson_id,pdf_url')
      .eq('lesson_id', lessonId)
      .single();
    if (book) {
      setPdfUrl(book.pdf_url);
      const { data: fetchedHl } = await supabase.from('word_highlights')
        .select('id,book_id,word,page,x,y,width,height,color')
        .eq('book_id', book.id);
      setHighlights(fetchedHl || []);
    } else {
      setPdfUrl(null);
      setHighlights([]);
    }
  };

  const handleLessonStart = async (lesson) => {
    if (!lesson.isUnlocked) return;
    await fetchLessonDetails(lesson.id);
    // TODO: integrate TTS later if needed
  };

  const handleAssessment = async (lessonId) => {
    // Run quiz, save results, provide feedback
    // If passed, update progress and unlock next
  };

  const handleQuizSubmit = async (answers) => {
    // Submit to AI for grading, save to learning_sessions
    // If passed, updateProgress()
  };
  const handleWritingSubmit = async (text) => {
    // Send to AI for feedback
    setWritingFeedback('AI feedback here');
  };
  const handlePronunciationSubmit = async (transcript) => {
    const result = await pronunciationService.analyzePronunciation(transcript);
    setPronunciationFeedback(result);
  };

  return (
    <motion.div className="space-y-6">
      {/* Terms List */}
      {terms.map(term => (
        <Card key={term.id} onClick={() => { setSelectedTerm(term); fetchLessons(term.id); }}>
          <CardHeader><CardTitle>{term.name}</CardTitle></CardHeader>
        </Card>
      ))}
      {/* Lessons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lessons.map(lesson => (
          <Card key={lesson.id}>
            <CardHeader>
              <CardTitle>{lesson.name} ({lesson.level})</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={/* lesson progress */ 0} />
              <Button disabled={!lesson.isUnlocked} onClick={() => handleLessonStart(lesson)}>
                {lesson.isUnlocked ? 'Start' : <Lock />}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
};

export default LessonsSection;