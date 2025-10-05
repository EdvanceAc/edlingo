import React from 'react';

const CourseList = ({ courses, userLevel, onCourseSelect, onLessonSelect }) => {
  return (
    <div className="course-list">
      <h2>Available Courses</h2>
      {courses.map((course) => {
        const isUnlocked = userLevel >= course.requiredLevel;
        return (
          <div key={course.id} className={`course-item ${isUnlocked ? 'unlocked' : 'locked'}`}>
            <h3 onClick={() => isUnlocked && onCourseSelect(course)}>{course.title}</h3>
            <p>{course.description}</p>
            {!isUnlocked && <p>Unlock at level {course.requiredLevel}</p>}
            {isUnlocked && course.lessons && (
              <ul>
                {course.lessons.map((lesson) => (
                  <li key={lesson.id} onClick={() => onLessonSelect(lesson)}>
                    {lesson.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CourseList;