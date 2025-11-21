import React from 'react';
import { motion } from 'framer-motion';

/**
 * Reusable animated route wrapper component
 * Eliminates code duplication in App.jsx route definitions
 */
const AnimatedRoute = ({ children, routeKey }) => (
  <motion.div
    key={routeKey}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

export default AnimatedRoute;
