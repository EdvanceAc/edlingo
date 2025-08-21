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

  // Helper: try a select with a filter and return first non-empty successful result
  const trySelect = async (table, filter) => {
    try {
      const { data, error } = await supabase.from(table).select('*').match(filter);
      if (error) {
        console.warn(`[LessonsSection] Query error on ${table}:`, error.message);
        return null;
      }
      if (Array.isArray(data) && data.length > 0) return data;
      return null;
    } catch (e) {
      console.warn(`[LessonsSection] Exception querying ${table}:`, e);
      return null;
    }
  };

  // Helper: client-side sort by common order fields
  const sortByOrder = (rows) => {
    const orderKey = (row) => (
      row.order_number ?? row.order ?? row.position ?? row.index ?? 0
    );
    return [...rows].sort((a, b) => orderKey(a) - orderKey(b));
  };

  const fetchTerms = async () => {
    // Avoid server-side order to prevent failures on missing columns; sort client-side
    const tablesToTry = ['terms', 'sections', 'course_sections'];
    let found = null;
    for (const table of tablesToTry) {
      const data = await trySelect(table, { course_id: courseId });
      if (data) {
        if (table !== 'terms') {
          console.warn(`[LessonsSection] Falling back to ${table} for course sections.`);
        }
        found = data;
        break;
      }
    }
    if (!found) {
      console.error('[LessonsSection] No terms/sections found for course:', courseId);
      setTerms([]);
      return;
    }

    // Warn if name field missing
    if (found.length && (found[0].name == null && found[0].title != null)) {
      console.warn('[LessonsSection] Terms/sections lack name column; using title');
    }

    setTerms(sortByOrder(found));
  };

  const fetchLessons = async (termId) => {
    // Try multiple mappings: lessons.term_id, lessons.section_id, course_lessons.*
    const candidates = [
      { table: 'lessons', key: 'term_id' },
      { table: 'lessons', key: 'section_id' },
      { table: 'course_lessons', key: 'term_id' },
      { table: 'course_lessons', key: 'section_id' }
    ];

    let lessonsData = null;
    for (const c of candidates) {
      const data = await trySelect(c.table, { [c.key]: termId });
      if (data) {
        if (!(c.table === 'lessons' && c.key === 'term_id')) {
          console.warn(`[LessonsSection] Falling back to ${c.table}.${c.key} for lesson lookup.`);
        }
        lessonsData = data;
        break;
      }
    }

    // Fallback: some schemas link lessons directly to courses via lessons.course_id
    if (!lessonsData) {
      const byCourse = await trySelect('lessons', { course_id: courseId });
      if (byCourse) {
        console.warn('[LessonsSection] Falling back to lessons.course_id for lesson lookup.');
        lessonsData = byCourse;
      }
    }

    if (!lessonsData) {
      console.error('[LessonsSection] No lessons found for term/section or course:', termId, courseId);
      setLessons([]);
      return;
    }

    const sorted = sortByOrder(lessonsData);

    const personalizedLessons = await Promise.all(
      sorted.map(async (lesson) => ({
        ...lesson,
        content: lesson?.content ? await unifiedLevelService.simplifyText(lesson.content, userLevel) : lesson?.content,
        isUnlocked: checkUnlock(lesson)
      }))
    );
    setLessons(personalizedLessons);
  };

  const checkUnlock = (lesson) => {
    // TODO: Implement real progression/XP checking
    return true;
  };

  const fetchLessonDetails = async (lessonId) => {
    try {
      // Materials (best-effort)
      const { data: materialsData, error: materialsError } = await supabase
        .from('lesson_materials')
        .select('id,lesson_id,type,url')
        .eq('lesson_id', lessonId);
      if (materialsError) {
        console.warn('[LessonsSection] Error fetching lesson_materials:', materialsError.message);
      }

      // Books: avoid .single() and be resilient to schemas lacking updated_at
      let booksData = null;
      let bookQuery = supabase
        .from('books')
        .select('id,lesson_id,pdf_url,updated_at,created_at')
        .eq('lesson_id', lessonId)
        .order('updated_at', { ascending: false })
        .limit(1);

      let bookResp = await bookQuery;
      if (bookResp.error) {
        // Retry ordering by created_at if updated_at not present
        console.warn('[LessonsSection] Books query with updated_at failed, retrying with created_at:', bookResp.error.message);
        bookResp = await supabase
          .from('books')
          .select('id,lesson_id,pdf_url,created_at')
          .eq('lesson_id', lessonId)
          .order('created_at', { ascending: false })
          .limit(1);
      }

      if (bookResp.error) {
        // Final fallback: no ordering, just take first
        console.warn('[LessonsSection] Books query without ordering fallback due to error:', bookResp.error.message);
        const fallback = await supabase
          .from('books')
          .select('id,lesson_id,pdf_url')
          .eq('lesson_id', lessonId)
          .limit(1);
        if (!fallback.error) booksData = fallback.data;
      } else {
        booksData = bookResp.data;
      }

      const book = Array.isArray(booksData) && booksData.length > 0 ? booksData[0] : null;

      if (book) {
        setPdfUrl(book.pdf_url);
        const { data: fetchedHl, error: hlError } = await supabase
          .from('word_highlights')
          .select('id,book_id,word,page,x,y,width,height,color')
          .eq('book_id', book.id);
        if (hlError) {
          console.warn('[LessonsSection] Error fetching word_highlights:', hlError.message);
        }
        setHighlights(fetchedHl || []);
      } else {
        setPdfUrl(null);
        setHighlights([]);
      }
    } catch (e) {
      console.warn('[LessonsSection] Exception in fetchLessonDetails:', e);
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
          <CardHeader>
            <CardTitle>{term.name ?? term.title ?? `Term ${term.order_number ?? term.order ?? ''}`}</CardTitle>
          </CardHeader>
        </Card>
      ))}
      {/* Lessons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lessons.map(lesson => (
          <Card key={lesson.id}>
            <CardHeader>
              <CardTitle>
                {(lesson.name ?? lesson.title ?? `Lesson ${lesson.order_number ?? lesson.order ?? ''}`)}
                {lesson.level ? ` (${lesson.level})` : (lesson.difficulty ? ` (${lesson.difficulty})` : '')}
              </CardTitle>
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