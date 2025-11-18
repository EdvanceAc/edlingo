export class BaseService {
  constructor(name) {
    this.serviceName = name;
    this.isHealthy = true;
    this.lastError = null;
  }

  async executeWithRetry(operation, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await operation();
        this.isHealthy = true;
        this.lastError = null;
        return result;
      } catch (error) {
        this.lastError = error;
        this.isHealthy = false;
        
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  getHealthStatus() {
    return {
      service: this.serviceName,
      healthy: this.isHealthy,
      lastError: this.lastError?.message,
      timestamp: new Date().toISOString()
    };
  }
}