import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  MessageCircle, 
  MessageSquare, 
  Radio,
  Mic, 
  BookOpen, 
  GraduationCap, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  ClipboardCheck,
  BookMarked
} from 'lucide-react';
import { useProgress } from '../../providers/ProgressProvider';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
    description: 'Overview and progress'
  },
  {
    name: 'Courses',
    href: '/courses',
    icon: BookMarked,
    description: 'Structured learning paths'
  },
  {
    name: 'Chat',
    href: '/chat',
    icon: MessageCircle,
    description: 'Basic conversation practice'
  },
  {
    name: 'Enhanced Chat',
    href: '/enhanced-chat',
    icon: MessageSquare,
    description: 'Advanced AI conversations'
  },
  {
    name: 'Live Conversation',
    href: '/live-conversation',
    icon: Radio,
    description: 'Real-time conversation practice'
  },
  {
    name: 'Pronunciation',
    href: '/pronunciation',
    icon: Mic,
    description: 'Speech practice and feedback'
  },
  {
    name: 'Vocabulary',
    href: '/vocabulary',
    icon: BookOpen,
    description: 'Learn new words and phrases'
  },
  {
    name: 'Grammar',
    href: '/grammar',
    icon: GraduationCap,
    description: 'Grammar exercises and rules'
  },
  {
    name: 'Assessment',
    href: '/assessment',
    icon: ClipboardCheck,
    description: 'Language proficiency assessment'
  },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const { level, totalXP, streak } = useProgress();

  return (
    <motion.div 
      className="h-full bg-card border-r border-border flex flex-col"
      initial={false}
      animate={{ width: collapsed ? '80px' : '280px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-white">E</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">EdLingo</h1>
                <p className="text-xs text-muted-foreground">Learn & Practice</p>
              </div>
            </motion.div>
          )}
          
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* User Progress Summary */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 border-b border-border"
        >
          <div className="space-y-3">
            {/* Level and XP */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">Level {level}</p>
                  <p className="text-xs text-muted-foreground">{totalXP} XP</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{streak}</p>
                <p className="text-xs text-muted-foreground">day streak</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>75%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <NavLink
                to={item.href}
                className={({ isActive }) => `
                  group relative flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-foreground' : ''}`} />
                
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 min-w-0"
                  >
                    <p className="truncate">{item.name}</p>
                    <p className={`text-xs truncate ${
                      isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}>
                      {item.description}
                    </p>
                  </motion.div>
                )}
                
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary rounded-lg -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="p-4 border-t border-border">
        <NavLink
          to="/settings"
          className={({ isActive }) => `
            group relative flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200
            ${isActive 
              ? 'bg-primary text-primary-foreground shadow-md' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }
          `}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Settings
            </motion.span>
          )}
          
          {/* Tooltip for collapsed state */}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Settings
            </div>
          )}
        </NavLink>
      </div>
    </motion.div>
  );
};

export default Sidebar;