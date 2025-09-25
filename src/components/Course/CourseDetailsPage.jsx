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
import { Input } from '../../renderer/components/ui/Input';
import { Textarea } from '../../renderer/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../../renderer/components/ui/Select';
import { Progress } from '../../renderer/components/ui/Progress';
import { supabase } from '../../renderer/config/supabaseConfig';
import supabaseService from '../../renderer/services/supabaseService';
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
  const [enrollment, setEnrollment] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState({ average: 0, count: 0 });
  const [newReview, setNewReview] = useState({ rating: '5', title: '', content: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userCertificates, setUserCertificates] = useState([]);
  const [issuingCert, setIssuingCert] = useState(false);
  const [creatingReminder, setCreatingReminder] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [answerFiles, setAnswerFiles] = useState([]);
  const [savingAnswer, setSavingAnswer] = useState(false);

  useEffect(() => {
    console.log('CourseDetailsPage useEffect triggered with courseId:', courseId);
    console.log('Current URL params:', { courseId });
    if (courseId) {
      document.title = `Course Details - ${courseId} | EdLingo`;
      fetchCourseDetails();
      fetchLessons();
      loadEnrollment();
      loadReviews();
      loadCertificates();
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

  const loadCertificates = async () => {
    try {
      const res = await supabaseService.getUserCertificates(courseId);
      if (res.success) setUserCertificates(res.data || []);
    } catch (e) {
      console.warn('loadCertificates error:', e?.message || e);
    }
  };

  const loadEnrollment = async () => {
    try {
      const res = await supabaseService.getEnrollment(courseId);
      if (res.success) setEnrollment(res.data);
    } catch (e) {
      console.warn('loadEnrollment error:', e?.message || e);
    }
  };

  const loadReviews = async () => {
    try {
      const [listRes, avgRes] = await Promise.all([
        supabaseService.getCourseReviews(courseId, { limit: 20 }),
        supabaseService.getCourseAverageRating(courseId)
      ]);
      if (listRes.success) setReviews(listRes.data || []);
      if (avgRes.success) setAvgRating(avgRes.data || { average: 0, count: 0 });
    } catch (e) {
      console.warn('loadReviews error:', e?.message || e);
    }
  };

  // Ensure there is a user_profiles row for the current auth user and return its id
  const ensureUserProfileId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // 1) Try lookup by primary key id == auth uid (most reliable)
      try {
        const { data: byIdRows, error: byIdErr } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .limit(1);
        if (!byIdErr) {
          const byId = Array.isArray(byIdRows) ? byIdRows[0] : byIdRows;
          if (byId?.id) return byId.id;
        }
      } catch (e) {
        console.warn('Profile lookup by id failed:', e?.message || e);
      }

      // 2) Try lookup by user_id column if schema has it
      try {
        const { data: byUserIdRows } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1);
        const profile = Array.isArray(byUserIdRows) ? byUserIdRows[0] : byUserIdRows;
        if (profile?.id) return profile.id;
      } catch (e) {
        // If column doesn't exist or is blocked by RLS, continue to RPC path
        console.warn('Profile lookup by user_id failed (likely harmless):', e?.message || e);
      }

      // 3) Create profile via SECURITY DEFINER RPC (bypasses RLS)
      try {
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null;
        const { error: rpcError } = await supabase.rpc('create_missing_user_profile', {
          user_id: user.id,
          user_email: user.email || null,
          user_name: fullName,
        });
        if (rpcError) {
          console.warn('RPC create_missing_user_profile failed:', rpcError.message);
        }
      } catch (e) {
        console.warn('RPC call threw:', e?.message || e);
      }

      // 4) Re-check by id first, then by user_id
      try {
        const { data: byIdRows2 } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .limit(1);
        const byId2 = Array.isArray(byIdRows2) ? byIdRows2[0] : byIdRows2;
        if (byId2?.id) return byId2.id;
      } catch {}

      try {
        const { data: byUserIdRows2 } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1);
        const profile2 = Array.isArray(byUserIdRows2) ? byUserIdRows2[0] : byUserIdRows2;
        if (profile2?.id) return profile2.id;
      } catch {}

      return null;
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
        // If this is a Supabase Storage public URL, try to derive bucket/path and get a stable URL
        try {
          const match = rawUrl.match(/https?:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/([^/]+)\/(.+)/i);
          if (match) {
            const bucketFromUrl = match[1];
            const pathFromUrl = decodeURIComponent(match[2]);
            try {
              const { data: pub } = supabase.storage.from(bucketFromUrl).getPublicUrl(pathFromUrl);
              if (pub?.publicUrl) return pub.publicUrl;
            } catch (_) { /* ignore */ }
            try {
              const { data: signed } = await supabase.storage.from(bucketFromUrl).createSignedUrl(pathFromUrl, 3600);
              if (signed?.signedUrl) return signed.signedUrl;
            } catch (_) { /* ignore */ }
          }
        } catch (_) { /* ignore */ }
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

  const fetchLessonMaterials = async (lessonId, lessonCtxOverride = null, options = {}) => {
    if (!enrollment && !options.bypassEnrollment) {
      console.warn('Blocked fetching materials: not enrolled');
      setActiveMaterials([]);
      return;
    }
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
              globalOrder: (lessonCtxOverride?.globalOrder ?? activeLesson?.globalOrder),
              order_number: (lessonCtxOverride?.order_number ?? activeLesson?.order_number),
              courseTitle: (lessonCtxOverride?.courseTitle ?? course?.title ?? course?.name),
              courseSlug: ((lessonCtxOverride?.courseTitle ?? course?.title ?? course?.name ?? '')).toLowerCase()
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

  const startLesson = async (lesson, options = {}) => {
    if (!enrollment && !options.bypassEnrollment) {
      console.warn('Cannot start lesson: user not enrolled');
      return;
    }
    setActiveLesson(lesson);
    // Load any existing submission for this lesson for convenience
    try {
      const res = await supabaseService.getLessonSubmission(lesson.id);
      if (res?.success && res.data) {
        setAnswerText(res.data.text_answer || '');
      } else {
        setAnswerText('');
      }
      setAnswerFiles([]);
    } catch (_) {}
    await fetchLessonMaterials(lesson.id, {
      id: lesson.id,
      globalOrder: lesson.globalOrder,
      order_number: lesson.order_number,
      courseTitle: course?.title || course?.name
    }, options);
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
      // Ensure we have a profile id (required for DB write)
      const userProfileId = await ensureUserProfileId();
      if (!userProfileId) {
        console.error('No user profile found; cannot record completion');
        return false;
      }

      // Write completion to Supabase synchronously (await the DB write before updating UI)
      const { error } = await supabase
        .from('user_lesson_progress')
        .upsert(
          {
            user_id: userProfileId,
            lesson_id: lessonId,
            xp_earned: xpEarned,
            time_spent_minutes: timeSpent,
            score: 85.0,
            completed_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,lesson_id'
          }
        );

      if (error) {
        console.error('Error completing lesson:', error);
        return false;
      }

      // Refresh lessons from DB to reflect the updated completion status
      const refreshedLessons = await fetchLessons();
      return refreshedLessons && Array.isArray(refreshedLessons) ? refreshedLessons : false;
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
                    
                    {enrollment ? (
                      <Button
                        className="w-full mb-4"
                        onClick={() => {
                          const firstAvailable = lessons.find(l => !l.isLocked) || lessons[0];
                          if (firstAvailable) startLesson(firstAvailable);
                        }}
                      >
                        {enrollment.status === 'completed' ? 'Review Course' : 'Continue Learning'}
                      </Button>
                    ) : (
                      <Button
                        className="w-full mb-4"
                        loading={enrolling}
                        onClick={async () => {
                          try {
                            setEnrolling(true);
                            const res = await supabaseService.enrollInCourse(courseId);
                            if (res.success) {
                              setEnrollment(res.data);
                              const firstAvailable = lessons.find(l => !l.isLocked) || lessons[0];
                              if (firstAvailable) startLesson(firstAvailable, { bypassEnrollment: true });
                            }
                          } finally {
                            setEnrolling(false);
                          }
                        }}
                      >
                        {course.price > 0 ? 'Enroll Now' : 'Start Learning'}
                      </Button>
                    )}
                    
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
                      {course.prerequisites && (
                        <div className="mt-2">
                          <div className="font-medium mb-1">Prerequisites</div>
                          <p className="text-muted-foreground">{course.prerequisites}</p>
                        </div>
                      )}
                      {course.learning_objectives && (
                        <div className="mt-2">
                          <div className="font-medium mb-1">Learning Objectives</div>
                          <p className="text-muted-foreground">{course.learning_objectives}</p>
                        </div>
                      )}
                      {/* Study Reminder Quick Add */}
                      <div className="pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          loading={creatingReminder}
                          onClick={async () => {
                            try {
                              setCreatingReminder(true);
                              await supabaseService.createStudyReminder({ courseId, frequency: 'daily' });
                            } finally {
                              setCreatingReminder(false);
                            }
                          }}
                        >
                          Remind me daily to study
                        </Button>
                      </div>
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

            {/* Ratings & Reviews */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Ratings & Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Summary */}
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <div className="text-3xl font-bold text-foreground">
                        {avgRating.average.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">{avgRating.count} reviews</div>
                    </div>
                  </div>

                  {/* Add Review */}
                  <div className="mb-6 p-4 border rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                      <div className="md:col-span-1">
                        <Select value={newReview.rating} onValueChange={(v) => setNewReview(r => ({ ...r, rating: v }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Rating" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">★★★★★</SelectItem>
                            <SelectItem value="4">★★★★☆</SelectItem>
                            <SelectItem value="3">★★★☆☆</SelectItem>
                            <SelectItem value="2">★★☆☆☆</SelectItem>
                            <SelectItem value="1">★☆☆☆☆</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          placeholder="Title (optional)"
                          value={newReview.title}
                          onChange={(e) => setNewReview(r => ({ ...r, title: e.target.value }))}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Input
                          placeholder="Share your experience"
                          value={newReview.content}
                          onChange={(e) => setNewReview(r => ({ ...r, content: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="mt-3 text-right">
                      <Button
                        size="sm"
                        loading={submittingReview}
                        onClick={async () => {
                          try {
                            setSubmittingReview(true);
                            await supabaseService.addCourseReview(courseId, {
                              rating: Number(newReview.rating),
                              title: newReview.title,
                              content: newReview.content
                            });
                            setNewReview({ rating: '5', title: '', content: '' });
                            await loadReviews();
                          } finally {
                            setSubmittingReview(false);
                          }
                        }}
                      >
                        Submit Review
                      </Button>
                    </div>
                  </div>

                  {/* Reviews List */}
                  {reviews.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</div>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map((rev) => (
                        <div key={rev.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm font-medium text-foreground">
                              {rev.title || 'Review'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(rev.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-yellow-500 text-sm mb-1">
                            {'★'.repeat(Math.max(1, Math.min(5, Number(rev.rating) || 0)))}{'☆'.repeat(5 - Math.max(1, Math.min(5, Number(rev.rating) || 0)))}
                          </div>
                          {rev.content && (
                            <div className="text-sm text-foreground mb-2">{rev.content}</div>
                          )}
                          <div className="text-xs text-muted-foreground">Helpful: {rev.helpful_count || 0}</div>
                        </div>
                      ))}
                    </div>
                  )}
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
                            {Math.floor((lessons.filter(l => l.isCompleted).length / Math.max(lessons.length, 1)) * 100)}% Complete
                          </Badge>
                        </div>
                        <Progress 
                          value={(lessons.filter(l => l.isCompleted).length / Math.max(lessons.length, 1)) * 100} 
                          className="h-3"
                        />
                        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                          <span>{lessons.filter(l => l.isCompleted).length} of {lessons.length} lessons completed</span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            {lessons.filter(l => l.isCompleted).reduce((sum, l) => sum + l.xpReward, 0)} XP earned
                          </span>
                        </div>
                        {/* Certificate CTA */}
                        {lessons.length > 0 && lessons.every(l => l.isCompleted) && (
                          <div className="mt-3 flex items-center justify-between">
                            <div className="text-sm text-foreground">Course completed</div>
                            {userCertificates.length > 0 ? (
                              <Button size="sm" variant="outline" onClick={() => window.open(userCertificates[0].share_url || '#', '_blank')}>View Certificate</Button>
                            ) : (
                              <Button size="sm" loading={issuingCert} onClick={async () => {
                                try {
                                  setIssuingCert(true);
                                  const res = await supabaseService.awardCertificate(courseId);
                                  if (res.success) await loadCertificates();
                                } finally {
                                  setIssuingCert(false);
                                }
                              }}>Get Certificate</Button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Interactive Timeline */}
                      <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200 dark:from-blue-800 dark:via-purple-800 dark:to-green-800"></div>
                        
                        {/* Lessons */}
                        <div className="space-y-4">
                          {lessons.map((lesson, index) => {
                            const isCompleted = lesson.isCompleted;
                            const isLockedByProgress = lesson.isLocked && !isCompleted;
                            const isLockedByEnrollment = !enrollment;
                            const isLocked = isLockedByProgress || isLockedByEnrollment;
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
                                          {isLockedByEnrollment && (
                                            <Badge variant="secondary" className="text-xs">Enroll to unlock</Badge>
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
                                  crossOrigin="anonymous"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  decoding="async"
                                  onError={async (e) => {
                                    try {
                                      console.warn('Failed to load image, attempting retry with signed URL/cache-bust:', m.resolvedUrl || m.url);
                                      const imgEl = e.currentTarget;
                                      imgEl.onerror = null; // prevent infinite loops

                                      const raw = (m.resolvedUrl || m.url || '').toString();
                                      let bucket = (m.metadata && (m.metadata.bucket || m.metadata.storageBucket)) || null;
                                      let path = (m.metadata && (m.metadata.path || m.metadata.storagePath)) || null;

                                      if (!bucket || !path) {
                                        const urlMatch = raw.match(/https?:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/([^/]+)\/(.+)/i);
                                        if (urlMatch) {
                                          bucket = urlMatch[1];
                                          path = decodeURIComponent(urlMatch[2]);
                                        }
                                      }

                                      if (bucket && path) {
                                        const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
                                        if (signed?.signedUrl) {
                                          imgEl.src = `${signed.signedUrl}&cb=${Date.now()}`;
                                          return;
                                        }
                                      }

                                      if (typeof raw === 'string' && raw.length) {
                                        const sep = raw.includes('?') ? '&' : '?';
                                        imgEl.src = `${raw}${sep}cb=${Date.now()}`;
                                        return;
                                      }
                                    } catch (err) {
                                      console.error('Image retry handling failed:', err);
                                    }
                                    e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="12" fill="#6b7280">Image unavailable</text></svg>';
                                  }}
                                />
                              ) : null
                            ) : null}
                            {m.content && (
                              <div className="prose dark:prose-invert mt-2 text-foreground text-sm whitespace-pre-wrap">{typeof m.content === 'string' ? m.content : JSON.stringify(m.content, null, 2)}</div>
                            )}
                          </div>
                        ))}

                        {/* Answers Section */}
                        <div className="border rounded-lg p-4">
                          <div className="font-medium mb-2 flex items-center justify-between">
                            <span>Your Answer</span>
                            {answerText && (
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                {answerText.length} chars • Auto-save enabled
                              </span>
                            )}
                          </div>
                          <Textarea
                            placeholder="Type your answer here..."
                            value={answerText}
                            onChange={async (e) => {
                              const newValue = e.target.value;
                              setAnswerText(newValue);
                              
                              // Auto-save after user stops typing (debounced)
                              if (window.autoSaveTimeout) {
                                clearTimeout(window.autoSaveTimeout);
                              }
                              
                              window.autoSaveTimeout = setTimeout(async () => {
                                if (newValue.trim() && activeLesson) {
                                  try {
                                    console.log('🔄 Auto-saving answer...');
                                    const result = await supabaseService.upsertLessonSubmission({
                                      courseId,
                                      lessonId: activeLesson.id,
                                      textAnswer: newValue,
                                      attachments: []
                                    });
                                    
                                    if (result.success) {
                                      console.log('✅ Auto-save successful');
                                      // Show subtle auto-save indicator
                                      const textarea = e.target;
                                      const originalBorder = textarea.style.borderColor;
                                      textarea.style.borderColor = '#10b981';
                                      textarea.style.borderWidth = '1px';
                                      setTimeout(() => {
                                        textarea.style.borderColor = originalBorder;
                                        textarea.style.borderWidth = '';
                                      }, 1000);
                                    } else {
                                      console.error('❌ Auto-save failed:', result.error);
                                      // Show error indicator
                                      const textarea = e.target;
                                      const originalBorder = textarea.style.borderColor;
                                      textarea.style.borderColor = '#ef4444';
                                      textarea.style.borderWidth = '2px';
                                      setTimeout(() => {
                                        textarea.style.borderColor = originalBorder;
                                        textarea.style.borderWidth = '';
                                      }, 2000);
                                    }
                                  } catch (error) {
                                    console.error('❌ Auto-save error:', error);
                                  }
                                }
                              }, 2000); // Auto-save 2 seconds after user stops typing
                            }}
                            className="mb-3"
                            onFocus={() => {
                              // Add visual feedback when focused
                              console.log('📝 Answer textarea focused');
                            }}
                            onBlur={async () => {
                              // Save when user leaves the textarea
                              if (answerText.trim() && activeLesson) {
                                try {
                                  console.log('💾 Saving on blur...');
                                  const result = await supabaseService.upsertLessonSubmission({
                                    courseId,
                                    lessonId: activeLesson.id,
                                    textAnswer: answerText,
                                    attachments: []
                                  });
                                  
                                  if (result.success) {
                                    console.log('✅ Blur save successful');
                                  } else {
                                    console.error('❌ Blur save failed:', result.error);
                                  }
                                } catch (error) {
                                  console.error('❌ Blur save error:', error);
                                }
                              }
                            }}
                          />
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              multiple
                              onChange={(e) => setAnswerFiles(Array.from(e.target.files || []))}
                            />
                            <Button
                              size="sm"
                              loading={savingAnswer}
                              onClick={async () => {
                                if (!activeLesson) return;
                                try {
                                  setSavingAnswer(true);
                                  const { data: { user } } = await supabase.auth.getUser();
                                  let uploads = [];
                                  if (answerFiles && answerFiles.length && user?.id) {
                                    try {
                                      const res = await (await import('../../renderer/services/supabaseStorageService.js')).default.uploadAnswerFiles(answerFiles, activeLesson.id, user.id);
                                      uploads = (res?.successful || []).map(f => ({
                                        name: f.name,
                                        path: f.path,
                                        bucket: f.bucket,
                                        url: f.url,
                                        size: f.size,
                                        type: f.type
                                      }));
                                    } catch (e) {
                                      console.warn('Answer file upload failed:', e?.message || e);
                                    }
                                  }
                                  console.log('💾 Saving answer manually...');
                                  const result = await supabaseService.upsertLessonSubmission({
                                    courseId,
                                    lessonId: activeLesson.id,
                                    textAnswer: answerText,
                                    attachments: uploads
                                  });
                                  
                                  console.log('📊 Save result:', result);
                                  
                                  if (result.success) {
                                    // Show success notification
                                    const notification = document.createElement('div');
                                    notification.innerHTML = `
                                      <div style="font-weight: bold;">✅ Answer Saved!</div>
                                      <div style="font-size: 12px; margin-top: 4px;">
                                        ${answerText.length} characters saved
                                      </div>
                                    `;
                                    notification.style.cssText = `
                                      position: fixed;
                                      top: 20px;
                                      right: 20px;
                                      background: #10b981;
                                      color: white;
                                      padding: 12px 16px;
                                      border-radius: 8px;
                                      font-size: 14px;
                                      z-index: 9999;
                                      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                                    `;
                                    document.body.appendChild(notification);
                                    setTimeout(() => {
                                      if (notification.parentNode) {
                                        notification.remove();
                                      }
                                    }, 3000);
                                  } else {
                                    // Show error notification
                                    const notification = document.createElement('div');
                                    notification.innerHTML = `
                                      <div style="font-weight: bold;">❌ Save Failed</div>
                                      <div style="font-size: 12px; margin-top: 4px;">
                                        ${result.error || 'Unknown error'}
                                      </div>
                                    `;
                                    notification.style.cssText = `
                                      position: fixed;
                                      top: 20px;
                                      right: 20px;
                                      background: #ef4444;
                                      color: white;
                                      padding: 12px 16px;
                                      border-radius: 8px;
                                      font-size: 14px;
                                      z-index: 9999;
                                      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                                    `;
                                    document.body.appendChild(notification);
                                    setTimeout(() => {
                                      if (notification.parentNode) {
                                        notification.remove();
                                      }
                                    }, 4000);
                                    
                                    throw new Error(result.error);
                                  }
                                } finally {
                                  setSavingAnswer(false);
                                }
                              }}
                            >
                              Save Answer
                            </Button>
                          </div>
                        </div>

                        {/* Completion Controls */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-sm text-muted-foreground">
                            Lesson {activeLesson.globalOrder} of {lessons.length}
                          </div>
                          <Button
                            onClick={async () => {
                              // award random small xp/time to simulate for now
                              // First, persist the current answer (best effort)
                              try {
                                await supabaseService.upsertLessonSubmission({
                                  courseId,
                                  lessonId: activeLesson.id,
                                  textAnswer: answerText,
                                  attachments: []
                                });
                              } catch (_) {}
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