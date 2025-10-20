import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  MessageCircle, 
  Radio,
  BookMarked
} from 'lucide-react';

// Navigation items (compact for mobile)
const navigationItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Courses', href: '/courses', icon: BookMarked },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Live', href: '/live-conversation', icon: Radio },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="mx-auto max-w-7xl">
        <div className="m-3 rounded-2xl bg-gradient-to-r from-indigo-600/90 via-purple-600/90 to-pink-600/90 backdrop-blur-lg ring-1 ring-white/20 shadow-xl">
          <div className="relative flex items-center justify-around px-3 sm:px-6 py-2 overflow-x-hidden">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative group flex flex-col items-center flex-none min-w-[72px] px-3 py-3 rounded-2xl text-[12px] select-none transition-colors ${isActive ? 'text-white font-bold' : 'text-white/70 hover:text-white'}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 -z-10 rounded-2xl bg-white/25 backdrop-blur-md ring-1 ring-white/50 shadow-[0_12px_28px_rgba(0,0,0,0.25)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center ring-1 shadow-sm transition-all ${isActive ? 'bg-gradient-to-br from-indigo-500 to-fuchsia-500 ring-white/60 shadow-[0_8px_24px_rgba(99,102,241,0.35)] scale-105' : 'bg-white/10 ring-white/20'}`}>
                    {isActive && (
                      <motion.div
                        layoutId="nav-active-bg"
                        className="absolute inset-0 rounded-xl"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white/85'}`} />
                  </div>
                  <span className={`mt-1 truncate max-w-[80px] text-center ${isActive ? 'text-white drop-shadow-sm' : 'text-white/75'}`}>{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-dot"
                      className="mt-1 w-2 h-2 rounded-full bg-white/85"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;