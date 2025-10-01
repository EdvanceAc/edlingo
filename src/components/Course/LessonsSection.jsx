import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Play, Lock, CheckCircle, Star, Trophy, ArrowRight, Zap, Mic, Edit, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../renderer/components/ui/Card';
import { Progress } from '../../renderer/components/ui/Progress';
import Button from '../../renderer/components/ui/Button';
import { Badge } from '../../renderer/components/ui/Badge';
import { supabase } from '../../renderer/config/supabaseConfig';
import supabaseService from '../../renderer/services/supabaseService';
import AuthContext from '../../renderer/contexts/AuthContext';
import unifiedLevelService from '../../services/unifiedLevelService';
import pronunciationService from '../../renderer/services/pronunciationService';
import useProgression from '../../hooks/useProgression';
import { useNavigate, useParams } from 'react-router-dom';
import PDFHighlightViewer from '../ContentDelivery/PDFHighlightViewer';

const LessonsSection = ({ courseId: propCourseId }) => {
  const params = useParams();
  const courseId = propCourseId || params.courseId;
  const { user } = useContext(AuthContext);
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [termsError, setTermsError] = useState(null);
  const [lessonsError, setLessonsError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [writingFeedback, setWritingFeedback] = useState('');
  const [pronunciationFeedback, setPronunciationFeedback] = useState(null);
  const { updateProgress, checkUnlock } = useProgression();
  const navigate = useNavigate();
  const userLevel = user?.cefr_level || 'A1';
  const [enrollment, setEnrollment] = useState(null);

  // Auto-select first term when terms are loaded
  useEffect(() => {
    if (terms.length > 0 && !selectedTerm) {
      const firstTerm = terms[0];
      setSelectedTerm(firstTerm);
    }
  }, [terms, selectedTerm]);

  // Auto-fetch lessons when selectedTerm changes
  useEffect(() => {
    if (selectedTerm) {
      fetchLessons(selectedTerm.id);
    }
  }, [selectedTerm]);

  // Fetch terms/sections on component mount
  useEffect(() => {
    if (courseId) {
      (async () => {
        const res = await supabaseService.getEnrollment(courseId);
        if (res.success) setEnrollment(res.data);
      })();
      fetchTerms();
    }
  }, [courseId]);

  const fetchTerms = async () => {
    if (!courseId) {
      setTermsError('No course ID provided');
      return;
    }

    try {
      setIsLoadingTerms(true);
      setTermsError(null);

      // Try course_sections first
      let { data: sectionsData, error: sectionsError } = await supabase
        .from('course_sections')
        .select('*')
        .eq('course_id', courseId)
        .order('order_number', { ascending: true });

      if (sectionsError) {
        console.warn('[LessonsSection] course_sections query failed:', sectionsError.message);
        // Fallback to course_terms
        const { data: termsData, error: termsError } = await supabase
          .from('course_terms')
          .select('*')
          .eq('course_id', courseId)
          .order('order', { ascending: true });

        if (termsError) {
          throw new Error(`Both course_sections and course_terms failed: ${termsError.message}`);
        }
        sectionsData = termsData;
      }

      const sortedTerms = sectionsData || [];
      setTerms(sortedTerms);

      // Check for missing name column
      const found = sortedTerms.filter(t => t.name != null || t.title != null);
      if (found.length && (found[0].name == null && found[0].title != null)) {
        console.warn('[LessonsSection] Terms/sections lack name column; using title');
      }

      // Auto-select first term if none selected
      if (sortedTerms.length > 0 && !selectedTerm) {
        setSelectedTerm(sortedTerms[0]);
      }

    } catch (error) {
      console.error('[LessonsSection] Error fetching terms:', error);
      setTermsError(error.message || 'Failed to load course sections');
    } finally {
      setIsLoadingTerms(false);
    }
  };

  const fetchLessons = async (termId) => {
    if (!termId) return;

    try {
      setIsLoadingLessons(true);
      setLessonsError(null);

      // Try multiple approaches for lesson lookup
      const queries = [
        { table: 'course_lessons', key: 'section_id' },
        { table: 'course_lessons', key: 'term_id' },
        { table: 'lessons', key: 'section_id' },
        { table: 'lessons', key: 'term_id' }
      ];

      let lessonsData = null;
      for (const { table, key } of queries) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq(key, termId)
          .order('order_number', { ascending: true });

        if (!error && data && data.length > 0) {
          lessonsData = data;
          break;
        }
      }

      // Final fallback: try by course_id
      if (!lessonsData) {
        const { data: byCourse } = await supabase
          .from('course_lessons')
          .select('*')
          .eq('course_id', courseId)
          .order('order_number', { ascending: true });

        if (byCourse) {
          console.warn('[LessonsSection] Falling back to lessons.course_id for lesson lookup.');
          lessonsData = byCourse;
        }
      }

      if (!lessonsData || lessonsData.length === 0) {
        setLessons([]);
        setSelectedLesson(null);
        setPdfUrl(null);
        setHighlights([]);
        return;
      }

      // Sort and process lessons
      const sorted = lessonsData.sort((a, b) => {
        const orderA = a.order_number ?? a.order ?? 999;
        const orderB = b.order_number ?? b.order ?? 999;
        return orderA - orderB;
      });

      // Apply level-based content simplification and unlock logic
      const processedLessons = await Promise.all(
        sorted.map(async (lesson) => ({
           ...lesson,
           content: lesson?.content ? await unifiedLevelService.simplifyText(lesson.content, userLevel) : lesson?.content,
           isUnlocked: checkUnlock(lesson) && !!enrollment
         }))
      );

      setLessons(processedLessons);

      // Auto-select first lesson and load its materials/highlights
      if (processedLessons.length > 0) {
        setSelectedLesson(processedLessons[0]);
        fetchLessonDetails(processedLessons[0].id);
      }

    } catch (error) {
      console.error('[LessonsSection] Error fetching lessons:', error);
      setLessonsError(error.message || 'Failed to load lessons');
    } finally {
      setIsLoadingLessons(false);
    }
  };

  // Normalize various highlight shapes (DB/metadata) to viewer shape
  const normalizeHighlights = (items) => {
    if (!Array.isArray(items)) return [];
    return items.map((h, idx) => {
      const id = h.id || h.highlight_id || `${h.word || 'hl'}-${h.page || h.page_number || 1}-${idx}`;
      const word = h.word || h.text || h.term || '';
      const page = h.page != null ? h.page : (h.page_number != null ? h.page_number : 1);
      const synonyms = Array.isArray(h.synonyms)
        ? h.synonyms
        : (typeof h.synonyms === 'string' && h.synonyms.length
            ? h.synonyms.split(',').map(s => s.trim()).filter(Boolean)
            : []);

      // Position/rect mapping with graceful fallbacks
      const pos = h.position || h.rect || h.bbox || h.coordinates || {};
      const rect = {
        x: pos.x != null ? pos.x : (pos.left != null ? pos.left : 0),
        y: pos.y != null ? pos.y : (pos.top != null ? pos.top : 0),
        w: pos.w != null ? pos.w : (pos.width != null ? pos.width : 0),
        h: pos.h != null ? pos.h : (pos.height != null ? pos.height : 0)
      };

      const refs = h.refs && typeof h.refs === 'object' ? h.refs : { images: [], audio: [], video: [] };

      return { id, word, page, synonyms, rect, refs };
    });
  };

  const fetchLessonDetails = async (lessonId) => {
    try {
      // Materials (best-effort)
      const { data: materialsData, error: materialsError } = await supabase
        .from('lesson_materials')
        .select('*')
        .eq('lesson_id', lessonId);

      if (materialsError) {
        console.warn('[LessonsSection] Error fetching lesson_materials:', materialsError.message);
      }

      // Prefer PDF material with metadata.highlights
      const pdfMat = Array.isArray(materialsData) ? materialsData.find(m => (m.type || '').toLowerCase() === 'pdf') : null;
      if (pdfMat) {
        try {
          let meta = pdfMat?.metadata;
          if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch (_) { meta = {}; }
          }
          setPdfUrl(pdfMat.url || pdfMat.file_url || null);
          const hs = meta && Array.isArray(meta.highlights) ? meta.highlights : [];
          setHighlights(normalizeHighlights(hs));
        } catch (e) {
          console.warn('[LessonsSection] Failed to parse PDF metadata:', e?.message || e);
        }
      }

      // Books with fallback ordering
      let bookResp = await supabase
        .from('books')
        .select('id,lesson_id,pdf_url,updated_at')
        .eq('lesson_id', lessonId)
        .order('updated_at', { ascending: false })
        .limit(1);

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

      let booksData = bookResp.data;
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

      // If no book found for this lesson, fallback to the course's most recent book
      let book = booksData?.[0] || null;
      if (!book && courseId) {
        const byCourse = await supabase
          .from('books')
          .select('id,course_id,pdf_url,updated_at')
          .eq('course_id', courseId)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (!byCourse.error && Array.isArray(byCourse.data) && byCourse.data.length) {
          book = byCourse.data[0];
        } else if (byCourse.error) {
          console.warn('[LessonsSection] Fallback books by course_id failed:', byCourse.error.message);
        }
      }

      // Set PDF and highlights
      if (book) {
        if (book.pdf_url) {
          setPdfUrl(book.pdf_url);
        }
        const { data: fetchedHl, error: hlError } = await supabase
          .from('word_highlights')
          .select('*')
          .eq('book_id', book.id);
        if (hlError) {
          console.warn('[LessonsSection] Error fetching word_highlights:', hlError.message);
        }
        const normalized = normalizeHighlights(fetchedHl || []);
        if (normalized.length) {
          setHighlights(normalized);
        }
      } else {
        // Only clear if nothing was set from materials
        setPdfUrl((prev) => prev);
        setHighlights((prev) => prev);
      }

    } catch (e) {
      console.warn('[LessonsSection] Exception in fetchLessonDetails:', e);
      setPdfUrl(null);
      setHighlights([]);
    }
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
    <div className="space-y-8">
      {/* Course Sections/Terms */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          Course Sections
        </h3>
        
        {isLoadingTerms && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading course sections...</span>
          </div>
        )}

        {termsError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive font-medium">Error loading course sections</p>
            <p className="text-destructive/80 text-sm mt-1">{termsError}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => fetchTerms()}
            >
              Try Again
            </Button>
          </div>
        )}

        {!isLoadingTerms && !termsError && terms.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {terms.map((term, index) => {
              const isSelected = selectedTerm?.id === term.id;
              return (
                <motion.div
                  key={term.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      isSelected 
                        ? 'ring-2 ring-primary bg-primary/10 border-primary/20' 
                        : 'hover:border-primary/30 hover:bg-primary/5'
                    }`}
                    onClick={() => { 
                      setSelectedTerm(term); 
                      fetchLessons(term.id); 
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground mb-1">
                            {term.name ?? term.title ?? `Section ${term.order_number ?? term.order ?? index + 1}`}
                          </h4>
                          {term.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {term.description}
                            </p>
                          )}
                        </div>
                        <ArrowRight className={`w-4 h-4 transition-colors ${
                          isSelected ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Lessons Grid */}
      {selectedTerm && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-green-500" />
            Lessons
            {selectedTerm && (
              <Badge variant="outline" className="ml-2">
                {selectedTerm.name ?? selectedTerm.title ?? 'Selected Section'}
              </Badge>
            )}
          </h3>
          
          {isLoadingLessons && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading lessons...</span>
            </div>
          )}

          {lessonsError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive font-medium">Error loading lessons</p>
              <p className="text-destructive/80 text-sm mt-1">{lessonsError}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => selectedTerm && fetchLessons(selectedTerm.id)}
              >
                Try Again
              </Button>
            </div>
          )}

          {!isLoadingLessons && !lessonsError && lessons.length === 0 && (
            <div className="text-center py-8">
              <Play className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <h4 className="text-md font-medium text-foreground mb-2">No Lessons Found</h4>
              <p className="text-muted-foreground text-sm">
                The selected section doesn't contain any lessons yet.
              </p>
            </div>
          )}

          {!isLoadingLessons && !lessonsError && lessons.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {lessons.map((lesson, index) => {
                const isSelected = selectedLesson?.id === lesson.id;
                return (
                  <motion.div
                    key={lesson.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        isSelected 
                          ? 'ring-2 ring-primary bg-primary/10 border-primary/20' 
                          : 'hover:border-primary/30 hover:bg-primary/5'
                      }`}
                      onClick={() => {
                        setSelectedLesson(lesson);
                        fetchLessonDetails(lesson.id);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground mb-1">
                              {lesson.title ?? lesson.name ?? `Lesson ${lesson.order_number ?? index + 1}`}
                            </h4>
                            {lesson.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {lesson.description}
                              </p>
                            )}
                          </div>
                          <ArrowRight className={`w-4 h-4 transition-colors ${
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      )}

      {/* PDF viewer when available */}
      {pdfUrl && (
        <div className="mt-6">
          <PDFHighlightViewer fileUrl={pdfUrl} highlights={highlights} />

          {/* Highlights table/list */}
          <div className="mt-4 border rounded-lg">
            <div className="grid grid-cols-12 px-4 py-2 bg-muted/40 text-sm font-medium text-muted-foreground">
              <div className="col-span-4">Word</div>
              <div className="col-span-2">Page</div>
              <div className="col-span-4">Synonyms</div>
              <div className="col-span-2">Rect</div>
            </div>
            {Array.isArray(highlights) && highlights.length > 0 ? (
              <div className="divide-y">
                {highlights.map((h) => (
                  <div key={h.id} className="grid grid-cols-12 px-4 py-2 text-sm">
                    <div className="col-span-4 truncate" title={h.word}>{h.word || '-'}</div>
                    <div className="col-span-2">{h.page ?? '-'}</div>
                    <div className="col-span-4 truncate" title={(h.synonyms || []).join(', ')}>
                      {(h.synonyms || []).join(', ') || '-'}
                    </div>
                    <div className="col-span-2">
                      {h.rect ? `${h.rect.x},${h.rect.y},${h.rect.w},${h.rect.h}` : '-'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">No highlights found.</div>
            )}
          </div>

          {/* Semantic UL for tests/dom expectations */}
          -          <ul id="pdf-highlights-list" className="mt-4 space-y-1 list-disc pl-6">
          -          {Array.isArray(highlights) && highlights.length > 0 ? (
          -          highlights.map((h) => (
          -          <li key={`li-${h.id || h.word}`}
          -          className="pdf-highlight-item"
          -          data-highlight-id={h.id}
          -          data-page={h.page}
          -          data-word={h.word}
          -          >
          -          <span className="font-medium">{h.word || '—'}</span>
          -          <span className="text-muted-foreground"> on page {h.page ?? '—'}</span>
          -          {(h.synonyms && h.synonyms.length > 0) && (
          -          <span className="text-muted-foreground"> — Synonyms: {(h.synonyms || []).join(', ')}</span>
          -          )}
          -          </li>
          -          ))
          -          ) : (
          -          <li className="text-sm text-muted-foreground">No highlights found.</li>
          -          )}
          -          </ul>
          +          {/* The semantic UL has been moved to an always-rendered container below. */}
         </div>
       )}

+      {/* Always-rendered highlights container to ensure UL exists after refresh */}
+      <div id="pdf-highlights-table" className="mt-6">
+        <div className="rounded-lg border p-4">
+          <ul id="pdf-highlights-list" className="space-y-1 list-disc pl-6">
+            {Array.isArray(highlights) && highlights.length > 0 ? (
+              highlights.map((h) => (
+                <li key={`li-${h.id || h.word}`}
+                    className="pdf-highlight-item"
+                    data-highlight-id={h.id}
+                    data-page={h.page}
+                    data-word={h.word}
+                >
+                  <span className="font-medium">{h.word || '—'}</span>
+                  <span className="text-muted-foreground"> on page {h.page ?? '—'}</span>
+                  {(h.synonyms && h.synonyms.length > 0) ? (
+                    <span className="text-muted-foreground"> — Synonyms: {(h.synonyms || []).join(', ')}</span>
+                  ) : null}
+                </li>
+              ))
+            ) : (
+              <li className="text-sm text-muted-foreground">No highlights found.</li>
+            )}
+          </ul>
+        </div>
+      </div>
+
       {/* Overall Empty State */}
      {!isLoadingTerms && !termsError && terms.length === 0 && !isLoadingLessons && !lessonsError && lessons.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Content Available</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            This course doesn't have any lessons or sections yet. Check back later or contact your instructor.
          </p>
        </div>
      )}
    </div>
  );
};

export default LessonsSection;