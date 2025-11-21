export class EventBus {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
    this.maxListeners = 100;
  }

  on(event, callback) {
    this.addListener(event, callback, this.listeners);
  }

  once(event, callback) {
    this.addListener(event, callback, this.onceListeners);
  }

  addListener(event, callback, listenerMap) {
    if (!listenerMap.has(event)) {
      listenerMap.set(event, []);
    }
    
    const listeners = listenerMap.get(event);
    if (listeners.length >= this.maxListeners) {
      console.warn('EventBus: Maximum listeners exceeded for event: ' + event);
    }
    
    listeners.push(callback);
  }

  emit(event, data) {
    const timestamp = Date.now();
    
    // Handle regular listeners
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => this.executeCallback(callback, data, event));
    
    // Handle once listeners
    const onceCallbacks = this.onceListeners.get(event) || [];
    onceCallbacks.forEach(callback => this.executeCallback(callback, data, event));
    
    // Clear once listeners after execution
    if (onceCallbacks.length > 0) {
      this.onceListeners.delete(event);
    }
    
    // Emit meta event for debugging
    if (event !== 'event:emitted') {
      this.emit('event:emitted', { event, data, timestamp, listenerCount: callbacks.length + onceCallbacks.length });
    }
  }

  executeCallback(callback, data, event) {
    try {
      callback(data);
    } catch (error) {
      console.error('EventBus: Error in event handler for ' + event + ':', error);
      this.emit('event:error', { event, error, data });
    }
  }

  off(event, callback) {
    this.removeListener(event, callback, this.listeners);
    this.removeListener(event, callback, this.onceListeners);
  }

  removeListener(event, callback, listenerMap) {
    const callbacks = listenerMap.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
      if (callbacks.length === 0) {
        listenerMap.delete(event);
      }
    }
  }

  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  getListenerCount(event) {
    const regular = (this.listeners.get(event) || []).length;
    const once = (this.onceListeners.get(event) || []).length;
    return regular + once;
  }

  getEvents() {
    const events = new Set();
    for (const event of this.listeners.keys()) events.add(event);
    for (const event of this.onceListeners.keys()) events.add(event);
    return Array.from(events);
  }
}