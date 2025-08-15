// SkillMap Component
// Horizontally scrollable skill map with units and lessons (Duolingo-style)

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  CheckCircle,
  Play,
  Star,
  BookOpen,
  MessageCircle,
  Headphones,
  PenTool,
  Brain
} from 'lucide-react';

const SkillMap = () => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Mock data for units - following the design document structure
  const units = [
    {
      id: 1,
      title: "Basic Greetings",
      icon: MessageCircle,
      status: "completed",
      progress: 100,
      xp: 150,
      lessons: [
        { id: 1, title: "Hello & Goodbye", type: "vocabulary", completed: true },
        { id: 2, title: "Introductions", type: "conversation", completed: true },
        { id: 3, title: "Polite Expressions", type: "grammar", completed: true }
      ]
    },
    {
      id: 2,
      title: "Family & Friends",
      icon: BookOpen,
      status: "completed",
      progress: 100,
      xp: 200,
      lessons: [
        { id: 4, title: "Family Members", type: "vocabulary", completed: true },
        { id: 5, title: "Describing People", type: "grammar", completed: true },
        { id: 6, title: "Relationships", type: "conversation", completed: true }
      ]
    },
    {
      id: 3,
      title: "Daily Activities",
      icon: Star,
      status: "current",
      progress: 67,
      xp: 100,
      lessons: [
        { id: 7, title: "Morning Routine", type: "vocabulary", completed: true },
        { id: 8, title: "Work & School", type: "grammar", completed: true },
        { id: 9, title: "Evening Activities", type: "listening", completed: false }
      ]
    },
    {
      id: 4,
      title: "Food & Dining",
      icon: PenTool,
      status: "locked",
      progress: 0,
      xp: 0,
      lessons: [
        { id: 10, title: "Food Vocabulary", type: "vocabulary", completed: false },
        { id: 11, title: "At the Restaurant", type: "conversation", completed: false },
        { id: 12, title: "Cooking Terms", type: "grammar", completed: false }
      ]
    },
    {
      id: 5,
      title: "Travel & Transport",
      icon: Headphones,
      status: "locked",
      progress: 0,
      xp: 0,
      lessons: [
        { id: 13, title: "Transportation", type: "vocabulary", completed: false },
        { id: 14, title: "Directions", type: "conversation", completed: false },
        { id: 15, title: "At the Airport", type: "listening", completed: false }
      ]
    },
    {
      id: 6,
      title: "Shopping",
      icon: Brain,
      status: "locked",
      progress: 0,
      xp: 0,
      lessons: [
        { id: 16, title: "Shopping Vocabulary", type: "vocabulary", completed: false },
        { id: 17, title: "Prices & Money", type: "grammar", completed: false },
        { id: 18, title: "At the Store", type: "conversation", completed: false }
      ]
    }
  ];

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (container) {
      const scrollAmount = 300;
      const newScrollLeft = direction === 'left' 
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;
      
      container.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth
      );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'from-green-400 to-green-600';
      case 'current':
        return 'from-blue-400 to-blue-600';
      case 'locked':
      default:
        return 'from-gray-300 to-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'current':
        return Play;
      case 'locked':
      default:
        return Lock;
    }
  };

  return (
    <div className="relative">
      {/* Scroll Controls */}
      {canScrollLeft && (
        <motion.button
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-full p-2 border border-gray-200 dark:border-gray-700"
          onClick={() => scroll('left')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </motion.button>
      )}
      
      {canScrollRight && (
        <motion.button
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-full p-2 border border-gray-200 dark:border-gray-700"
          onClick={() => scroll('right')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </motion.button>
      )}

      {/* Skill Map Container */}
      <div
        ref={scrollRef}
        className="flex space-x-6 overflow-x-auto scrollbar-hide pb-4 px-8"
        onScroll={handleScroll}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {units.map((unit, index) => {
          const IconComponent = unit.icon;
          const StatusIcon = getStatusIcon(unit.status);
          
          return (
            <motion.div
              key={unit.id}
              className="flex-shrink-0 w-64"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Unit Card */}
              <motion.div
                className={`relative bg-gradient-to-br ${getStatusColor(unit.status)} rounded-2xl p-6 text-white shadow-lg cursor-pointer`}
                whileHover={{ scale: unit.status !== 'locked' ? 1.05 : 1 }}
                whileTap={{ scale: unit.status !== 'locked' ? 0.95 : 1 }}
              >
                {/* Unit Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{unit.title}</h3>
                      <p className="text-white/80 text-sm">
                        {unit.lessons.length} lessons
                      </p>
                    </div>
                  </div>
                  <div className="p-2 bg-white/20 rounded-lg">
                    <StatusIcon className="h-5 w-5" />
                  </div>
                </div>

                {/* Progress Ring */}
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-white/20"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-white"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${unit.progress}, 100`}
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold">{unit.progress}%</span>
                    </div>
                  </div>
                </div>

                {/* XP Badge */}
                <div className="flex items-center justify-center space-x-2 bg-white/20 rounded-lg py-2">
                  <Star className="h-4 w-4" />
                  <span className="font-semibold">{unit.xp} XP</span>
                </div>

                {/* Lessons Preview */}
                <div className="mt-4 space-y-2">
                  {unit.lessons.slice(0, 2).map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center space-x-2 text-sm bg-white/10 rounded-lg p-2"
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        lesson.completed ? 'bg-white' : 'bg-white/40'
                      }`} />
                      <span className="truncate">{lesson.title}</span>
                    </div>
                  ))}
                  {unit.lessons.length > 2 && (
                    <div className="text-center text-white/60 text-xs">
                      {`+${unit.lessons.length - 2} more lessons` }
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Connection Line to Next Unit */}
              {index < units.length - 1 && (
                <div className="flex justify-center mt-4">
                  <div className="w-16 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default SkillMap;