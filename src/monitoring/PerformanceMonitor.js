import { BaseService } from '../services/BaseService.js';

export class PerformanceMonitor extends BaseService {
  constructor() {
    super('PerformanceMonitor');
    this.metrics = new Map();
    this.thresholds = {
      apiResponse: 2000, // 2 seconds
      dbQuery: 1000,     // 1 second
      rendering: 100,    // 100ms
  
    };
  }

  startTimer(operation) {
    const startTime = performance.now();
    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.recordMetric(operation, duration);
        return duration;
      }
    };
  }

  recordMetric(operation, duration) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const metrics = this.metrics.get(operation);
    metrics.push({
      duration,
      timestamp: Date.now(),
      threshold: this.thresholds[operation] || 1000,
      exceeded: duration > (this.thresholds[operation] || 1000)
    });

    // Keep only last 100 metrics per operation
    if (metrics.length > 100) {
      metrics.shift();
    }

    // Log performance violations
    if (duration > (this.thresholds[operation] || 1000)) {
      console.warn('Performance threshold exceeded for ' + operation + ': ' + duration.toFixed(2) + 'ms');
    }
  }

  getMetrics(operation) {
    const metrics = this.metrics.get(operation) || [];
    if (metrics.length === 0) return null;

    const durations = metrics.map(m => m.duration);
    return {
      operation,
      count: metrics.length,
      average: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2),
      min: Math.min(...durations).toFixed(2),
      max: Math.max(...durations).toFixed(2),
      threshold: this.thresholds[operation] || 1000,
      violations: metrics.filter(m => m.exceeded).length,
      violationRate: ((metrics.filter(m => m.exceeded).length / metrics.length) * 100).toFixed(2)
    };
  }

  getAllMetrics() {
    const result = {};
    for (const operation of this.metrics.keys()) {
      result[operation] = this.getMetrics(operation);
    }
    return result;
  }

  generateReport() {
    const allMetrics = this.getAllMetrics();
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalOperations: Object.keys(allMetrics).length,
        totalViolations: Object.values(allMetrics).reduce((sum, m) => sum + (m?.violations || 0), 0)
      },
      metrics: allMetrics
    };
    return report;
  }
}