-- Create system_settings table for admin configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('site_name', 'EdLingo', 'The name of the application'),
  ('max_file_size', '50MB', 'Maximum file upload size'),
  ('allowed_file_types', 'pdf,doc,docx,txt,jpg,png,gif,mp4,mp3', 'Allowed file types for upload'),
  ('registration_enabled', 'true', 'Whether new user registration is enabled'),
  ('maintenance_mode', 'false', 'Whether the system is in maintenance mode'),
  ('max_storage_per_user', '1GB', 'Maximum storage space per user'),
  ('session_timeout', '24', 'Session timeout in hours'),
  ('backup_frequency', 'daily', 'How often to create backups'),
  ('email_notifications', 'true', 'Whether email notifications are enabled'),
  ('auto_cleanup_days', '30', 'Days after which to cleanup old files')
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Add RLS (Row Level Security) policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read settings
CREATE POLICY "Allow authenticated users to read settings" ON system_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admin users can modify settings
CREATE POLICY "Allow admin users to modify settings" ON system_settings
  FOR ALL USING (public.is_admin());

-- Service role bypass for system operations
CREATE POLICY "Service role bypass system_settings" ON system_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();