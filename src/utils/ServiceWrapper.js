/**
 * Service Wrapper for handling API failures gracefully
 * Provides fallback mechanisms and user-friendly error messages
 */

class ServiceWrapper {
  static async withFallback(primaryOperation, fallbackOperation, serviceName) {
    try {
      const result = await primaryOperation();
      console.log(`✅ ${serviceName} service working`);
      return { success: true, data: result, source: 'primary' };
    } catch (error) {
      console.warn(`⚠️ ${serviceName} primary failed, using fallback:`, error.message);
      
      try {
        const fallbackResult = await fallbackOperation();
        return { success: true, data: fallbackResult, source: 'fallback' };
      } catch (fallbackError) {
        console.error(`❌ ${serviceName} completely failed:`, fallbackError.message);
        return { 
          success: false, 
          error: `${serviceName} unavailable: ${error.message}`,
          source: 'none'
        };
      }
    }
  }

  static createUserFriendlyMessage(error, serviceName) {
    const errorMessages = {
      403: `🔒 ${serviceName} access denied. Please check your API configuration.`,
      429: `⏱️ ${serviceName} rate limited. Please wait a moment.`,
      'fetch failed': `🌐 Network issue connecting to ${serviceName}. Check your internet connection.`,
      'ENOTFOUND': `🔍 Cannot reach ${serviceName} servers. Please check your network.`
    };

    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.includes(key) || error.includes(key.toString())) {
        return message;
      }
    }

    return `❌ ${serviceName} temporarily unavailable. Please try again later.`;
  }

  static async retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
}

module.exports = ServiceWrapper;