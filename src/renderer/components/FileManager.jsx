import React, { useState, useEffect } from 'react';
import { 
  File, 
  Image, 
  Video, 
  Music, 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  Search,
  Filter,
  Folder,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import AdminService from '../services/adminService.js';
import { getFileCategory } from '../config/googleDriveConfig.js';
import { useToast } from '../hooks/use-toast';

const FileManager = ({ category = null, subcategory = null, className = '' }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const [selectedSubcategory, setSelectedSubcategory] = useState(subcategory || 'all');
  const [filesByCategory, setFilesByCategory] = useState({});
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [sortBy, setSortBy] = useState('uploaded_at'); // 'name', 'size', 'uploaded_at'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  useEffect(() => {
    loadFiles();
    loadFilesByCategory();
  }, [selectedCategory, selectedSubcategory]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const categoryFilter = selectedCategory === 'all' ? null : selectedCategory;
      const subcategoryFilter = selectedSubcategory === 'all' ? null : selectedSubcategory;
      
      const data = await AdminService.getUploadedFiles(categoryFilter, subcategoryFilter);
      setFiles(data);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilesByCategory = async () => {
    try {
      const data = await AdminService.getFilesByCategory();
      setFilesByCategory(data);
    } catch (error) {
      console.error('Error loading files by category:', error);
    }
  };

  const getFileIcon = (fileName, size = 'w-5 h-5') => {
    const fileCategory = getFileCategory(fileName);
    const iconClass = `${size} text-gray-600`;
    
    switch (fileCategory) {
      case 'images': return <Image className={iconClass} />;
      case 'video': return <Video className={iconClass} />;
      case 'audio': return <Music className={iconClass} />;
      case 'pdfs': return <FileText className={iconClass} />;
      default: return <File className={iconClass} />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const { error: toastError } = useToast();

  const filteredFiles = files
    .filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.subcategory.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'name') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const categories = ['all', ...new Set(files.map(f => f.category))];
  const subcategories = selectedCategory === 'all' 
    ? ['all', ...new Set(files.map(f => f.subcategory))]
    : ['all', ...new Set(files.filter(f => f.category === selectedCategory).map(f => f.subcategory))];

  return (
    <div className={`file-manager ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">File Manager</h2>
          <p className="text-gray-600">Manage uploaded files from Google Drive</p>
        </div>
        
        <button
          onClick={() => { loadFiles(); loadFilesByCategory(); }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedSubcategory('all');
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>

          {/* Subcategory Filter */}
          <select
            value={selectedSubcategory}
            onChange={(e) => setSelectedSubcategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {subcategories.map(subcat => (
              <option key={subcat} value={subcat}>
                {subcat === 'all' ? 'All Subcategories' : subcat.charAt(0).toUpperCase() + subcat.slice(1)}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="uploaded_at-desc">Newest First</option>
            <option value="uploaded_at-asc">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="size-desc">Largest First</option>
            <option value="size-asc">Smallest First</option>
          </select>
        </div>
      </div>

      {/* File Statistics */}
      {Object.keys(filesByCategory).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {Object.entries(filesByCategory).map(([category, subcats]) => {
            const totalFiles = Object.values(subcats).reduce((sum, subcat) => sum + subcat.count, 0);
            const totalSize = Object.values(subcats).reduce((sum, subcat) => sum + subcat.totalSize, 0);
            
            return (
              <div key={category} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Folder className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900 capitalize">{category}</h3>
                </div>
                <p className="text-sm text-gray-600">{totalFiles} files</p>
                <p className="text-sm text-gray-600">{formatFileSize(totalSize)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Files List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <File className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search terms' : 'Upload some files to get started'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.name)}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {file.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {file.mime_type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{file.category}</div>
                      <div className="text-sm text-gray-500 capitalize">{file.subcategory}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(file.uploaded_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {file.public_url && (
                          <a
                            href={file.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                            title="View file"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        )}
                        
                        {file.direct_download_url && (
                          <a
                            href={file.direct_download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700"
                            title="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {!loading && filteredFiles.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredFiles.length} of {files.length} files
        </div>
      )}
    </div>
  );
};

export default FileManager;