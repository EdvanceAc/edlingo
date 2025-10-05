# EdLingo - AI-Powered Language Learning Desktop App

EdLingo is a modern, AI-powered language learning desktop application built with Electron, React, and cutting-edge AI technologies. It provides an interactive and personalized language learning experience with real-time conversation practice, vocabulary building, and grammar lessons.

## 🚀 Features

- **AI-Powered Conversations**: Practice real-time conversations with an AI
- **Interactive Learning**: Engaging UI with modern design and smooth animations
- **Progress Tracking**: Comprehensive user progress tracking and analytics
- **Multi-Language Support**: Learn multiple languages with adaptive content
- **Admin Dashboard**: Comprehensive admin panel for course and user management
- **Offline Capabilities**: Core features work offline with local database storage
- **Cross-Platform**: Available on Windows, macOS, and Linux

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion
- **Backend**: Electron, Node.js
- **Database**: Local Database
- **AI Integration**
- **UI Components**: Radix UI, Lucide React Icons
- **Styling**: Tailwind CSS with custom animations

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn



## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/EdLingo.git
   cd EdLingo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Fill in your AI provider API key
   ```bash
   cp .env.example .env
   ```



5. **Start the application**
   ```bash
   npm run dev
   ```

## 📖 Documentation


- [Admin Dashboard Guide](./ADMIN_DASHBOARD_README.md)

- [Project Roadmap](./PROJECT_ROADMAP.md)

## 🏗️ Project Structure

```
EdLingo/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.js          # Main application entry

│   │   └── LiveSession.js   # Real-time session handling
│   ├── renderer/            # React frontend
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   └── services/       # Frontend services
│   ├── preload/            # Electron preload scripts
│   ├── database/           # Database schemas and migrations
│   └── services/           # Shared services
├── admin-dashboard.html    # Standalone admin interface
├── package.json           # Project configuration
└── vite.config.js        # Vite configuration
```

## 🚦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run electron` - Run Electron app
- `npm run pack` - Package app for distribution
- `npm run dist` - Create distributable packages

## 🔐 Environment Variables

Create a `.env` file with the following variables:

```env




# Application Settings
VITE_APP_ENV=development
```

## 🎯 Development Workflow

1. **Feature Development**: Create feature branches from `main`
2. **Testing**: Run tests and ensure all features work correctly
3. **Database Changes**: Update schema files and run migrations
4. **Documentation**: Update relevant documentation files
5. **Build**: Test production builds before deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📱 Admin Dashboard

EdLingo includes a comprehensive admin dashboard for managing:

- User accounts and progress
- Course content and assignments
- System settings and configuration
- Analytics and reporting

Access the admin dashboard at `admin-dashboard.html` or through the main application.

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**: Check your database configuration.
2. **AI Features Not Working**: Verify your API key is correct
3. **Build Failures**: Ensure all dependencies are installed correctly

### Quick Fixes

- Run `npm install` to update dependencies

- Verify environment variables are set correctly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- AI for powerful language processing

- Electron team for cross-platform desktop framework
- React and Vite communities for excellent development tools

## 📞 Support

For support, please:
1. Check the documentation in this repository
2. Review the troubleshooting guides
3. Open an issue on GitHub
4. Contact the EdLingo team

---

**EdLingo Team** - Making language learning accessible and engaging for everyone! 🌍✨
