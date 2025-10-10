/**
 * Network connectivity utilities for EdLingo
 * Provides network status checking and connection validation
 */

class NetworkUtils {
  constructor() {
    this.isOnline = navigator.onLine;
    this.connectionType = this.getConnectionType();
    this.listeners = [];
    
    // Set up network event listeners
    this.setupNetworkListeners();
  }

  /**
   * Check if the device is currently online
   * @returns {boolean} True if online, false otherwise
   */
  isConnected() {
    return navigator.onLine;
  }

  /**
   * Get the current connection type
   * @returns {string} Connection type (wifi, cellular, ethernet, etc.)
   */
  getConnectionType() {
    if ('connection' in navigator) {
      return navigator.connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Test actual internet connectivity by making a lightweight request
   * @param {number} timeout - Timeout in milliseconds (default: 5000)
   * @returns {Promise<boolean>} True if internet is accessible
   */
  async testInternetConnectivity(timeout = 5000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Use a lightweight connectivity endpoint that reliably returns 204
      // Avoids favicon URL noise and minimizes CORS issues
      await fetch('https://www.gstatic.com/generate_204', {
        method: 'GET',
        mode: 'no-cors', // opaque response is fine for connectivity check
        cache: 'no-store',
        signal: controller.signal,
        keepalive: true
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      // Treat aborted as a connectivity failure but avoid noisy logs
      if (error?.name !== 'AbortError') {
        console.warn('Internet connectivity test failed:', error.message);
      }
      return false;
    }
  }

  /**
   * Test connectivity to a specific service
   * @param {string} url - Service URL to test
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<{connected: boolean, latency: number, error?: string}>}
   */
  async testServiceConnectivity(url, timeout = 10000) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      
      return {
        connected: response.ok,
        latency,
        status: response.status
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        connected: false,
        latency,
        error: error.message
      };
    }
  }

  /**
   * Get network quality assessment
   * @returns {Promise<{quality: string, details: object}>}
   */
  async getNetworkQuality() {
    const startTime = Date.now();
    const isConnected = await this.testInternetConnectivity(3000);
    const responseTime = Date.now() - startTime;
    
    let quality = 'unknown';
    if (!isConnected) {
      quality = 'offline';
    } else if (responseTime < 500) {
      quality = 'excellent';
    } else if (responseTime < 1000) {
      quality = 'good';
    } else if (responseTime < 2000) {
      quality = 'fair';
    } else {
      quality = 'poor';
    }
    
    return {
      quality,
      details: {
        connected: isConnected,
        responseTime,
        connectionType: this.getConnectionType(),
        onlineStatus: navigator.onLine
      }
    };
  }

  /**
   * Set up network event listeners
   */
  setupNetworkListeners() {
    const handleOnline = () => {
      this.isOnline = true;
      this.notifyListeners('online', { connected: true });
    };
    
    const handleOffline = () => {
      this.isOnline = false;
      this.notifyListeners('offline', { connected: false });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for connection changes if supported
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        const newType = this.getConnectionType();
        if (newType !== this.connectionType) {
          this.connectionType = newType;
          this.notifyListeners('connection-change', { 
            connectionType: newType 
          });
        }
      });
    }
  }

  /**
   * Add a network status listener
   * @param {function} callback - Callback function to call on network changes
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove a network status listener
   * @param {function} callback - Callback function to remove
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners of network changes
   * @param {string} event - Event type
   * @param {object} data - Event data
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Network listener error:', error);
      }
    });
  }

  /**
   * Get comprehensive network status
   * @returns {Promise<object>} Network status information
   */
  async getNetworkStatus() {
    const quality = await this.getNetworkQuality();
    
    return {
      online: this.isConnected(),
      connectionType: this.getConnectionType(),
      quality: quality.quality,
      details: quality.details,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const networkUtils = new NetworkUtils();

export default networkUtils;