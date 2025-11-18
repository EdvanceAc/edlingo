# EdLingo Content Delivery & Progression System

A comprehensive, adaptive content delivery and progression system for language learning applications. This system implements sequential content unlocking, proficiency-based content adaptation, assignment and test management, conversation engagement tracking, and text simplification capabilities.

## 🚀 Features

### Core Progression System
- **Sequential Content Unlocking ("Dripping System")**: Content is unlocked progressively based on completion of prerequisites
- **Proficiency-Based Locking**: Higher-level content is automatically locked for lower proficiency users
- **Assignment Completion Requirements**: Users must complete assignments before progressing to next modules
- **Test Passing Requirements**: Minimum test scores required for progression
- **Conversation Engagement Requirements**: Minimum conversation participation and engagement scores
- **Adaptive Content Difficulty**: Content complexity automatically adjusts based on user proficiency

### Text Simplification Engine
- **Readability Analysis**: Flesch Reading Ease and Flesch-Kincaid Grade Level computation
- **CEFR Level Mapping**: Automatic mapping to Common European Framework levels (A1-C2)
- **AI-Powered Simplification**: OpenAI GPT integration for intelligent text adaptation
- **Caching System**: Efficient caching of simplified content to reduce API calls
- **Quality Assessment**: Automatic evaluation of simplification quality

### Assessment & Tracking
- **Comprehensive Progress Tracking**: Detailed user progress monitoring across all modules
- **Conversation Analytics**: Advanced conversation engagement scoring and analysis
- **Performance Metrics**: Vocabulary diversity, grammar scoring, topic relevance tracking
- **Learning Path Management**: Customizable learning paths with branching logic
- **Achievement System**: Points, levels, and streak tracking

### Admin Interface
- **Content Management**: Create, edit, and manage learning modules
- **Progression Rule Configuration**: Set up custom progression rules and requirements
- **User Progress Monitoring**: Real-time tracking of all user activities
- **System Analytics**: Comprehensive dashboard with engagement and completion metrics
- **Data Export/Import**: Bulk data operations for system management

## 📁 System Architecture

```
src/
├── components/ContentDelivery/
│   ├── index.jsx                    # Main integration component
│   ├── ContentDeliveryDashboard.jsx # User dashboard with module overview
│   ├── ModuleContent.jsx            # Adaptive content display
│   ├── AssignmentSystem.jsx         # Assignment management
│   ├── TestSystem.jsx               # Test and quiz system
│   ├── ConversationTracker.jsx      # Conversation engagement tracking
│   └── ProgressionAdmin.jsx         # Administrative interface
├── services/
│   ├── progressionService.js        # Core progression logic
│   ├── textSimplificationService.js # Text adaptation service
│   └── conversationEngagementService.js # Conversation analytics
├── hooks/
│   └── useProgression.js            # React hook for progression state
├── utils/
│   ├── readability.js               # Readability analysis utilities
│   └── mcpClient.js                 # Supabase PostgREST client
└── database/migrations/
    └── 010_add_progression_system.sql # Database schema
```

## 🗄️ Database Schema

### Core Tables

