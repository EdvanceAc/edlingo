/**
 * Centralized route configuration
 * Makes it easier to manage and modify routes
 */

// Lazy load components for better performance
import { lazy } from 'react';

const Dashboard = lazy(() => import('../pages/Dashboard'));
const Chat = lazy(() => import('../pages/Chat'));
const EnhancedChat = lazy(() => import('../pages/EnhancedChat'));
const LiveConversation = lazy(() => import('../pages/LiveConversation'));
const Pronunciation = lazy(() => import('../pages/Pronunciation'));
const Vocabulary = lazy(() => import('../pages/Vocabulary'));
const Grammar = lazy(() => import('../pages/Grammar'));
const Courses = lazy(() => import('../pages/Courses'));
const Settings = lazy(() => import('../pages/Settings'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));

export const routes = [
  {
    path: '/',
    component: Dashboard,
    key: 'dashboard',
    title: 'Dashboard'
  },
  {
    path: '/chat',
    component: Chat,
    key: 'chat',
    title: 'Chat'
  },
  {
    path: '/enhanced-chat',
    component: EnhancedChat,
    key: 'enhanced-chat',
    title: 'Enhanced Chat'
  },
  {
    path: '/live-conversation',
    component: LiveConversation,
    key: 'live-conversation',
    title: 'Live Conversation'
  },
  {
    path: '/pronunciation',
    component: Pronunciation,
    key: 'pronunciation',
    title: 'Pronunciation'
  },
  {
    path: '/vocabulary',
    component: Vocabulary,
    key: 'vocabulary',
    title: 'Vocabulary'
  },
  {
    path: '/grammar',
    component: Grammar,
    key: 'grammar',
    title: 'Grammar'
  },
  {
    path: '/courses',
    component: Courses,
    key: 'courses',
    title: 'Courses'
  },
  {
    path: '/settings',
    component: Settings,
    key: 'settings',
    title: 'Settings'
  }
];

export const adminRoutes = [
  {
    path: '/admin',
    component: AdminDashboard,
    key: 'admin-dashboard',
    title: 'Admin Dashboard'
  }
];

export const allRoutes = [...routes, ...adminRoutes];
