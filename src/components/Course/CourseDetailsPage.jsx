import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Clock, 
  Users, 
  Star, 
  Calendar, 
  Globe, 
  DollarSign,
  User,
  Mail,
  ArrowLeft,
  Play,
  Lock,
  CheckCircle,
  Trophy,
  Zap,
  Target,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../renderer/components/ui/Card';
import { Badge } from '../../renderer/components/ui/Badge';
import Button from '../../renderer/components/ui/Button';
import { Progress } from '../../renderer/components/ui/Progress';
import { supabase } from '../../renderer/config/supabaseConfig';
import AuthContext from '../../renderer/contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';

const CourseDetailsPage = () => {
  console.log('🚀 CourseDetailsPage component is being rendered!');
  
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeMaterials, setActiveMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  useEffect(() => {
    console.log('CourseDetailsPage useEffect triggered with courseId:', courseId);
    console.log('Current URL params:', { courseId });
    if (courseId) {
      document.title = `Course Details - ${courseId} | EdLingo`;
      fetchCourseDetails();
      fetchLessons();
    } else {
      console.log('No courseId found in URL params');
    }
  }, [courseId]);

  const fetchCourseDetails = async () => {
    console.log('🎯 Fetching course details for courseId:', courseId);
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      console.log('📖 Course data:', data);
      console.log('❌ Course error:', error);

      if (error) {
        console.error('Error fetching course details:', error);
        setError('Failed to load course details');
        return;
      }

      setCourse(data);
    } catch (err) {
      console.error('Exception fetching course details:', err);
      setError('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  // Ensure there is a user_profiles row for the current auth user and return its id
  const ensureUserProfileId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Try lookup (handle duplicates gracefully)
      const { data: profiles, error: profileErr } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (profileErr) {
        console.warn('Failed to fetch user profile:', profileErr.message);
      }

      const profile = Array.isArray(profiles) ? profiles[0] : profiles;
      if (profile?.id) return profile.id;

      // Create a minimal profile if missing (RLS should allow insert for auth user)
      const { data: createdRows, error: createErr } = await supabase
        .from('user_profiles')
        .insert([{ user_id: user.id, email: user.email || null }])
        .select('id');

      if (createErr) {
        console.warn('Failed to create user profile:', createErr.message);
        return null;
      }
      const created = Array.isArray(createdRows) ? createdRows[0] : createdRows;
      return created?.id ?? null;
    } catch (e) {
      console.warn('ensureUserProfileId error:', e?.message || e);
      return null;
    }
  };

  const fetchLessons = async () => {
    if (!courseId) {
      console.log('❌ No courseId provided to fetchLessons');
      return;
    }

    console.log('🔍 Fetching lessons for course ID:', courseId);
    console.log('🔍 Course ID type:', typeof courseId);
    setLoadingLessons(true);

    try {
      // Helper to process lessons + progress into UI model
      const buildLessonsWithProgress = (baseLessons, lessonProgress) => {
        const built = [];
        (baseLessons || []).forEach((lesson, index) => {
          const progress = (lessonProgress || []).find(p => p.lesson_id === lesson.id);
          const isCompleted = !!progress?.completed_at;
          const globalOrder = index + 1;
          const previousLesson = index > 0 ? built[index - 1] : null;
          const isLocked = globalOrder > 1 && previousLesson && !previousLesson.isCompleted;

          built.push({
            id: lesson.id,
            name: lesson.name || lesson.title || `Lesson ${globalOrder}`,
            title: lesson.title || lesson.name,
            description: lesson.description || lesson.content?.description || '',
            termName: lesson.termName || lesson.term_name || '',
            level: lesson.level || lesson.content?.level || '',
            globalOrder,
            isCompleted,
            isLocked,
            xpReward: progress?.xp_earned || 75,
            estimatedTime: progress?.time_spent_minutes 
              ? `${progress.time_spent_minutes} min`
              : `${8 + Math.floor(Math.random() * 12)} min`
          });
        });
        return built;
      };

      // Get or create user profile id (for progress mapping)
      const userProfileId = await ensureUserProfileId();

      // Fetch lessons using Supabase client (env-configured)
      let courseLessons = [];
      let lessonProgress = [];

      const { data: terms, error: termErr } = await supabase
        .from('terms')
        .select('id, description, order_number')
        .eq('course_id', courseId);

      if (termErr) {
        console.error('Error fetching terms for course:', termErr);
      }

      const termIds = (terms || []).map(t => t.id);
      if (termIds.length) {
        const { data: lessonRows, error: lessonsErr } = await supabase
          .from('lessons')
          .select('id, term_id, title, description, order_number, content')
          .in('term_id', termIds)
          .order('order_number', { ascending: true });

        if (lessonsErr) {
          console.error('Error fetching lessons:', lessonsErr);
        }
        courseLessons = lessonRows || [];
      }

      if (userProfileId && courseLessons.length) {
        const { data: progressRows, error: progressError } = await supabase
          .from('user_lesson_progress')
          .select('*')
          .eq('user_id', userProfileId)
          .in('lesson_id', courseLessons.map(l => l.id));
        if (progressError) {
          console.error('Error fetching lesson progress:', progressError);
        }
        lessonProgress = progressRows || [];
      }

      console.log('📚 Raw lessons data (normalized):', courseLessons);
      const allLessons = buildLessonsWithProgress(courseLessons, lessonProgress);
      setLessons(allLessons);
      return allLessons;
    } catch (err) {
      console.error('Exception fetching lessons:', err);
    } finally {
      setLoadingLessons(false);
    }
  };

  // Try to resolve a usable URL for a material that may reference Supabase Storage
  const resolveMaterialUrl = async (material, lessonCtx) => {
    try {
      const rawUrl = material?.url || '';
      let metadata = material?.metadata || {};
      if (typeof metadata === 'string') {
        try { metadata = JSON.parse(metadata); } catch (_) { metadata = {}; }
      }
      
      // 1) Already absolute URL
      if (typeof rawUrl === 'string' && /^(https?:)?\/\//i.test(rawUrl)) {
        return rawUrl;
      }

      // 2) Data URL (e.g., base64 image)
      if (typeof rawUrl === 'string' && rawUrl.startsWith('data:')) {
        return rawUrl;
      }

      // 3) Supabase storage hint in metadata { bucket, path } OR url like "storage://bucket/path" or "bucket/path"
      let bucket = metadata.bucket || null;
      let path = metadata.path || null;

      if (!bucket || !path) {
        const storageLike = typeof rawUrl === 'string' ? rawUrl.replace(/^storage:\/\//, '') : '';
        if (storageLike && storageLike.includes('/')) {
          const parts = storageLike.split('/');
          bucket = bucket || parts.shift();
          path = path || parts.join('/');
        }
      }

      if (bucket && path) {
        // Prefer public URL if available
        try {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          if (pub?.publicUrl) return pub.publicUrl;
        } catch (_) { /* ignore */ }

        // Fallback to signed URL
        try {
          const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
          if (!signErr && signed?.signedUrl) return signed.signedUrl;
        } catch (e) {
          console.warn('Failed to create signed URL:', e?.message || e);
        }
      }

       // 3b) PRIORITIZE directory scanning over guessing - scan all course folders first
       const lessonId = lessonCtx?.id;
       const lessonOrder = lessonCtx?.globalOrder || lessonCtx?.order_number;
       const lessonSlug = lessonOrder ? `lesson_${lessonOrder}` : 'lesson_1';
       
       // Try to find the image by scanning all directories for lesson folders
       try {
         console.log('🔍 Scanning course-materials for lesson:', lessonSlug);
         const { data: roots, error: rootErr } = await supabase.storage.from('course-materials').list('', { limit: 100 });
         if (!rootErr && Array.isArray(roots)) {
           for (const dir of roots) {
             if (!dir || !dir.name) continue;
             const probePrefix = `${dir.name}/${lessonSlug}`;
             console.log('🔍 Checking directory:', probePrefix);
             const { data: files, error: filesErr } = await supabase.storage.from('course-materials').list(probePrefix, { limit: 100 });
             if (!filesErr && Array.isArray(files) && files.length) {
               console.log('📁 Found files in', probePrefix, ':', files.map(f => f.name));
               const file = files.find(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f.name)) || files[0];
               if (file) {
                 const p = `${probePrefix}/${file.name}`;
                 console.log('✅ Using image path:', p);
                 const { data: pub } = await supabase.storage.from('course-materials').getPublicUrl(p);
                 if (pub?.publicUrl) return pub.publicUrl;
                 const { data: signed } = await supabase.storage.from('course-materials').createSignedUrl(p, 3600);
                 if (signed?.signedUrl) return signed.signedUrl;
               }
             }
           }
         }
       } catch (e) {
         console.warn('Directory scan failed:', e);
       }

       // 3c) Fallback to guessing paths if directory scan didn't work
       const candidateBuckets = ['course-materials','lesson-materials','lesson_materials','lesson-assets','lesson_assets','lessons','public','assets','edlingo','images','content','uploads'];
       const filenames = [metadata.filename, metadata.name, metadata.file, metadata.key].filter(Boolean);
       const exts = ['png','jpg','jpeg','webp','gif'];
       const candidatePaths = [];
       // rawUrl might actually be a relative path like folder/file.ext
       if (rawUrl && typeof rawUrl === 'string' && !rawUrl.startsWith('data:')) candidatePaths.push(rawUrl.replace(/^\/?/, ''));
       const courseSlug = (lessonCtx?.courseTitle || lessonCtx?.courseName || lessonCtx?.courseSlug || '').toString().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

       filenames.forEach((f)=>{
         if (typeof f === 'string') {
           candidatePaths.push(`${lessonId}/${f}`);
           if (courseSlug) candidatePaths.push(`${courseSlug}/${lessonSlug}/${f}`);
         }
       });
       exts.forEach((ext)=>{
         candidatePaths.push(`${lessonId}.${ext}`);
         candidatePaths.push(`${lessonId}/image.${ext}`);
         candidatePaths.push(`images/${lessonId}.${ext}`);
         candidatePaths.push(`lesson-images/${lessonId}.${ext}`);
         if (courseSlug) {
           candidatePaths.push(`${courseSlug}/${lessonSlug}/image.${ext}`);
           candidatePaths.push(`${courseSlug}/${lessonSlug}/${lessonSlug}.${ext}`);
           candidatePaths.push(`${courseSlug}/${lessonSlug}/${lessonId}.${ext}`);
         }
       });

       for (const b of candidateBuckets) {
         for (const p of candidatePaths) {
           try {
             const { data: pub } = supabase.storage.from(b).getPublicUrl(p);
             if (pub?.publicUrl) return pub.publicUrl;
           } catch (_) {}
           try {
             const { data: signed, error: signErr } = await supabase.storage.from(b).createSignedUrl(p, 3600);
             if (!signErr && signed?.signedUrl) return signed.signedUrl;
           } catch (_) {}
         }
       }


      // 4) Last resort: return as-is; renderer will show fallback link/placeholder
      return rawUrl || '';
    } catch (e) {
      console.warn('resolveMaterialUrl error:', e?.message || e);
      return material?.url || '';
    }
  };

  const fetchLessonMaterials = async (lessonId) => {
    setLoadingMaterials(true);
    try {
      let materials = [];
      console.log('🔍 Fetching materials for lesson:', lessonId);
      
      const { data, error } = await supabase
        .from('lesson_materials')
        .select('id,type,url,content,metadata')
        .eq('lesson_id', lessonId);
      
      if (error) {
        console.error('Error fetching lesson materials:', error);
      } else {
        materials = data || [];
        // Resolve URLs for any storage-backed assets
        const resolved = await Promise.all(
          materials.map(async (m) => ({
            ...m,
            resolvedUrl: await resolveMaterialUrl(m, {
              id: lessonId,
              globalOrder: activeLesson?.globalOrder,
              order_number: activeLesson?.order_number,
              courseTitle: course?.title || course?.name,
              courseSlug: (course?.title || course?.name || '').toLowerCase()
            })
          }))
        );
        materials = resolved;
        console.log('📚 Fetched materials:', materials);
        
        // Log each material for debugging
        materials.forEach((m, idx) => {
          console.log(`Material ${idx + 1}:`, {
            id: m.id,
            type: m.type,
            url: m.url,
            resolvedUrl: m.resolvedUrl,
            hasContent: !!m.content,
            metadata: m.metadata
          });
        });
      }
      
      setActiveMaterials(materials);
    } catch (err) {
      console.error('Exception fetching materials:', err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const startLesson = async (lesson) => {
    setActiveLesson(lesson);
    await fetchLessonMaterials(lesson.id);
    // Smooth scroll to the viewer section
    setTimeout(() => {
      const el = document.getElementById('current-lesson-viewer');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const formatDuration = (weeks, hoursPerWeek) => {
    if (weeks && hoursPerWeek) {
      return `${weeks} weeks • ${hoursPerWeek} hours/week`;
    }
    if (weeks) {
      return `${weeks} weeks`;
    }
    return 'Duration not specified';
  };

  const formatPrice = (price, currency) => {
    if (price === 0 || price === null) {
      return 'Free';
    }
    return `${currency || 'USD'} ${price}`;
  };

  const completeLesson = async (lessonId, xpEarned = 75, timeSpent = 10) => {
    try {
      // Ensure we have a profile id
      const userProfileId = await ensureUserProfileId();
      
      // Optimistically update local state to unlock the next lesson even if DB write fails (due to RLS etc.)
      setLessons(prev => {
        const copy = [...prev];
        // mark completed
        for (let i = 0; i < copy.length; i++) {
          if (copy[i].id === lessonId) {
            copy[i] = { ...copy[i], isCompleted: true };
            break;
          }
        }
        // recompute locks sequentially - fix the logic here
        return copy.map((lesson, idx) => {
          // First lesson is never locked
          if (idx === 0) {
            return { ...lesson, isLocked: false };
          }
          
          // For subsequent lessons, check if the previous lesson is completed
          const previousLesson = copy[idx - 1];
          const isLocked = !previousLesson.isCompleted;
          
          return { ...lesson, isLocked };
        });
      });

      if (!userProfileId) return true;

      // Insert or update lesson progress
      const { error } = await supabase
        .from('user_lesson_progress')
        .upsert({
          user_id: userProfileId,
          lesson_id: lessonId,
          xp_earned: xpEarned,
          time_spent_minutes: timeSpent,
          score: 85.0,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,lesson_id'
        });

      if (error) {
        console.error('Error completing lesson:', error);
        return true;
      }

      // Refresh lessons to show updated progress
      const refreshedLessons = await fetchLessons();
      return refreshedLessons; // Return the updated lessons array
    } catch (err) {
      console.error('Exception completing lesson:', err);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading course details...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-destructive text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Course Not Found</h2>
          <p className="text-muted-foreground mb-6">{error || 'The requested course could not be found.'}</p>
          <Button onClick={() => navigate('/courses')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-card shadow-lg border-b"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/courses')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          </div>

          {/* Course Header */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Course Info */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                    {course.language || 'Language'}
                  </Badge>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    {course.cefr_level || course.level || 'A1'}
                  </Badge>
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                    {course.category || 'General'}
                  </Badge>
                </div>
                
                <h1 className="text-4xl font-bold text-foreground mb-4">
                  {course.title || course.name || 'Untitled Course'}
                </h1>
                
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  {course.description || 'No description available for this course.'}
                </p>

                {/* Course Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">{formatDuration(course.duration_weeks, course.hours_per_week)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-5 h-5 text-green-500" />
                    <span className="text-sm">Max {course.max_students || 20} students</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm">{formatPrice(course.price, course.currency)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    <span className="text-sm">
                      {course.start_date ? new Date(course.start_date).toLocaleDateString() : 'Flexible start'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Course Actions & Info */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="bg-card border">
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="text-3xl font-bold text-primary mb-2">
                        {formatPrice(course.price, course.currency)}
                      </div>
                      {course.enrollment_deadline && (
                        <p className="text-sm text-muted-foreground">
                          Enrollment ends: {new Date(course.enrollment_deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      className="w-full mb-4"
                      onClick={() => {
                        const firstAvailable = lessons.find(l => !l.isLocked) || lessons[0];
                        if (firstAvailable) startLesson(firstAvailable);
                      }}
                    >
                      {course.price > 0 ? 'Enroll Now' : 'Start Learning'}
                    </Button>
                    
                    <div className="space-y-3 text-sm">
                      {course.instructor_name && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{course.instructor_name}</span>
                        </div>
                      )}
                      {course.instructor_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-primary">{course.instructor_email}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Course Details Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    Course Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed">
                    {course.long_description || course.description || 'Embark on your language learning journey with structured lessons designed to build your skills progressively.'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Learning Path Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-500" />
                    Learning Path
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingLessons ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-2 text-muted-foreground">Loading lessons...</span>
                    </div>
                  ) : lessons.length > 0 ? (
                    <div className="space-y-6">
                      {/* Progress Overview */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-foreground">Overall Progress</h4>
                          <Badge variant="outline" className="bg-white/50">
                            {Math.floor((lessons.filter(l => l.isCompleted).length / lessons.length) * 100)}% Complete
                          </Badge>
                        </div>
                        <Progress 
                          value={(lessons.filter(l => l.isCompleted).length / lessons.length) * 100} 
                          className="h-3"
                        />
                        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                          <span>{lessons.filter(l => l.isCompleted).length} of {lessons.length} lessons completed</span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            {lessons.filter(l => l.isCompleted).reduce((sum, l) => sum + l.xpReward, 0)} XP earned
                          </span>
                        </div>
                      </div>

                      {/* Interactive Timeline */}
                      <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200 dark:from-blue-800 dark:via-purple-800 dark:to-green-800"></div>
                        
                        {/* Lessons */}
                        <div className="space-y-4">
                          {lessons.map((lesson, index) => {
                            const isCompleted = lesson.isCompleted;
                            const isLocked = lesson.isLocked && !isCompleted;
                            const isCurrent = !isCompleted && !isLocked;
                            
                            return (
                              <motion.div
                                key={lesson.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative flex items-start gap-4"
                              >
                                {/* Timeline Node */}
                                <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 transition-all duration-300 ${
                                  isCompleted 
                                    ? 'bg-green-500 border-green-300 shadow-lg shadow-green-200' 
                                    : isCurrent 
                                    ? 'bg-blue-500 border-blue-300 shadow-lg shadow-blue-200 animate-pulse' 
                                    : 'bg-gray-200 border-gray-300 dark:bg-gray-700 dark:border-gray-600'
                                }`}>
                                  {isCompleted ? (
                                    <CheckCircle className="w-8 h-8 text-white" />
                                  ) : isCurrent ? (
                                    <Play className="w-8 h-8 text-white" />
                                  ) : (
                                    <Lock className="w-6 h-6 text-gray-500" />
                                  )}
                                </div>

                                {/* Lesson Card */}
                                <motion.div
                                  whileHover={!isLocked ? { scale: 1.02, y: -2 } : {}}
                                  className={`flex-1 transition-all duration-200 ${
                                    isLocked ? 'opacity-60' : 'cursor-pointer'
                                  }`}
                                >
                                  <Card className={`border-2 transition-all duration-200 ${
                                    isCompleted 
                                      ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' 
                                      : isCurrent 
                                      ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20 hover:border-blue-300' 
                                      : 'border-gray-200 dark:border-gray-700'
                                  }`}>
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="text-xs">
                                              {lesson.termName}
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs">
                                              Lesson {lesson.globalOrder}
                                            </Badge>
                                          </div>
                                          
                                          <h4 className={`font-semibold mb-1 ${
                                            isLocked ? 'text-muted-foreground' : 'text-foreground'
                                          }`}>
                                            {lesson.name || `Lesson ${lesson.globalOrder}`}
                                          </h4>
                                          
                                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                              <Clock className="w-4 h-4" />
                                              {lesson.estimatedTime}
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Zap className="w-4 h-4 text-yellow-500" />
                                              {lesson.xpReward} XP
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Target className="w-4 h-4 text-blue-500" />
                                              {lesson.level}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          {isCompleted && (
                                            <motion.div
                                              initial={{ scale: 0 }}
                                              animate={{ scale: 1 }}
                                              transition={{ type: "spring", delay: 0.2 }}
                                            >
                                              <Trophy className="w-5 h-5 text-yellow-500" />
                                            </motion.div>
                                          )}
                                          
                                          {!isLocked && (
                                            <Button 
                                              size="sm" 
                                              variant={isCurrent ? "default" : "outline"}
                                              className="flex items-center gap-1"
                                              onClick={() => startLesson(lesson)}
                                            >
                                              {isCompleted ? 'Review' : 'Start'}
                                              <ChevronRight className="w-4 h-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                      <h4 className="text-md font-medium text-foreground mb-2">No Lessons Available</h4>
                      <p className="text-muted-foreground text-sm">
                        This course doesn't have any lessons yet. Check back later or contact your instructor.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            {/* Active Lesson Viewer */}
            {activeLesson && (
              <motion.div
                id="current-lesson-viewer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="w-5 h-5 text-blue-500" />
                      {activeLesson.title || activeLesson.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingMaterials ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-2 text-muted-foreground">Loading materials...</span>
                      </div>
                    ) : activeMaterials.length ? (
                      <div className="space-y-4">
                        {activeMaterials.map((m) => (
                          <div key={m.id} className="border rounded-lg p-4">
                            <div className="text-sm text-muted-foreground mb-2">{m.type || 'material'}</div>
                            {(m.resolvedUrl || m.url) ? (
                              m.type === 'video' ? (
                                <video controls className="w-full max-h-[420px]"><source src={m.resolvedUrl || m.url} /></video>
                              ) : m.type === 'audio' ? (
                                <audio controls className="w-full"><source src={m.resolvedUrl || m.url} /></audio>
                              ) : m.type === 'image' ? (
                                <img 
                                  src={m.resolvedUrl || m.url} 
                                  alt={m.metadata?.alt || 'Lesson image'} 
                                  className="w-full max-h-[420px] object-contain rounded"
                                  onError={(e) => {
                                    console.error('Failed to load image:', m.resolvedUrl || m.url);
                                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjIwMCIgeT0iMTUwIiBzdHlsZT0iZmlsbDojYWFhO2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1zaXplOjE5cHg7Zm9udC1mYW1pbHk6QXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWY7ZG9taW5hbnQtYmFzZWxpbmU6Y2VudHJhbCI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
                                  }}
                                />
                              ) : (
                                <a href={m.resolvedUrl || m.url} target="_blank" rel="noreferrer" className="text-primary underline">Open file</a>
                              )
                            ) : null}
                            {m.content && (
                              <div className="prose dark:prose-invert mt-2 text-foreground text-sm whitespace-pre-wrap">{typeof m.content === 'string' ? m.content : JSON.stringify(m.content, null, 2)}</div>
                            )}
                          </div>
                        ))}

                        {/* Completion Controls */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-sm text-muted-foreground">
                            Lesson {activeLesson.globalOrder} of {lessons.length}
                          </div>
                          <Button
                            onClick={async () => {
                              // award random small xp/time to simulate for now
                              const updated = await completeLesson(activeLesson.id, activeLesson.xpReward, Math.floor(Math.random() * 15) + 5);
                              
                              // If completeLesson returned false (error), don't continue
                              if (!updated || !Array.isArray(updated)) {
                                console.error('Failed to complete lesson or get updated lessons');
                                return;
                              }
                              
                              // Find the next unlocked lesson
                              const currentIdx = updated.findIndex(l => l.id === activeLesson.id);
                              const next = currentIdx >= 0 ? updated.slice(currentIdx + 1).find(l => !l.isLocked) : null;
                              
                              if (next) {
                                await startLesson(next);
                              } else {
                                // no next lesson; collapse viewer
                                setActiveLesson(null);
                              }
                            }}
                          >
                            Mark Complete
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                        <h4 className="text-md font-medium text-foreground mb-2">No Materials</h4>
                        <p className="text-muted-foreground text-sm">This lesson has no attached materials yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">

            {/* Skills Focus */}
            {course.skills_focus && course.skills_focus.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      Skills Focus
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {course.skills_focus.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Required Materials */}
            {course.required_materials && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-500" />
                      Required Materials
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground text-sm leading-relaxed">{course.required_materials}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Instructor Bio */}
            {course.instructor_bio && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-purple-500" />
                      About the Instructor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground text-sm leading-relaxed">{course.instructor_bio}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailsPage;