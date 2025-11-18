import React, { useState, useRef } from 'react';
import { Upload, X, File, Image, Video, Music, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { validateFile, getFileCategory, GOOGLE_DRIVE_CONFIG } from '../config/googleDriveConfig.js';
import AdminService from '../services/adminService.js';

const FileUpload = ({ 
  category = 'shared_resources', 
  subcategory = null, 
  onUploadComplete = () => {}, 
  onUploadError = () => {},
  multiple = true,
  className = ''
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const getFileIcon = (fileName) => {
    const fileCategory = getFileCategory(fileName);
    switch (fileCategory) {
      case 'images': return <Image className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      case 'pdfs': return <FileText className="w-5 h-5" />;
      default: return <File className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = (newFiles) => {
    const validatedFiles = newFiles.map(file => {
      const validation = validateFile(file);
      return {
        file,
        id: Math.random().toString(36).substr(2, 9),
        validation,
        status: validation.isValid ? 'ready' : 'invalid'
      };
    });

    if (multiple) {
      setFiles(prev => [...prev, ...validatedFiles]);
    } else {
      setFiles(validatedFiles.slice(0, 1));
    }
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadFiles = async () => {
    const validFiles = files.filter(f => f.validation.isValid);
    if (validFiles.length === 0) {
      onUploadError('No valid files to upload');
      return;
    }

    setUploading(true);
    setUploadResults([]);

    try {
      const fileObjects = validFiles.map(f => f.file);
      let results;

      if (category === 'courses') {
        results = await AdminService.uploadCourseFiles(fileObjects, null, subcategory);
      } else if (category === 'assignments') {
        results = await AdminService.uploadAssignmentFiles(fileObjects, null, subcategory);
      } else {
        // Upload individual files
        const uploadPromises = fileObjects.map(file => 
          AdminService.uploadFileToGoogleDrive(file, category, subcategory)
        );
        
        const settledResults = await Promise.allSettled(uploadPromises);
        
        results = {
          successful: [],
          failed: []
        };
        
        settledResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.successful.push({
              file: fileObjects[index].name,
              ...result.value
            });
          } else {
            results.failed.push({
              file: fileObjects[index].name,
              error: result.reason.message
            });
          }
        });
      }

      setUploadResults(results);
      
      if (results.successful.length > 0) {
        onUploadComplete(results);
        // Clear successful files
        const successfulFileNames = results.successful.map(r => r.file);
        setFiles(prev => prev.filter(f => !successfulFileNames.includes(f.file.name)));
      }
      
      if (results.failed.length > 0) {
        onUploadError(`${results.failed.length} files failed to upload`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setUploadResults([]);
  };

  return (
    <div className={`file-upload-container ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drag and drop files here, or{' '}
          <button
            type="button"
            className="text-blue-600 hover:text-blue-700 underline"
            onClick={() => fileInputRef.current?.click()}
          >
            browse
          </button>
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supported: PDF, Images (JPG, PNG, GIF), Videos (MP4, WebM), Audio (MP3, WAV), Documents
        </p>
        <div className="text-xs text-gray-400">
          <p>Max file sizes: PDF (50MB), Audio (100MB), Video (500MB), Images (10MB), Documents (25MB)</p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          className="hidden"
          onChange={handleFileInput}
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.webm,.ogg,.avi,.mov,.mp3,.wav,.ogg,.m4a,.aac,.doc,.docx,.txt,.rtf"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Selected Files ({files.length})
            </h3>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-2">
            {files.map((fileItem) => (
              <div
                key={fileItem.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  fileItem.validation.isValid 
                    ? 'border-gray-200 bg-gray-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(fileItem.file.name)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {fileItem.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(fileItem.file.size)}
                    </p>
                    {!fileItem.validation.isValid && (
                      <div className="flex items-center space-x-1 mt-1">
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        <p className="text-xs text-red-600">
                          {fileItem.validation.errors.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => removeFile(fileItem.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          
          {/* Upload Button */}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={uploadFiles}
              disabled={uploading || files.filter(f => f.validation.isValid).length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload to Google Drive</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Upload Results */}
      {uploadResults.successful?.length > 0 && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h4 className="text-sm font-medium text-green-800">
              Successfully Uploaded ({uploadResults.successful.length})
            </h4>
          </div>
          <ul className="text-sm text-green-700 space-y-1">
            {uploadResults.successful.map((result, index) => (
              <li key={index} className="flex items-center justify-between">
                <span>{result.file}</span>
                {result.public_url && (
                  <a
                    href={result.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-xs underline"
                  >
                    View
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploadResults.failed?.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h4 className="text-sm font-medium text-red-800">
              Failed Uploads ({uploadResults.failed.length})
            </h4>
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {uploadResults.failed.map((result, index) => (
              <li key={index}>
                <span className="font-medium">{result.file}:</span> {result.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;