#### `content_modules`
Stores learning modules with metadata and content structure.
```sql
CREATE TABLE content_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    language TEXT NOT NULL,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
    content JSONB NOT NULL,
    estimated_duration_minutes INTEGER DEFAULT 30,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `user_module_progress`
Tracks individual user progress through modules.
```sql
CREATE TABLE user_module_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    module_id UUID REFERENCES content_modules(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started' 
        CHECK (status IN ('not_started', 'in_progress', 'completed', 'locked')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    time_spent_minutes INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `progression_rules`
Defines rules for content unlocking and progression.
```sql
CREATE TABLE progression_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES content_modules(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN (
        'score_threshold', 'conversation_requirement', 'time_gate', 'prerequisite'
    )),
    parameters JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `conversation_engagement`
Tracks conversation sessions and engagement metrics.
```sql
CREATE TABLE conversation_engagement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    module_id UUID REFERENCES content_modules(id) ON DELETE CASCADE,
    session_data JSONB NOT NULL,
    engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
    turns_count INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🛠️ Setup Instructions

### 1. Database Setup

```bash
# Run the progression system migration
psql -d your_database -f database/migrations/010_add_progression_system.sql
```

### 2. Environment Configuration

Add the following environment variables:

```env
# OpenAI API for text simplification
OPENAI_API_KEY=your_openai_api_key

# Supabase configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Install Dependencies

```bash
npm install openai
# or
yarn add openai
```

### 4. Component Integration

Add the content delivery system to your main application:

```jsx
import ContentDeliverySystem from './components/ContentDelivery';

function App() {
  return (
    <div className="App">
      <ContentDeliverySystem />
    </div>
  );
}
```

## 📚 Usage Examples

### Basic Module Creation

```javascript
import progressionService from './services/progressionService';

// Create a new learning module
const newModule = {
  title: "Spanish Greetings",
  description: "Learn basic Spanish greetings and introductions",
  language: "spanish",
  level: 1,
  content: {
    sections: [
      {
        title: "Common Greetings",
        content: "Hola means hello in Spanish...",
        type: "text"
      },
      {
        title: "Practice Exercise",
        content: "Complete the following sentences...",
        type: "exercise"
      }
    ]
  },
  estimatedDuration: 30,
  tags: ["greetings", "beginner", "vocabulary"]
};

// Initialize user progression
await progressionService.initializeUserProgression(userId);
```

### Text Simplification

```javascript
import textSimplificationService from './services/textSimplificationService';

// Simplify text for different proficiency levels
const originalText = "The implementation of sustainable development requires comprehensive policy frameworks.";

const simplifiedText = await textSimplificationService.simplifyText(
  originalText,
  'A2', // Target CEFR level
  {
    preserveKeyTerms: ['sustainable development'],
    maxLength: 100
  }
);

console.log(simplifiedText);
// Output: "Making sustainable development work needs good rules and plans."
```

### Progression Rule Configuration

```javascript
// Set up a score threshold rule
const scoreRule = {
  moduleId: 'module-uuid',
  ruleType: 'score_threshold',
  parameters: {
    minimumScore: 80,
    attempts: 3
  }
};

// Set up a conversation requirement
const conversationRule = {
  moduleId: 'module-uuid',
  ruleType: 'conversation_requirement',
  parameters: {
    minTurns: 10,
    minDuration: 300, // 5 minutes
    minEngagement: 75
  }
};

// Apply rules
await progressionService.createProgressionRule(scoreRule);
await progressionService.createProgressionRule(conversationRule);
```

### Conversation Tracking

```javascript
import conversationEngagementService from './services/conversationEngagementService';

// Start a conversation session
const session = await conversationEngagementService.startSession(
  userId,
  moduleId,
  {
    topic: 'travel',
    aiPartner: { name: 'Sofia', personality: 'friendly' },
    requirements: { minTurns: 10, minEngagement: 80 }
  }
);

// Record conversation turns
await conversationEngagementService.recordTurn(
  session.id,
  "I love traveling to new countries!",
  {
    wordCount: 7,
    vocabularyDiversity: 85,
    grammarScore: 90,
    topicRelevance: 95
  }
);

// End session
const finalStats = await conversationEngagementService.endSession(
  session.id,
  { completed: true, requirementsMet: true }
);
```

## 🎯 Progression Rules

### Rule Types

1. **Score Threshold**
   ```json
   {
     "ruleType": "score_threshold",
     "parameters": {
       "minimumScore": 80,
       "attempts": 3,
       "skillAreas": ["reading", "writing"]
     }
   }
   ```

2. **Conversation Requirement**
   ```json
   {
     "ruleType": "conversation_requirement",
     "parameters": {
       "minTurns": 15,
       "minDuration": 600,
       "minEngagement": 75,
       "topics": ["travel", "food"]
     }
   }
   ```

3. **Time Gate**
   ```json
   {
     "ruleType": "time_gate",
     "parameters": {
       "delayHours": 24,
       "reason": "spaced_repetition"
     }
   }
   ```

4. **Prerequisite**
   ```json
   {
     "ruleType": "prerequisite",
     "parameters": {
       "requiredModules": ["module-1-uuid", "module-2-uuid"],
       "minimumScore": 70
     }
   }
   ```

## 📊 Analytics & Metrics

### User Progress Metrics
- **Completion Rate**: Percentage of modules completed
- **Average Score**: Mean score across all completed assessments
- **Time Efficiency**: Actual vs. estimated completion times
- **Engagement Score**: Conversation participation and quality metrics
- **Learning Velocity**: Modules completed per time period

### System Metrics
- **Content Effectiveness**: Module completion rates and user feedback
- **Progression Bottlenecks**: Modules with high dropout rates
- **Engagement Patterns**: Peak usage times and session durations
- **Simplification Usage**: Text adaptation frequency and effectiveness

### Conversation Analytics
- **Turn Analysis**: Average turns per session, response lengths
- **Vocabulary Tracking**: Unique words used, complexity progression
- **Grammar Assessment**: Error patterns and improvement trends
- **Topic Engagement**: Relevance scores and topic preferences

## 🔧 Configuration Options

### Text Simplification Settings

```javascript
const simplificationConfig = {
  // AI model settings
  model: 'gpt-3.5-turbo',
  temperature: 0.3,
  maxTokens: 500,
  
  // Caching settings
  cacheEnabled: true,
  cacheExpiry: 86400, // 24 hours
  
  // Quality thresholds
  minQualityScore: 0.7,
  maxSimplificationAttempts: 3,
  
  // Fallback settings
  enableRuleBasedFallback: true,
  preserveKeyTerms: true
};
```

### Progression System Settings

```javascript
const progressionConfig = {
  // Default requirements
  defaultScoreThreshold: 70,
  defaultConversationTurns: 10,
  defaultEngagementScore: 75,
  
  // Timing settings
  sessionTimeout: 3600, // 1 hour
  progressSaveInterval: 30, // 30 seconds
  
  // Unlocking behavior
  autoUnlockEnabled: true,
  previewLockedContent: false,
  
  // Retry settings
  maxAttempts: 3,
  retryDelay: 300 // 5 minutes
};
```

## 🚨 Error Handling

The system includes comprehensive error handling:

```javascript
try {
  await progressionService.startModule(moduleId);
} catch (error) {
  if (error.code === 'MODULE_LOCKED') {
    // Handle locked module
    showUnlockRequirements(error.requirements);
  } else if (error.code === 'INSUFFICIENT_SCORE') {
    // Handle score requirements
    showScoreRequirement(error.minimumScore);
  } else {
    // Handle general errors
    showErrorMessage('Failed to start module. Please try again.');
  }
}
```

## 🔒 Security Considerations

- **Row Level Security (RLS)**: All database tables include RLS policies
- **User Isolation**: Users can only access their own progress data
- **API Rate Limiting**: Text simplification includes rate limiting
- **Input Validation**: All user inputs are validated and sanitized
- **Audit Logging**: All progression events are logged for monitoring

## 🧪 Testing

### Unit Tests
```bash
# Run progression service tests
npm test progressionService

# Run text simplification tests
npm test textSimplificationService

# Run conversation engagement tests
npm test conversationEngagementService
```

### Integration Tests
```bash
# Test complete user journey
npm test integration/userProgression

# Test admin functionality
npm test integration/adminInterface
```

## 📈 Performance Optimization

### Database Optimization
- Indexes on frequently queried columns
- Partitioning for large conversation data
- Connection pooling for high concurrency

### Caching Strategy
- Redis caching for simplified text
- Browser caching for static content
- CDN integration for media assets

### API Optimization
- Request batching for bulk operations
- Pagination for large datasets
- Compression for API responses

## 🔄 Migration Guide

### From Existing Systems

1. **Export existing user data**
2. **Map to new schema structure**
3. **Run migration scripts**
4. **Validate data integrity**
5. **Update application integration**

### Version Updates

```bash
# Check current version
npm run version:check

# Run migration
npm run migrate:progression

# Verify migration
npm run verify:migration
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation
5. Submit a pull request

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/edlingo.git

# Install dependencies
npm install

# Set up development database
npm run db:setup:dev

# Run development server
npm run dev
```

## 📞 Support

For questions, issues, or feature requests:

- **Documentation**: Check this README and inline code comments
- **Issues**: Create a GitHub issue with detailed description
- **Discussions**: Use GitHub Discussions for general questions
- **Email**: Contact the development team at dev@edlingo.com

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

**Built with ❤️ for language learners worldwide**