/**
 * Service Health Monitoring System
 * Monitors the health of various services and provides status information
 */

class ServiceHealthMonitor {
  constructor(options = {}) {
    this.services = new Map();
    this.healthCheckInterval = options.interval || 30000; // 30 seconds default
    this.maxConsecutiveFailures = options.maxFailures || 3;
    this.isMonitoring = false;
    this.intervalId = null;
    this.listeners = new Set();
  }

  /**
   * Register a service for health monitoring
   * @param {string} name - Service name
   * @param {Function} healthCheckFn - Function that returns Promise<boolean>
   * @param {Object} options - Additional options
   */
  registerService(name, healthCheckFn, options = {}) {
    this.services.set(name, {
      name,
      healthCheck: healthCheckFn,
      lastCheck: null,
      status: 'unknown',
      consecutiveFailures: 0,
      lastError: null,
      options: {
        critical: options.critical || false,
        timeout: options.timeout || 5000,
        retryDelay: options.retryDelay || 1000
      }
    });
    
    console.log(`📋 Registered service for monitoring: ${name}`);
  }

  /**
   * Unregister a service
   * @param {string} name - Service name
   */
  unregisterService(name) {
    if (this.services.delete(name)) {
      console.log(`📋 Unregistered service: ${name}`);
    }
  }

  /**
   * Check health of a specific service
   * @param {string} name - Service name
   * @returns {Promise<Object>} Health check result
   */
  async checkService(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }

    const startTime = Date.now();
    
    try {
      // Add timeout to health check
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), service.options.timeout);
      });
      
      const healthPromise = service.healthCheck();
      const isHealthy = await Promise.race([healthPromise, timeoutPromise]);
      
      const responseTime = Date.now() - startTime;
      
      service.status = isHealthy ? 'healthy' : 'unhealthy';
      service.consecutiveFailures = isHealthy ? 0 : service.consecutiveFailures + 1;
      service.lastCheck = new Date();
      service.lastError = null;
      service.responseTime = responseTime;
      
      return {
        name,
        status: service.status,
        lastCheck: service.lastCheck,
        consecutiveFailures: service.consecutiveFailures,
        responseTime,
        healthy: isHealthy
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      service.status = 'error';
      service.consecutiveFailures++;
      service.lastCheck = new Date();
      service.lastError = error.message;
      service.responseTime = responseTime;
      
      return {
        name,
        status: 'error',
        lastCheck: service.lastCheck,
        consecutiveFailures: service.consecutiveFailures,
        responseTime,
        error: error.message,
        healthy: false
      };
    }
  }

  /**
   * Check health of all registered services
   * @returns {Promise<Object>} Health check results for all services
   */
  async checkAllServices() {
    const results = {};
    const promises = [];
    
    for (const [name] of this.services) {
      promises.push(
        this.checkService(name)
          .then(result => ({ name, result }))
          .catch(error => ({ name, result: { error: error.message, healthy: false } }))
      );
    }
    
    const serviceResults = await Promise.all(promises);
    
    serviceResults.forEach(({ name, result }) => {
      results[name] = result;
    });
    
    // Notify listeners
    this.notifyListeners(results);
    
    return results;
  }

  /**
   * Get current status of all services
   * @returns {Object} Current service statuses
   */
  getStatus() {
    const status = {};
    
    for (const [name, service] of this.services) {
      status[name] = {
        name,
        status: service.status,
        lastCheck: service.lastCheck,
        consecutiveFailures: service.consecutiveFailures,
        lastError: service.lastError,
        responseTime: service.responseTime,
        critical: service.options.critical
      };
    }
    
    return status;
  }

  /**
   * Start monitoring services
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.warn('Service monitoring is already running');
      return;
    }
    
    this.isMonitoring = true;
    
    // Initial check
    this.checkAllServices();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkAllServices();
    }, this.healthCheckInterval);
    
    console.log(`🏥 Started service health monitoring (interval: ${this.healthCheckInterval}ms)`);
  }

  /**
   * Stop monitoring services
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('🏥 Stopped service health monitoring');
  }

  /**
   * Add a listener for health status changes
   * @param {Function} listener - Callback function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove a listener
   * @param {Function} listener - Callback function
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of status changes
   * @param {Object} results - Health check results
   */
  notifyListeners(results) {
    this.listeners.forEach(listener => {
      try {
        listener(results);
      } catch (error) {
        console.error('Error in health monitor listener:', error);
      }
    });
  }

  /**
   * Get overall system health
   * @returns {Object} Overall health status
   */
  getOverallHealth() {
    const services = this.getStatus();
    const serviceNames = Object.keys(services);
    
    if (serviceNames.length === 0) {
      return { status: 'unknown', message: 'No services registered' };
    }
    
    const healthyServices = serviceNames.filter(name => services[name].status === 'healthy');
    const criticalServices = serviceNames.filter(name => services[name].critical);
    const unhealthyCriticalServices = criticalServices.filter(name => services[name].status !== 'healthy');
    
    if (unhealthyCriticalServices.length > 0) {
      return {
        status: 'critical',
        message: `Critical services unhealthy: ${unhealthyCriticalServices.join(', ')}`,
        healthyCount: healthyServices.length,
        totalCount: serviceNames.length
      };
    }
    
    if (healthyServices.length === serviceNames.length) {
      return {
        status: 'healthy',
        message: 'All services are healthy',
        healthyCount: healthyServices.length,
        totalCount: serviceNames.length
      };
    }
    
    return {
      status: 'degraded',
      message: `${healthyServices.length}/${serviceNames.length} services healthy`,
      healthyCount: healthyServices.length,
      totalCount: serviceNames.length
    };
  }
}

// Create singleton instance
const healthMonitor = new ServiceHealthMonitor();

export default healthMonitor;
export { ServiceHealthMonitor };
