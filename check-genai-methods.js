const { GoogleGenAI } = require('@google/genai');

console.log('🔍 Checking GoogleGenAI methods...');

try {
  const genAI = new GoogleGenAI('test-key');
  console.log('✅ GoogleGenAI instantiated');
  console.log('📝 Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(genAI)));
  console.log('📝 Static methods:', Object.getOwnPropertyNames(GoogleGenAI));
  
  // Check if it has models property
  console.log('🔍 Has models property:', 'models' in genAI);
  console.log('🔍 genAI.models:', genAI.models);
  
  // Check available properties
  console.log('🔍 All properties:', Object.keys(genAI));
  
} catch (error) {
  console.log('❌ Error:', error.message);
}
