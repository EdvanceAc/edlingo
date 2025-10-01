export interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: {
    size: number;
    mimetype: string;
    cacheControl: string;
  };
}

export interface UploadResult {
  data?: {
    path: string;
    id: string;
    fullPath: string;
  };
  error?: Error;
}

export class SupabaseStorageService {
  buckets: {
    courses: string;
    assignments: string;
    shared: string;
  };

  constructor();
  getStorageAdminClient(): any;
  ensureBucket(bucketName: string): Promise<boolean>;
  uploadFile(file: File, path: string, bucketName?: string): Promise<UploadResult>;
  deleteFile(path: string, bucketName?: string): Promise<{ error?: Error }>;
  listFiles(path?: string, bucketName?: string): Promise<{ data?: StorageFile[]; error?: Error }>;
  getPublicUrl(path: string, bucketName?: string): { data: { publicUrl: string } };
  downloadFile(path: string, bucketName?: string): Promise<{ data?: Blob; error?: Error }>;
  moveFile(fromPath: string, toPath: string, bucketName?: string): Promise<{ error?: Error }>;
  copyFile(fromPath: string, toPath: string, bucketName?: string): Promise<{ error?: Error }>;
  createSignedUrl(path: string, expiresIn?: number, bucketName?: string): Promise<{ data?: { signedUrl: string }; error?: Error }>;
  updateFile(file: File, path: string, bucketName?: string): Promise<UploadResult>;
  getFileInfo(path: string, bucketName?: string): Promise<{ data?: StorageFile; error?: Error }>;
}

declare const supabaseStorageService: SupabaseStorageService;
export default supabaseStorageService;