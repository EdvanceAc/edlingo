import React from 'react';
import { motion } from 'framer-motion';

const SkeletonLoader = ({ className = '', variant = 'default', count = 1 }) => {
  const variants = {
    default: 'h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
    card: 'h-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-xl',
    text: 'h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
    title: 'h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
    circle: 'w-12 h-12 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
    button: 'h-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-lg'
  };

  const skeletonClass = `${variants[variant]} ${className} animate-pulse`;

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          className={skeletonClass}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.1
          }}
        />
      ))}
    </>
  );
};

export const StatsCardSkeleton = () => (
  <div className="glass-card p-6 rounded-xl">
    <div className="flex items-center justify-between mb-4">
      <SkeletonLoader variant="circle" />
      <SkeletonLoader variant="text" className="w-16" />
    </div>
    <SkeletonLoader variant="title" className="w-24 mb-2" />
    <SkeletonLoader variant="text" className="w-32" />
  </div>
);

export const CourseCardSkeleton = () => (
  <div className="glass-card p-6 rounded-xl">
    <div className="flex items-center justify-between mb-4">
      <SkeletonLoader variant="title" className="w-48" />
      <SkeletonLoader variant="button" className="w-20" />
    </div>
    <SkeletonLoader variant="text" className="w-full mb-2" />
    <SkeletonLoader variant="text" className="w-3/4 mb-4" />
    <div className="flex items-center justify-between">
      <SkeletonLoader variant="text" className="w-24" />
      <SkeletonLoader variant="text" className="w-16" />
    </div>
  </div>
);

export const TableRowSkeleton = ({ columns = 4 }) => (
  <tr className="border-b border-gray-200 dark:border-gray-700">
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-6 py-4">
        <SkeletonLoader variant="text" className="w-full" />
      </td>
    ))}
  </tr>
);

export default SkeletonLoader;