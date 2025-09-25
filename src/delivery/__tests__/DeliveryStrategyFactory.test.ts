import { DeliveryStrategyFactory } from '../DeliveryStrategyFactory';
import { IDeliveryStrategy } from '../IDeliveryStrategy';
import { DeliveryType } from '../../models/enums';
import { User } from '../../models/User';
import { Notification, DeliveryResult } from '../../models/Notification';

// Mock strategy for testing
class MockDeliveryStrategy implements IDeliveryStrategy {
  constructor(private channelType: DeliveryType) {}

  async deliver(notification: Notification, user: User): Promise<DeliveryResult> {
    return {
      success: true,
      deliveryId: `mock-${notification.id}`,
      timestamp: new Date()
    };
  }

  getChannelType(): DeliveryType {
    return this.channelType;
  }

  async canDeliver(user: User): Promise<boolean> {
    return user.isActive;
  }

  getConfiguration() {
    return {
      name: `Mock ${this.channelType}`,
      enabled: true,
      maxConcurrency: 5,
      timeout: 10000,
      retryConfig: {
        maxAttempts: 3,
        baseDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000,
        jitterFactor: 0.1
      },
      rateLimiting: {
        maxRequests: 50,
        windowMs: 60000,
        queueOnLimit: false
      },
      providerSettings: {}
    };
  }

  async validateDelivery(notification: Notification, user: User) {
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }
}

