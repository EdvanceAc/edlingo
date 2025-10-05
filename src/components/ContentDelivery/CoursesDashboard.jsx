import React, { useState, useEffect } from 'react';
import { useSupabaseService } from '../../services/supabaseService'; // Assuming this hook exists or needs creation
import CourseList from './CourseList';
import LessonViewer from './LessonViewer';
import ProgressTracker from './ProgressTracker';
import usePersonalization from '../../hooks/usePersonalization';

const CoursesDashboard = () => {
  const supabaseService = useSupabaseService();
  const { userLevel } = usePersonalization();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      const fetchedCourses = await supabaseService.getCourses(userLevel);
      setCourses(fetchedCourses);
    };
    fetchCourses();
  }, [userLevel, supabaseService]);

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setSelectedLesson(null);
  };

  const handleLessonSelect = (lesson) => {
    setSelectedLesson(lesson);
  };

  return (
    <div className="courses-dashboard">
      <h1>Courses Dashboard</h1>
      <ProgressTracker courses={courses} userLevel={userLevel} />
      <CourseList 
        courses={courses} 
        userLevel={userLevel} 
        onCourseSelect={handleCourseSelect} 
        onLessonSelect={handleLessonSelect} 
      />
      {selectedLesson && <LessonViewer lesson={selectedLesson} />}
    </div>
  );
};

export default CoursesDashboard;