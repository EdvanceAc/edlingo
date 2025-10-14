import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Clock,
  Users,
  Trophy,
  Star,
  CheckCircle,
  Lock,
  ChevronRight,
  ArrowLeft,
  Play,
  User,
  Mail,
  Bell,
  Target,
  Zap,
  Award,
  Circle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import Button from '../../ui/Button';
import { Progress } from '../../ui/Progress';
import { supabase } from '../../config/supabaseConfig';

const defaultCourse = {
  id: 'sample',
  title: 'Elementry',
  description: 'A beautifully curated A1 learning path to build strong foundations in vocabulary, grammar, and everyday conversation. Designed for premium experience with short, effective lessons.',
  level: 'A1',
  duration: '8 weeks • 3 hours/week',
  maxStudents: 20,
  priceLabel: 'Free',
  estimatedTime: '2–3 weeks',
};

const mockLessons = [
  { id: 1, title: 'Introduction to Basics (Updated)', duration: '5 min', xp: 75, status: 'completed' },
  { id: 2, title: 'Term 1: Basics - Lesson 1', duration: '16 min', xp: 75, status: 'completed' },
  { id: 3, title: 'Term 1: Basics - Lesson 2', duration: '14 min', xp: 75, status: 'locked' },
];

const CourseDetailsPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(defaultCourse);
  const [lessons, setLessons] = useState(mockLessons);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id,title,description,cefr_level,estimated_time,is_active')
          .eq('id', courseId)
          .limit(1)
          .maybeSingle();
        if (!error && data) {
          setCourse({
            id: data.id,
            title: data.title || defaultCourse.title,
            description: data.description || defaultCourse.description,
            level: data.cefr_level || defaultCourse.level,
            estimatedTime: data.estimated_time || defaultCourse.estimatedTime,
            duration: defaultCourse.duration,
            maxStudents: defaultCourse.maxStudents,
            priceLabel: 'Free',
          });
        }
      } catch (err) {
        // fall back to default
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  const progress = useMemo(() => {
    const completed = lessons.filter(l => l.status === 'completed').length;
    const pct = Math.round((completed / lessons.length) * 100);
    const xp = lessons.filter(l => l.status === 'completed').reduce((s, l) => s + (l.xp || 0), 0);
    return { completed, total: lessons.length, pct, xp };
  }, [lessons]);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Top bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button variant="outline" onClick={() => navigate('/courses')} className="rounded-lg">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>
      </motion.div>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl ring-1 ring-white/30 shadow-xl">
          {/* aurora gradient */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-white/10 via-white/5 to-transparent opacity-50 animate-[shine_5s_linear_infinite]" />
          <style>{`@keyframes shine{0%{transform:translateX(-60%)}100%{transform:translateX(160%)}}`}</style>
          <CardContent className="relative z-10 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="glass-effect p-4 rounded-xl shadow-glow">
                  <BookOpen className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight gradient-text">{course.title}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/90">
                    <Badge className="px-3 py-1 bg-white/10 ring-1 ring-white/30">en</Badge>
                    <Badge className="px-3 py-1 bg-white/10 ring-1 ring-white/30">{course.level}</Badge>
                    <Badge className="px-3 py-1 bg-white/10 ring-1 ring-white/30">general</Badge>
                  </div>
                  <p className="mt-3 text-sm text-white/80 max-w-2xl">{course.description}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="text-right">
                  <div className="text-sm font-semibold">{course.priceLabel}</div>
                  <div className="text-xs text-white/80">Flexible start</div>
                </div>
                <Button className="rounded-xl h-11 px-5">
                  <Play className="w-4 h-4 mr-2" />
                  Continue Learning
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/80">
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {course.duration}</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Max {course.maxStudents} students</div>
              <div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-500" /> Premium XP rewards</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Overview + Learning Path */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Overview */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Course Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {course.title} — {course.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Learning Path Section - Ultra Premium Redesign */}
          <motion.div 
            className="learning-path-ultra"
            initial={{ opacity: 0, y: 50, rotateX: -15 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <Card className="rounded-2xl">
              <CardHeader>
                <motion.div 
                  className="progress-header-ultra flex items-center gap-3 mb-8"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <CardTitle className="progress-title-ultra text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Learning Path
                  </CardTitle>
                  <span className="progress-percentage-ultra ml-auto">{progress.pct}% Complete</span>
                </motion.div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <motion.div 
                    className="progress-ultra mb-4"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.4, duration: 1.2, ease: "easeOut" }}
                  >
                    <motion.div 
                      className="progress-ultra-fill h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.pct}%` }}
                      transition={{ delay: 0.6, duration: 1.5, ease: "easeOut" }}
                    />
                  </motion.div>
                  <motion.div 
                    className="progress-stats-ultra"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                  >
                    <div className="progress-stat-ultra">
                      <Circle className="w-4 h-4 text-green-500" />
                      <span>{progress.completed} of {progress.total} lessons completed</span>
                    </div>
                    <div className="progress-stat-ultra">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span>{progress.xp} XP earned</span>
                    </div>
                  </motion.div>
                </div>

                {progress.pct === 100 && (
                  <motion.div 
                    className="flex items-center justify-between p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 mt-6 mb-8"
                    initial={{ scale: 0.9, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.8, ease: "easeOut" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Course completed</h4>
                        <p className="text-sm text-gray-600">Congratulations on finishing this course!</p>
                      </div>
                    </div>
                    <motion.button 
                      className="certificate-ultra"
                      whileHover={{ 
                        scale: 1.08,
                        rotateY: 5,
                        boxShadow: "0 25px 60px rgba(16, 185, 129, 0.6)"
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Award className="w-6 h-6" />
                      Get Certificate
                    </motion.button>
                  </motion.div>
                )}

                <div className="mt-8 space-y-6">
                  {lessons.map((lesson, index) => (
                    <motion.div
                      key={lesson.id}
                      className="lesson-card-ultra flex items-center justify-between p-4 rounded-xl border bg-card"
                      initial={{ opacity: 0, x: -50, rotateY: -15 }}
                      animate={{ opacity: 1, x: 0, rotateY: 0 }}
                      transition={{ 
                        delay: 1.0 + index * 0.2, 
                        duration: 0.8, 
                        ease: "easeOut",
                        type: "spring",
                        stiffness: 100
                      }}
                      whileHover={{ 
                        scale: 1.02,
                        rotateX: 5,
                        transition: { duration: 0.3 }
                      }}
                    >
                      <div className="flex items-center gap-6">
                        {lesson.status === 'completed' ? (
                          <motion.div 
                            className="lesson-status-ultra"
                            whileHover={{ 
                              scale: 1.1,
                              rotateY: 180,
                              transition: { duration: 0.4 }
                            }}
                          >
                            <CheckCircle className="w-8 h-8 text-white" />
                          </motion.div>
                        ) : lesson.status === 'locked' ? (
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-primary" />
                        )}
                        <div className="lesson-info-ultra flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-500">Lesson {lesson.id}</span>
                            <div className="lesson-meta-ultra">
                              <div className="meta-item-ultra">
                                <Clock className="w-4 h-4 text-blue-500" />
                                <span>{lesson.duration}</span>
                              </div>
                              <div className="meta-item-ultra">
                                <Zap className="w-4 h-4 text-yellow-500" />
                                <span>{lesson.xp} XP</span>
                              </div>
                              <div className="meta-item-ultra">
                                <Award className="w-4 h-4 text-purple-500" />
                                <span>Completed</span>
                              </div>
                            </div>
                          </div>
                          <h4 className="lesson-title-ultra font-medium">{lesson.title}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button 
                          className="lesson-action-ultra rounded-lg h-9 px-3"
                          whileHover={{ 
                            scale: 1.05,
                            boxShadow: "0 20px 50px rgba(245, 158, 11, 0.6)"
                          }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Trophy className="w-4 h-4" />
                          Review
                        </motion.button>
                        <Button className="rounded-lg h-9">
                          Start
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {progress.pct < 100 && (
                  <div className="mt-4 flex items-center justify-end">
                    <Button className="rounded-lg">Continue Learning</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right: Info card (Ultra Premium Redesign) */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="premium-panel">
              <div className="premium-ribbon">Premium</div>
              <CardContent className="relative z-10 p-6 space-y-6">
                {/* Price + CTA */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold gradient-text">{course.priceLabel}</div>
                    <div className="flex items-center gap-3 text-xs text-white/85 mt-1">
                      <span className="inline-flex items-center rating-stars">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <Star className="w-4 h-4 text-yellow-400" />
                        <Star className="w-4 h-4 text-yellow-400" />
                        <Star className="w-4 h-4 text-yellow-400" />
                        <Star className="w-4 h-4 text-yellow-400" />
                      </span>
                      <span>4.9 • Top rated</span>
                    </div>
                  </div>
                  <Button className="premium-cta rounded-xl h-11 px-5">
                    <Play className="w-4 h-4 mr-2" /> Continue Learning
                  </Button>
                </div>

                {/* Instructor */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl glass ring-1 ring-white/20">
                    <div className="icon-pill">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-foreground">Default Instructor</div>
                      <a href="mailto:instructor@edlingo.com" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Mail className="w-3.5 h-3.5" /> instructor@edlingo.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border bg-card">
                    <div className="icon-pill">
                      <Star className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-foreground">Prerequisites</div>
                      <div className="text-xs text-muted-foreground">{course.title}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border bg-card">
                    <div className="icon-pill">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-foreground">Learning Objectives</div>
                      <div className="text-xs text-muted-foreground">{course.title}</div>
                    </div>
                  </div>

                  <div className="divider-lux" />
                  <div className="text-xs text-white/85">Flexible start • Lifetime access • Premium support</div>

                  <Button variant="outline" className="rounded-xl h-10 inline-flex items-center justify-center w-full">
                    <Bell className="w-4 h-4 mr-2" /> Remind me daily to study
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Ultra Premium Ratings & Reviews */}
      <motion.div
        className="ratings-reviews-ultra"
        initial={{ opacity: 0, y: 30, rotateX: -15 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ 
          duration: 0.8, 
          delay: 0.6,
          type: "spring",
          stiffness: 100,
          damping: 20
        }}
      >
        {/* Ultra Premium Header */}
        <div className="ratings-header-ultra">
          <h3 className="ratings-title-ultra">
            <Star className="w-8 h-8 text-amber-500 filter drop-shadow-lg" />
            Ratings & Reviews
          </h3>
        </div>

        <div className="p-8">
          {/* Ultra Premium Rating Summary */}
          <motion.div 
            className="ratings-summary-ultra"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <div className="rating-score-ultra">
              <motion.div 
                className="rating-number-ultra"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  duration: 0.8, 
                  delay: 1.0,
                  type: "spring",
                  stiffness: 200,
                  damping: 15
                }}
              >
                {averageRating.toFixed(1)}
              </motion.div>
              <div className="stars-display-ultra">
                {[1, 2, 3, 4, 5].map((star, index) => (
                  <motion.div
                    key={star}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      duration: 0.5, 
                      delay: 1.2 + (index * 0.1),
                      type: "spring",
                      stiffness: 300
                    }}
                  >
                    <Star
                      className={`star-ultra ${
                        star <= Math.round(averageRating)
                          ? 'text-amber-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </motion.div>
                ))}
              </div>
              <div className="rating-count-ultra">{reviews.length} reviews</div>
            </div>
          </motion.div>

          {/* Ultra Premium Add Review */}
          <motion.div 
            className="add-review-ultra"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <h4 className="text-lg font-bold mb-4 text-amber-800">Add Your Review</h4>
            <div className="review-form-grid-ultra">
              <Select 
                value={newReview.rating} 
                onValueChange={(value) => setNewReview({...newReview, rating: parseInt(value)})}
              >
                <SelectTrigger className="rating-select-ultra">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <SelectItem key={rating} value={rating.toString()}>
                      {rating} Star{rating !== 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="review-input-ultra"
                placeholder="Review title"
                value={newReview.title}
                onChange={(e) => setNewReview({...newReview, title: e.target.value})}
              />
              <Input
                className="review-input-ultra"
                placeholder="Share your experience"
                value={newReview.content}
                onChange={(e) => setNewReview({...newReview, content: e.target.value})}
              />
            </div>
            <motion.button 
              className="submit-review-ultra"
              onClick={handleAddReview}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Submit Review
            </motion.button>
          </motion.div>

          {/* Ultra Premium Reviews List */}
          <div className="reviews-list-ultra">
            <h4 className="text-lg font-bold mb-6 text-amber-800">Customer Reviews</h4>
            {reviews.length === 0 ? (
              <motion.div 
                className="no-reviews-ultra"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.2 }}
              >
                <Star className="w-12 h-12 text-amber-300 mx-auto mb-4" />
                <p>No reviews yet. Be the first to share your experience!</p>
              </motion.div>
            ) : (
              reviews.map((review, index) => (
                <motion.div 
                  key={review.id} 
                  className="review-card-ultra"
                  initial={{ opacity: 0, y: 20, rotateX: -10 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ 
                    duration: 0.5, 
                    delay: 1.2 + (index * 0.1),
                    type: "spring",
                    stiffness: 120
                  }}
                >
                  <div className="review-header-ultra">
                    <h5 className="review-title-ultra">{review.title}</h5>
                    <span className="review-date-ultra">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="review-stars-ultra">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`review-star-ultra ${
                          star <= review.rating
                            ? 'text-amber-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="review-content-ultra">{review.content}</p>
                  <motion.div 
                    className="review-helpful-ultra"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Helpful ({review.helpful_count || 0})</span>
                  </motion.div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CourseDetailsPage;