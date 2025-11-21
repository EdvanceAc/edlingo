import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Palette, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle = ({ showAccentPicker = false }) => {
  const { theme, accentColor, toggleTheme, changeAccentColor, isDark } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const accentColors = [
    { name: 'blue', color: '#3b82f6', label: 'Blue' },
    { name: 'purple', color: '#8b5cf6', label: 'Purple' },
    { name: 'emerald', color: '#10b981', label: 'Emerald' },
    { name: 'rose', color: '#f43f5e', label: 'Rose' }
  ];

  return (
    <div className="flex items-center gap-2">
      {/* Theme Toggle */}
      <motion.button
        onClick={toggleTheme}
        className="relative p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 focus-ring"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="sun"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Sun className="w-5 h-5 text-yellow-400" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Moon className="w-5 h-5 text-slate-600" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Accent Color Picker */}
      {showAccentPicker && (
        <div className="relative">
          <motion.button
            onClick={() => setShowPicker(!showPicker)}
            className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 focus-ring"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Change primary color"
          >
            <Palette className="w-5 h-5" style={{ color: accentColors.find(c => c.name === accentColor)?.color }} />
          </motion.button>

          <AnimatePresence>
            {showPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute top-full mt-2 right-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-xl border border-white/20 dark:border-slate-700/50 shadow-xl p-3 z-50"
              >
                <div className="grid grid-cols-2 gap-2">
                  {accentColors.map((color) => (
                    <motion.button
                      key={color.name}
                      onClick={() => {
                        changeAccentColor(color.name);
                        setShowPicker(false);
                      }}
                      className="relative flex items-center gap-2 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 transition-all duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: color.color }}
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {color.label}
                      </span>
                      {accentColor === color.name && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5"
                        >
                          <Check className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;