describe('DeliveryStrategyFactory', () => {
  let factory: DeliveryStrategyFactory;

  beforeEach(() => {
    factory = new DeliveryStrategyFactory();
  });

  describe('registerStrategy', () => {
    it('should register a new strategy', () => {
      const mockStrategy = new MockDeliveryStrategy(DeliveryType.EMAIL);
      
      factory.registerStrategy(DeliveryType.EMAIL, mockStrategy);
      
      expect(factory.isSupported(DeliveryType.EMAIL)).toBe(true);
      expect(factory.getAvailableTypes()).toContain(DeliveryType.EMAIL);
    });

    it('should allow overriding existing strategies', () => {
      const strategy1 = new MockDeliveryStrategy(DeliveryType.SMS);
      const strategy2 = new MockDeliveryStrategy(DeliveryType.SMS);
      
      factory.registerStrategy(DeliveryType.SMS, strategy1);
      factory.registerStrategy(DeliveryType.SMS, strategy2);
      
      const retrieved = factory.createStrategy(DeliveryType.SMS);
      expect(retrieved).toBe(strategy2);
    });
  });

  describe('createStrategy', () => {
    it('should create and return registered strategy', () => {
      const mockStrategy = new MockDeliveryStrategy(DeliveryType.IN_APP);
      factory.registerStrategy(DeliveryType.IN_APP, mockStrategy);
      
      const created = factory.createStrategy(DeliveryType.IN_APP);
      
      expect(created).toBe(mockStrategy);
      expect(created.getChannelType()).toBe(DeliveryType.IN_APP);
    });

    it('should return cached instance on subsequent calls', () => {
      const mockStrategy = new MockDeliveryStrategy(DeliveryType.EMAIL);
      factory.registerStrategy(DeliveryType.EMAIL, mockStrategy);
      
      const instance1 = factory.createStrategy(DeliveryType.EMAIL);
      const instance2 = factory.createStrategy(DeliveryType.EMAIL);
      
      expect(instance1).toBe(instance2);
    });

    it('should throw error for unsupported delivery type', () => {
      expect(() => factory.createStrategy('UNSUPPORTED' as DeliveryType))
        .toThrow('Delivery strategy not found for type: UNSUPPORTED');
    });
  });

  describe('registerStrategyFactory', () => {
    it('should register a factory function', () => {
      const factoryFn = jest.fn(() => new MockDeliveryStrategy(DeliveryType.SMS));
      
      factory.registerStrategyFactory(DeliveryType.SMS, factoryFn);
      
      expect(factory.isSupported(DeliveryType.SMS)).toBe(true);
      
      const strategy = factory.createStrategy(DeliveryType.SMS);
      expect(factoryFn).toHaveBeenCalledTimes(1);
      expect(strategy.getChannelType()).toBe(DeliveryType.SMS);
    });

    it('should clear cached instance when registering new factory', () => {
      const strategy1 = new MockDeliveryStrategy(DeliveryType.EMAIL);
      factory.registerStrategy(DeliveryType.EMAIL, strategy1);
      
      // Get instance to cache it
      const cached = factory.createStrategy(DeliveryType.EMAIL);
      expect(cached).toBe(strategy1);
      
      // Register new factory
      const factoryFn = () => new MockDeliveryStrategy(DeliveryType.EMAIL);
      factory.registerStrategyFactory(DeliveryType.EMAIL, factoryFn);
      
      // Should create new instance
      const newInstance = factory.createStrategy(DeliveryType.EMAIL);
      expect(newInstance).not.toBe(strategy1);
    });
  });

  describe('getAvailableTypes', () => {
    it('should return empty array when no strategies registered', () => {
      const emptyFactory = new DeliveryStrategyFactory();
      // Clear default strategies for this test
      emptyFactory.clearCache();
      
      // We need to access private property for testing
      (emptyFactory as any).strategies.clear();
      
      expect(emptyFactory.getAvailableTypes()).toEqual([]);
    });

    it('should return all registered delivery types', () => {
      factory.registerStrategy(DeliveryType.EMAIL, new MockDeliveryStrategy(DeliveryType.EMAIL));
      factory.registerStrategy(DeliveryType.SMS, new MockDeliveryStrategy(DeliveryType.SMS));
      
      const types = factory.getAvailableTypes();
      
      expect(types).toContain(DeliveryType.EMAIL);
      expect(types).toContain(DeliveryType.SMS);
    });
  });

  describe('isSupported', () => {
    it('should return true for registered strategies', () => {
      factory.registerStrategy(DeliveryType.IN_APP, new MockDeliveryStrategy(DeliveryType.IN_APP));
      
      expect(factory.isSupported(DeliveryType.IN_APP)).toBe(true);
    });

    it('should return false for unregistered strategies', () => {
      expect(factory.isSupported('UNKNOWN' as DeliveryType)).toBe(false);
    });
  });

  describe('unregisterStrategy', () => {
    it('should remove strategy registration', () => {
      factory.registerStrategy(DeliveryType.EMAIL, new MockDeliveryStrategy(DeliveryType.EMAIL));
      
      expect(factory.isSupported(DeliveryType.EMAIL)).toBe(true);
      
      factory.unregisterStrategy(DeliveryType.EMAIL);
      
      expect(factory.isSupported(DeliveryType.EMAIL)).toBe(false);
    });

    it('should clear cached instance when unregistering', () => {
      const strategy = new MockDeliveryStrategy(DeliveryType.SMS);
      factory.registerStrategy(DeliveryType.SMS, strategy);
      
      // Cache the instance
      factory.createStrategy(DeliveryType.SMS);
      
      factory.unregisterStrategy(DeliveryType.SMS);
      
      expect(() => factory.createStrategy(DeliveryType.SMS))
        .toThrow('Delivery strategy not found for type: sms');
    });
  });

  describe('clearCache', () => {
    it('should clear all cached instances', () => {
      const strategy1 = new MockDeliveryStrategy(DeliveryType.EMAIL);
      const strategy2 = new MockDeliveryStrategy(DeliveryType.SMS);
      
      factory.registerStrategy(DeliveryType.EMAIL, strategy1);
      factory.registerStrategy(DeliveryType.SMS, strategy2);
      
      // Cache instances
      const cached1 = factory.createStrategy(DeliveryType.EMAIL);
      const cached2 = factory.createStrategy(DeliveryType.SMS);
      
      expect(cached1).toBe(strategy1);
      expect(cached2).toBe(strategy2);
      
      factory.clearCache();
      
      // Should return same instances since they're registered directly
      const new1 = factory.createStrategy(DeliveryType.EMAIL);
      const new2 = factory.createStrategy(DeliveryType.SMS);
      
      expect(new1).toBe(strategy1);
      expect(new2).toBe(strategy2);
    });
  });

  describe('getStrategyConfiguration', () => {
    it('should return strategy configuration', () => {
      const mockStrategy = new MockDeliveryStrategy(DeliveryType.IN_APP);
      factory.registerStrategy(DeliveryType.IN_APP, mockStrategy);
      
      const config = factory.getStrategyConfiguration(DeliveryType.IN_APP);
      
      expect(config.name).toBe('Mock in_app');
      expect(config.enabled).toBe(true);
      expect(config.maxConcurrency).toBe(5);
    });

    it('should throw error for unsupported strategy', () => {
      expect(() => factory.getStrategyConfiguration('UNKNOWN' as DeliveryType))
        .toThrow('Delivery strategy not found for type: UNKNOWN');
    });
  });

  describe('default strategies', () => {
    it('should have default strategies registered', () => {
      const types = factory.getAvailableTypes();
      
      expect(types).toContain(DeliveryType.IN_APP);
      expect(types).toContain(DeliveryType.EMAIL);
      expect(types).toContain(DeliveryType.SMS);
    });

    it('should support all default delivery types', () => {
      expect(factory.isSupported(DeliveryType.IN_APP)).toBe(true);
      expect(factory.isSupported(DeliveryType.EMAIL)).toBe(true);
      expect(factory.isSupported(DeliveryType.SMS)).toBe(true);
    });
  });
});