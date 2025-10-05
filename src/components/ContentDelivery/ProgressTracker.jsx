import React from 'react';

const ProgressTracker = ({ courses, userLevel }) => {
  const calculateProgress = (course) => {
    // Logic to calculate progress based on completed lessons and requirements
    const completed = course.lessons.filter(l => l.completed).length;
    return (completed / course.lessons.length) * 100;
  };

  return (
    <div className="progress-tracker">
      <h2>Progress Overview</h2>
      {courses.map((course) => (
        <div key={course.id} className="progress-item">
          <div className="flex justify-between">
            <span>{course.title}</span>
            <span>{userLevel >= course.requiredLevel ? 'Unlocked' : `Unlock at ${course.requiredLevel}`}</span>
          </div>
          <div className="progress-bar bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${calculateProgress(course)}%` }}
            ></div>
          </div>
          <p>Completion Requirements: Complete all lessons and pass quizzes.</p>
        </div>
      ))}
    </div>
  );
};

export default ProgressTracker;