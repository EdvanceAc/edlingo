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
                  className={`relative group flex flex-col items-center flex-none min-w-[64px] px-2 py-2 rounded-xl text-[11px] select-none transition-colors ${isActive ? 'text-white font-semibold' : 'text-white/85 hover:text-white'}`}
                >
                  <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center ring-1 shadow-sm transition-all ${isActive ? 'bg-white/25 ring-white/50 shadow-[0_0_24px_rgba(255,255,255,0.25)]' : 'bg-white/10 ring-white/20'}`}>
                    {isActive && (
                      <motion.div
                        layoutId="nav-active-bg"
                        className="absolute inset-0 rounded-xl bg-white/25"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="mt-1 truncate max-w-[72px] text-center">{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-dot"
                      className="mt-1 w-2 h-2 rounded-full bg-white/80"
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