import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  MessageCircle, 
  MessageSquare, 
  Radio,
  ClipboardCheck,
  BookMarked
} from 'lucide-react';

// Navigation items mirroring the sidebar (Settings moved to mobile drawer)
const navigationItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Courses', href: '/courses', icon: BookMarked },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Enhanced Chat', href: '/enhanced-chat', icon: MessageSquare },
  { name: 'Live', href: '/live-conversation', icon: Radio },
  { name: 'Assessment', href: '/assessment', icon: ClipboardCheck },
];

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="mx-auto max-w-7xl">
        <div className="m-3 rounded-2xl bg-gradient-to-r from-indigo-600/90 via-purple-600/90 to-pink-600/90 backdrop-blur-lg ring-1 ring-white/20 shadow-xl">
          <div className="flex items-center justify-between px-2 sm:px-4 py-2 overflow-x-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) => `flex flex-col items-center flex-none min-w-[64px] px-2 py-2 rounded-xl text-[11px] ${isActive ? 'text-white' : 'text-white/80'} hover:text-white`}
               >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${/* active styles */''} bg-white/10 ring-1 ring-white/20 shadow-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="mt-1 truncate max-w-[72px] text-center">{item.name}</span>
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