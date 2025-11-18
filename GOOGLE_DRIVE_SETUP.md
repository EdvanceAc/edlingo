# Google Drive Integration Setup Guide

This guide will help you set up Google Drive integration for file uploads in the EdLingo admin dashboard.

## Prerequisites

- Google Cloud Platform account
- Google Drive API enabled
- Service Account with appropriate permissions

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note down your project ID

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on it and press "Enable"

## Step 3: Create a Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - Name: `edlingo-drive-service`
   - Description: `Service account for EdLingo Google Drive integration`
4. Click "Create and Continue"
5. Grant the service account the "Editor" role (or create a custom role with Drive permissions)
6. Click "Done"

## Step 4: Generate Service Account Key

1. In the "Credentials" page, find your service account
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" > "Create New Key"
5. Select "JSON" format
6. Download the JSON file

## Step 5: Configure the Application

1. Rename the downloaded JSON file to `google-drive-credentials.json`
2. Place it in a secure location (DO NOT commit to version control)
3. Update the path in `src/renderer/config/googleDriveConfig.js`:

```javascript
export const GOOGLE_DRIVE_CONFIG = {
  // ... other config
  SERVICE_ACCOUNT_PATH: 'path/to/your/google-drive-credentials.json'
};
```

## Step 6: Set Up Environment Variables

Create a `.env` file in your project root and add:

```env
# Google Drive Configuration
GOOGLE_DRIVE_SERVICE_ACCOUNT_PATH=path/to/your/google-drive-credentials.json
GOOGLE_DRIVE_FOLDER_ID=your_main_folder_id_here
```

## Step 7: Create Main Folder in Google Drive

1. Go to [Google Drive](https://drive.google.com/)
2. Create a new folder named "EdLingo_Materials"
3. Right-click the folder and select "Share"
4. Add your service account email (found in the JSON file) with "Editor" permissions
5. Copy the folder ID from the URL (the long string after `/folders/`)
6. Update the `MAIN_FOLDER_ID` in your config or environment variables

## Step 8: Database Setup

Run the SQL migration to create the `uploaded_files` table:

```sql
-- Run the contents of database/migrations/create_uploaded_files_table.sql
```

## Step 9: Install Dependencies

Make sure you have the required npm packages:

```bash
npm install googleapis
```

## Step 10: Test the Integration

1. Start your application
2. Go to the Admin Dashboard
3. Navigate to the "File Manager" tab
4. Try uploading a test file
5. Check that the file appears in your Google Drive folder
6. Verify the file metadata is saved in your database

## Security Considerations

1. **Never commit credentials to version control**
2. Store the service account JSON file securely
3. Use environment variables for sensitive configuration
4. Regularly rotate service account keys
5. Monitor Google Drive API usage and quotas
6. Implement proper error handling and logging

## Folder Structure

The integration will create the following folder structure in Google Drive:

```
EdLingo_Materials/
├── courses/
│   ├── general/
│   ├── [course_id]/
│   └── ...
├── assignments/
│   ├── general/
│   ├── [assignment_id]/
│   └── ...
└── shared_resources/
    ├── general/
    ├── images/
    ├── videos/
    ├── audio/
    └── documents/
```

## Supported File Types

- **Documents**: PDF, DOC, DOCX, TXT, RTF
- **Images**: JPG, JPEG, PNG, GIF, BMP, WEBP, SVG
- **Videos**: MP4, AVI, MOV, WMV, FLV, WEBM, MKV
- **Audio**: MP3, WAV, AAC, OGG, FLAC, M4A
- **Archives**: ZIP, RAR, 7Z
- **Presentations**: PPT, PPTX
- **Spreadsheets**: XLS, XLSX, CSV

## File Size Limits

- Maximum file size: 100MB per file
- Total storage depends on your Google Drive quota

## Troubleshooting

### Common Issues:

1. **"Access denied" errors**
   - Ensure the service account has proper permissions
   - Check that the main folder is shared with the service account

2. **"File not found" errors**
   - Verify the main folder ID is correct
   - Ensure the folder exists and is accessible

3. **"Quota exceeded" errors**
   - Check your Google Drive storage quota
   - Monitor API usage limits

4. **Upload failures**
   - Check file size limits
   - Verify file type is supported
   - Check network connectivity

### Debug Mode:

Enable debug logging by setting:

```javascript
const DEBUG_MODE = true; // in googleDriveService.js
```

## API Quotas and Limits

- **Queries per day**: 1,000,000,000
- **Queries per 100 seconds per user**: 1,000
- **Queries per 100 seconds**: 10,000

For production use, consider implementing:
- Request batching
- Exponential backoff for retries
- Caching mechanisms
- Rate limiting

## Support

For issues related to:
- Google Drive API: [Google Drive API Documentation](https://developers.google.com/drive/api)
- Service Accounts: [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- EdLingo Integration: Check the application logs and error messages