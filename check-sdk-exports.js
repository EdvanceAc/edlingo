// Check what the new SDK exports
console.log('📦 Checking @google/genai exports...');

try {
  const genai = require('@google/genai');
  console.log('✅ Package loaded');
  console.log('📝 Available exports:', Object.keys(genai));
  console.log('🔍 Full export structure:');
  console.dir(genai, { depth: 2 });
} catch (error) {
  console.log('❌ Error loading package:', error.message);
}
