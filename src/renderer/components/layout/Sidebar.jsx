import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  MessageCircle, 
  MessageSquare, 
  Radio,
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
    name: 'Assessment',
    href: '/assessment?retake=1',
    icon: ClipboardCheck,
    description: 'Language proficiency assessment'
  },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const { level, totalXP, streak } = useProgress();

  return (
    <motion.div 
      className="relative h-full flex flex-col border-r border-border/40 bg-[radial-gradient(1200px_600px_at_-10%_-10%,rgba(88,121,255,0.15),transparent)] bg-card/95 backdrop-blur-md"
      initial={false}
      animate={{ width: collapsed ? '80px' : '280px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Decorative aurora accents */}
      <div aria-hidden className="pointer-events-none absolute -z-20 top-[-40px] right-[-60px] w-[220px] h-[220px] rounded-full bg-gradient-to-br from-primary/20 to-indigo-400/20 blur-2xl"></div>
      <div aria-hidden className="pointer-events-none absolute -z-20 bottom-[-60px] left-[-80px] w-[260px] h-[260px] rounded-full bg-gradient-to-tr from-pink-400/20 to-violet-500/20 blur-3xl"></div>
      {/* Header */}
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center space-x-3"
            >
              <motion.div
                whileHover={{ rotate: 3, scale: 1.05 }}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 backdrop-blur-md ring-1 ring-white/25 shadow-sm shadow-black/30"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/75 flex items-center justify-center shadow-inner">
                  <span className="text-[13px] font-bold text-white tracking-wide">E</span>
                </div>
              </motion.div>
              <div>
                <h1 className="text-lg font-bold text-foreground">EdLingo</h1>
                <p className="text-xs text-muted-foreground">Learn & Practice</p>
              </div>
            </motion.div>
          )}
          
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors bg-white/5 backdrop-blur-md ring-1 ring-white/10"
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
          className="p-4 border-b border-border/40"
        >
          <div className="space-y-3">
            {/* Level and XP */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 shadow-md shadow-yellow-400/30 ring-1 ring-white/20">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-wide">Level {level}</p>
                  <p className="text-xs text-muted-foreground">{totalXP} XP</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{streak}</p>
                <p className="text-xs text-muted-foreground">day streak</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>75%</span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden ring-1 ring-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="relative h-full bg-gradient-to-r from-primary/90 via-primary to-primary/70 rounded-full shadow-[0_0_12px_rgba(88,121,255,0.35)]"
                >
                  {/* Shine sweep */}
                  <motion.div
                    initial={{ x: '-50%' }}
                    animate={{ x: '120%' }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}
                    className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-60 mix-blend-screen"
                  />
                </motion.div>
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
              whileHover={{ scale: 1.02 }}
            >
              <NavLink
                to={item.href}
                className={({ isActive }) => `
                  group relative flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 backdrop-blur-md
                  ${isActive 
                    ? 'bg-gradient-to-br from-primary/90 to-primary/70 text-primary-foreground shadow-lg ring-1 ring-white/25 shadow-primary/30' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/10 hover:ring-1 hover:ring-white/15'
                  }
                `}
              >
                <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${isActive ? 'bg-white/10 ring-1 ring-white/20' : 'bg-white/5 ring-1 ring-white/10'} shadow-sm transition-transform duration-200 group-hover:scale-105`}>
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-foreground' : ''}`} />
                </div>
                
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
                  <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-white/15 text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 backdrop-blur-md ring-1 ring-white/20">
                    {item.name}
                  </div>
                )}
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl -z-10 bg-gradient-to-r from-primary to-primary/80 ring-1 ring-white/25 shadow-lg shadow-primary/30 overflow-hidden"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  >
                    <motion.div
                      initial={{ x: '-60%' }}
                      animate={{ x: '120%' }}
                      transition={{ repeat: Infinity, duration: 2.8, ease: 'linear' }}
                      className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-50 mix-blend-soft-light"
                    />
                  </motion.div>
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="p-4 border-t border-border/40">
        <NavLink
          to="/settings"
          className={({ isActive }) => `
            group relative flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 backdrop-blur-md
            ${isActive 
              ? 'bg-gradient-to-br from-primary/90 to-primary/70 text-primary-foreground shadow-lg ring-1 ring-white/25 shadow-primary/30' 
              : 'text-muted-foreground hover:text-foreground hover:bg-white/10 hover:ring-1 hover:ring-white/15'
            }
          `}
        >
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10 shadow-sm">
            <Settings className="w-5 h-5 flex-shrink-0" />
          </div>
          
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
            <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-white/15 text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 backdrop-blur-md ring-1 ring-white/20">
              Settings
            </div>
          )}
        </NavLink>
      </div>
    </motion.div>
  );
};

export default Sidebar;