export class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.dependencies = new Map();
  }

  register(name, factory, options = {}) {
    const { singleton = true, dependencies = [] } = options;
    this.services.set(name, { factory, singleton, dependencies });
    this.dependencies.set(name, dependencies);
  }

  resolve(name) {
    // Check for circular dependencies
    this.checkCircularDependencies(name, new Set());
    
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error('Service not found: ' + name + '. Available: ' + Array.from(this.services.keys()).join(', '));
    }

    // Resolve dependencies first
    const resolvedDependencies = service.dependencies.map(dep => this.resolve(dep));
    
    const instance = service.factory(this, ...resolvedDependencies);
    
    if (service.singleton) {
      this.singletons.set(name, instance);
    }
    
    return instance;
  }

  checkCircularDependencies(name, visited) {
    if (visited.has(name)) {
      throw new Error('Circular dependency detected: ' + Array.from(visited).join(' -> ') + ' -> ' + name);
    }
    
    visited.add(name);
    const dependencies = this.dependencies.get(name) || [];
    
    for (const dep of dependencies) {
      this.checkCircularDependencies(dep, new Set(visited));
    }
  }

  has(name) {
    return this.services.has(name);
  }

  clear() {
    this.services.clear();
    this.singletons.clear();
    this.dependencies.clear();
  }

  getRegisteredServices() {
    return Array.from(this.services.keys());
  }
}