// Browser-compatible Google Drive service using REST API
// This implementation uses OAuth2 for authentication in the browser environment

class GoogleDriveService {
  constructor() {
    this.accessToken = null;
    this.initialized = false;
    this.folderId = null; // Main EdLingo folder ID
    this.apiKey = null;
    this.clientId = null;
  }

  // Initialize with OAuth2 credentials
  async initialize(config = {}) {
    try {
      this.apiKey = config.apiKey || process.env.VITE_GOOGLE_API_KEY;
      this.clientId = config.clientId || process.env.VITE_GOOGLE_CLIENT_ID;
      this.folderId = config.folderId || process.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
      
      if (!this.apiKey || !this.clientId) {
        throw new Error('Google API key and Client ID are required');
      }

      // Load Google API client
      await this.loadGoogleAPI();
      
      this.initialized = true;
      console.log('Google Drive service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Drive service:', error);
      throw error;
    }
  }

  // Load Google API client library
  async loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('auth2:client', resolve);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Authenticate user with Google OAuth2
  async authenticate() {
    try {
      if (!window.gapi) {
        throw new Error('Google API not loaded');
      }

      await window.gapi.client.init({
        apiKey: this.apiKey,
        clientId: this.clientId,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: 'https://www.googleapis.com/auth/drive.file'
      });

      const authInstance = window.gapi.auth2.getAuthInstance();
      
      if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
      }

      const user = authInstance.currentUser.get();
      this.accessToken = user.getAuthResponse().access_token;
      
      console.log('Google Drive authentication successful');
      return true;
    } catch (error) {
      console.error('Google Drive authentication failed:', error);
      throw error;
    }
  }

  // Create a folder in Google Drive
  async createFolder(name, parentId = null) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const metadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined
      };

      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        throw new Error(`Failed to create folder: ${response.statusText}`);
      }

      const folder = await response.json();
      console.log(`Created folder: ${name} (${folder.id})`);
      return folder.id;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  // Create subfolder with caching
  async createSubfolder(name, parentId = null) {
    try {
      const parent = parentId || this.folderId;
      
      // Check if folder already exists
      const existingFolder = await this.findFolder(name, parent);
      if (existingFolder) {
        return existingFolder;
      }

      return await this.createFolder(name, parent);
    } catch (error) {
      console.error('Error creating subfolder:', error);
      throw error;
    }
  }

  // Find a folder by name in a parent folder
  async findFolder(name, parentId) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
      
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to search folders: ${response.statusText}`);
      }

      const result = await response.json();
      return result.files && result.files.length > 0 ? result.files[0].id : null;
    } catch (error) {
      console.error('Error finding folder:', error);
      return null;
    }
  }

  // Upload file to Google Drive
  async uploadFile(file, category, subcategory, itemId) {
    try {
      if (!this.initialized) {
        throw new Error('Google Drive service not initialized');
      }

      if (!this.accessToken) {
        await this.authenticate();
      }

      // Create folder structure
      const categoryFolderId = await this.createSubfolder(category);
      const itemFolderId = await this.createSubfolder(itemId || 'general', categoryFolderId);
      const subcategoryFolderId = await this.createSubfolder(subcategory, itemFolderId);

      // Upload file
      const metadata = {
        name: file.name,
        parents: [subcategoryFolderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: form
      });

      if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.statusText}`);
      }

      const uploadedFile = await response.json();
      
      // Make file publicly readable
      await this.makeFilePublic(uploadedFile.id);
      
      // Generate public URL
      const publicUrl = `https://drive.google.com/file/d/${uploadedFile.id}/view`;
      
      console.log(`File uploaded successfully: ${file.name} (${uploadedFile.id})`);
      
      return {
        id: uploadedFile.id,
        name: uploadedFile.name,
        size: file.size,
        mimeType: file.type,
        url: `https://www.googleapis.com/drive/v3/files/${uploadedFile.id}`,
        publicUrl: publicUrl,
        webViewLink: `https://drive.google.com/file/d/${uploadedFile.id}/view`,
        webContentLink: `https://drive.google.com/uc?id=${uploadedFile.id}`
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Make file publicly readable
  async makeFilePublic(fileId) {
    try {
      const permission = {
        role: 'reader',
        type: 'anyone'
      };

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(permission)
      });

      if (!response.ok) {
        console.warn(`Failed to make file public: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Error making file public:', error);
    }
  }

  // Delete file from Google Drive
  async deleteFile(fileId) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
      }

      console.log(`File deleted successfully: ${fileId}`);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Get file information
  async getFileInfo(fileId) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,size,mimeType,createdTime,modifiedTime,webViewLink,webContentLink`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get file info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  }

  // List files in a folder
  async listFiles(folderId = null, pageSize = 100) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const folder = folderId || this.folderId;
      const query = `'${folder}' in parents and trashed=false`;
      
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=files(id,name,size,mimeType,createdTime,modifiedTime,webViewLink,webContentLink)`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.statusText}`);
      }

      const result = await response.json();
      return result.files || [];
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  // Generate public URL for file
  generatePublicUrl(fileId) {
    return `https://drive.google.com/uc?id=${fileId}`;
  }

  // Check if service is ready
  isReady() {
    return this.initialized && this.accessToken;
  }

  // Sign out
  async signOut() {
    try {
      if (window.gapi && window.gapi.auth2) {
        const authInstance = window.gapi.auth2.getAuthInstance();
        if (authInstance) {
          await authInstance.signOut();
        }
      }
      this.accessToken = null;
      console.log('Signed out from Google Drive');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }
}

// Export singleton instance
const googleDriveService = new GoogleDriveService();
export default googleDriveService;