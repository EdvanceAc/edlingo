/**
 * Health Monitor for tracking service status
 * Provides real-time monitoring and status reporting
 */

class HealthMonitor {
  constructor() {
    this.services = new Map();
    this.lastCheck = null;
    this.checkInterval = 30000; // 30 seconds
    this.isMonitoring = false;
  }

  registerService(name, service) {
    this.services.set(name, service);
    console.log(`📋 Registered service: ${name}`);
  }

  async checkAllServices() {
    const results = {};
    const timestamp = new Date().toISOString();
    
    console.log('🔍 Running health check...');
    
    for (const [name, service] of this.services) {
      try {
        if (typeof service.healthCheck === 'function') {
          const health = await service.healthCheck();
          results[name] = { ...health, timestamp };
          
          const status = health.status === 'healthy' ? '✅' : '❌';
          console.log(`${status} ${name}: ${health.status}`);
        } else {
          results[name] = { status: 'unknown', error: 'No health check method' };
          console.log(`⚠️ ${name}: No health check available`);
        }
      } catch (error) {
        results[name] = { 
          status: 'error', 
          error: error.message,
          timestamp
        };
        console.log(`❌ ${name}: ${error.message}`);
      }
    }
    
    this.lastCheck = { timestamp, results };
    return results;
  }

  startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ Health monitoring already running');
      return;
    }

    this.checkAllServices(); // Initial check
    
    this.monitoringInterval = setInterval(() => {
      this.checkAllServices();
    }, this.checkInterval);
    
    this.isMonitoring = true;
    console.log(`🔄 Health monitoring started (${this.checkInterval/1000}s interval)`);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.isMonitoring = false;
      console.log('⏹️ Health monitoring stopped');
    }
  }

  getLastResults() {
    return this.lastCheck;
  }

  getServiceStatus(serviceName) {
    if (!this.lastCheck) return null;
    return this.lastCheck.results[serviceName] || null;
  }

  getOverallHealth() {
    if (!this.lastCheck) return 'unknown';
    
    const statuses = Object.values(this.lastCheck.results);
    const healthyCount = statuses.filter(s => s.status === 'healthy').length;
    const totalCount = statuses.length;
    
    if (healthyCount === totalCount) return 'healthy';
    if (healthyCount > 0) return 'degraded';
    return 'unhealthy';
  }
}

module.exports = new HealthMonitor();