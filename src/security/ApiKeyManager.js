import { BaseService } from '../services/BaseService.js';

export class ApiKeyManager extends BaseService {
  constructor() {
    super('ApiKeyManager');
    this.encryptionKey = this.generateEncryptionKey();
  }

  generateEncryptionKey() {
    // In production, use proper key derivation
    return process.env.ENCRYPTION_KEY || 'default-dev-key';
  }

  validateApiKey(apiKey) {
    if (!apiKey) return { valid: false, reason: 'API key is required' };
    if (typeof apiKey !== 'string') return { valid: false, reason: 'API key must be a string' };
    if (apiKey.length < 20) return { valid: false, reason: 'API key too short' };
    if (!apiKey.startsWith('AIza')) return { valid: false, reason: 'Invalid Google API key format' };
    
    return { valid: true };
  }

  maskApiKey(apiKey) {
    if (!apiKey) return 'Not set';
    if (apiKey.length < 12) return '***';
    return apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
  }

  validateEnvironmentSecurity() {
    const issues = [];
    
    // Check for exposed API keys in logs
    if (process.env.NODE_ENV === 'development') {
      issues.push('Development mode - ensure API keys are not logged');
    }
    
    
    
    return {
      secure: issues.length === 0,
      issues,
      recommendations: this.getSecurityRecommendations()
    };
  }

  getSecurityRecommendations() {
    return [
      'Store API keys in environment variables, never in code',
      'Use different API keys for development and production',
      'Implement API key rotation policy',
      'Monitor API key usage for unusual patterns',
      'Set up API key restrictions in Google Cloud Console'
    ];
  }

  rotateApiKey(newApiKey) {
    const validation = this.validateApiKey(newApiKey);
    if (!validation.valid) {
      throw new Error('Invalid API key: ' + validation.reason);
    }
    
    // In production, implement secure storage
    console.log('API key rotation would be implemented here');
    return true;
  }
}