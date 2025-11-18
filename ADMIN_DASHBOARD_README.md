# EdLingo Admin Dashboard

This document explains how to access and use the EdLingo Admin Dashboard for owners and teachers to manage courses and assignments.

## Overview

The Admin Dashboard is a dedicated interface separate from the student dashboard that allows administrators and teachers to:

- Manage courses and course content
- Create and manage assignments
- View student submissions and progress
- Generate grade reports
- Monitor system activity

## Access Methods

### Method 1: Electron App (Recommended)

1. Start the development server:
   ```bash
   npm run dev
   ```

2. In the Electron app, navigate to the admin dashboard by:
   - Manually typing `/admin` in the address bar
   - Or accessing it through the admin login page

### Method 2: Standalone HTML Files

For quick access without the full Electron app:

1. **Admin Login**: Open `admin-login.html` in your browser
2. **Admin Dashboard**: Open `admin-dashboard.html` directly

## Authentication

### Demo Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

**Teacher Account:**
- Username: `teacher`
- Password: `teacher123`

> ⚠️ **Security Note**: These are demo credentials for development. In production, implement proper authentication with secure password hashing and user management.

## Features

### Dashboard Overview
- **Statistics Cards**: Total students, active courses, assignments, and teachers
- **Recent Activity**: Real-time updates on system activity
- **Quick Actions**: Fast access to common administrative tasks

### Course Management
- **Add New Courses**: Create new language learning courses
- **Edit Existing Courses**: Modify course content and settings
- **Delete Courses**: Remove outdated or unused courses
- **View Enrollment**: See how many students are enrolled in each course

### Assignment Management
- **Create Assignments**: Design new exercises and tests
- **View Submissions**: Review student work and progress
- **Grade Reports**: Generate comprehensive grading reports
- **Assignment Status**: Track active, pending, and completed assignments

### Student Management
- **View Student List**: See all registered students
- **Track Progress**: Monitor individual student advancement
- **Manage Enrollments**: Add or remove students from courses

## Security Features

### Access Control
- **Separate Route**: Admin dashboard uses `/admin` route, not accessible from student sidebar
- **Authentication Required**: Login required to access admin features
- **Role-Based Access**: Different permissions for admins vs teachers
- **Session Management**: Automatic logout after inactivity

### Data Protection
- **Local Storage**: Authentication state stored securely
- **Input Validation**: All forms include proper validation
- **Error Handling**: Graceful error handling for failed operations

## File Structure

```
lingo-electron/
├── admin-login.html              # Standalone admin login page
├── admin-dashboard.html          # Standalone admin dashboard
├── src/renderer/pages/
│   └── AdminDashboard.jsx        # React component for admin dashboard
└── ADMIN_DASHBOARD_README.md     # This documentation
```

## Development Notes

### React Component (`AdminDashboard.jsx`)
- Built with React and Framer Motion for animations
- Uses Lucide React icons for consistent UI
- Responsive design with Tailwind CSS
- Integrated with the main Electron app routing

### Standalone HTML Files
- Self-contained with CDN dependencies
- Can be used independently of the main app
- Includes basic JavaScript for interactivity
- Responsive design for various screen sizes

## Customization

### Adding New Features
1. **Course Types**: Add new course categories in the course management section
2. **Assignment Types**: Create different assignment formats (quiz, essay, audio, etc.)
3. **Reporting**: Add custom reports and analytics
4. **User Roles**: Implement additional user roles beyond admin/teacher

### Styling
- Modify the gradient colors in the CSS for branding
- Adjust the card layouts and spacing
- Customize icons and typography

### Integration
- Connect to a real database for persistent data
- Implement proper user authentication system
- Add email notifications for assignments and grades
- Integrate with learning management systems (LMS)

## Production Deployment

### Security Checklist
- [ ] Replace demo credentials with secure authentication
- [ ] Implement proper password hashing (bcrypt, etc.)
- [ ] Add HTTPS/SSL certificates
- [ ] Set up proper session management
- [ ] Implement rate limiting for login attempts
- [ ] Add audit logging for admin actions
- [ ] Set up database backups
- [ ] Configure proper CORS policies

### Performance Optimization
- [ ] Implement lazy loading for large data sets
- [ ] Add pagination for student/course lists
- [ ] Optimize images and assets
- [ ] Set up caching strategies
- [ ] Monitor and log performance metrics

## Troubleshooting

### Common Issues

**Cannot access /admin route:**
- Ensure the development server is running
- Check that AdminDashboard.jsx is properly imported in App.jsx
- Verify the route is correctly defined in the Routes component

**Authentication not working:**
- Check browser console for JavaScript errors
- Verify localStorage is enabled in the browser
- Ensure demo credentials are entered correctly

**Styling issues:**
- Confirm Tailwind CSS is properly loaded
- Check for conflicting CSS rules
- Verify Lucide icons are loading correctly

### Support

For additional support or feature requests, please refer to the main project documentation or contact the development team.

---

**Last Updated**: December 2024
**Version**: 1.0.0