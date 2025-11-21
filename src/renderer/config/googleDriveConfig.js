// Google Drive Configuration
// This file contains configuration settings for Google Drive integration

export const GOOGLE_DRIVE_CONFIG = {
  // Folder structure configuration
  MAIN_FOLDER_NAME: 'EdLingo_Materials',
  
  // Category folders
  CATEGORIES: {
    COURSES: 'courses',
    ASSIGNMENTS: 'assignments',
    SHARED_RESOURCES: 'shared_resources'
  },
  
  // File type categories
  FILE_CATEGORIES: {
    PDF: 'pdfs',
    AUDIO: 'audio',
    VIDEO: 'video',
    IMAGES: 'images',
    DOCUMENTS: 'documents'
  },
  
  // Supported file types
  SUPPORTED_TYPES: {
    PDF: ['.pdf'],
    AUDIO: ['.mp3', '.wav', '.ogg', '.m4a', '.aac'],
    VIDEO: ['.mp4', '.webm', '.ogg', '.avi', '.mov'],
    IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    DOCUMENTS: ['.doc', '.docx', '.txt', '.rtf']
  },
  
  // File size limits (in bytes)
  MAX_FILE_SIZE: {
    PDF: 50 * 1024 * 1024, // 50MB
    AUDIO: 100 * 1024 * 1024, // 100MB
    VIDEO: 500 * 1024 * 1024, // 500MB
    IMAGES: 10 * 1024 * 1024, // 10MB
    DOCUMENTS: 25 * 1024 * 1024 // 25MB
  },
  
  // Google Drive API scopes
  SCOPES: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file'
  ],
  
  // Permission settings
  PERMISSIONS: {
    PUBLIC_READ: {
      role: 'reader',
      type: 'anyone'
    },
    TEACHER_EDIT: {
      role: 'writer',
      type: 'user'
    }
  }
};

// Helper functions
export const getFileCategory = (fileName) => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  for (const [category, extensions] of Object.entries(GOOGLE_DRIVE_CONFIG.SUPPORTED_TYPES)) {
    if (extensions.includes(extension)) {
      return GOOGLE_DRIVE_CONFIG.FILE_CATEGORIES[category];
    }
  }
  
  return GOOGLE_DRIVE_CONFIG.FILE_CATEGORIES.DOCUMENTS; // Default
};

export const isFileTypeSupported = (fileName) => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  return Object.values(GOOGLE_DRIVE_CONFIG.SUPPORTED_TYPES)
    .some(extensions => extensions.includes(extension));
};

export const getMaxFileSize = (fileName) => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  for (const [category, extensions] of Object.entries(GOOGLE_DRIVE_CONFIG.SUPPORTED_TYPES)) {
    if (extensions.includes(extension)) {
      return GOOGLE_DRIVE_CONFIG.MAX_FILE_SIZE[category];
    }
  }
  
  return GOOGLE_DRIVE_CONFIG.MAX_FILE_SIZE.DOCUMENTS; // Default
};

export const validateFile = (file) => {
  const errors = [];
  
  // Check if file type is supported
  if (!isFileTypeSupported(file.name)) {
    errors.push(`File type not supported: ${file.name}`);
  }
  
  // Check file size
  const maxSize = getMaxFileSize(file.name);
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    errors.push(`File too large: ${file.name} (max ${maxSizeMB}MB)`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Service account credentials template
// Note: In production, these should be stored securely (environment variables, encrypted storage, etc.)
export const CREDENTIALS_TEMPLATE = {
  // This is a template - replace with actual service account credentials
  type: "service_account",
  project_id: "your-project-id",
  private_key_id: "your-private-key-id",
  private_key: "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
  client_email: "your-service-account@your-project-id.iam.gserviceaccount.com",
  client_id: "your-client-id",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project-id.iam.gserviceaccount.com"
};

// Instructions for setting up Google Drive API
export const SETUP_INSTRUCTIONS = `
Google Drive API Setup Instructions:

1. Go to Google Cloud Console (https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Drive API:
   - Go to APIs & Services > Library
   - Search for "Google Drive API"
   - Click "Enable"

4. Create Service Account:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "Service Account"
   - Fill in service account details
   - Click "Create and Continue"
   - Grant roles: "Editor" or "Owner"
   - Click "Done"

5. Generate Key:
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Select "JSON" format
   - Download the key file

6. Configure Application:
   - Copy the downloaded JSON content
   - Replace CREDENTIALS_TEMPLATE with actual credentials
   - Store credentials securely (environment variables recommended)

7. Share Drive Folder (Optional):
   - Share the main EdLingo folder with the service account email
   - Grant "Editor" permissions

Security Notes:
- Never commit credentials to version control
- Use environment variables in production
- Regularly rotate service account keys
- Monitor API usage and set quotas
`;