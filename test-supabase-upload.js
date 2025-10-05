const fs = require('fs');
const path = require('path');

async function testSupabaseUpload() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials in environment variables.');
      return;
    }

    const supabaseStorageService = (await import('./src/renderer/services/supabaseStorageService.js')).default;

    const testContent = 'This is a test file for Supabase Storage.';
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, testContent);

    const fileBuffer = fs.readFileSync(testFilePath);
    const file = new Blob([fileBuffer], { type: 'text/plain' });
    file.name = 'test-file.txt';

    const result = await supabaseStorageService.uploadFile(file, 'course-materials', 'test', { contentType: 'text/plain' });

    console.log('✅ Upload successful!', result);

    fs.unlinkSync(testFilePath);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

testSupabaseUpload();