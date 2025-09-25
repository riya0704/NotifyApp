import { IDeliveryStrategy, IDeliveryStrategyFactory } from './IDeliveryStrategy';
import { DeliveryType } from '../models/enums';

/**
 * Factory implementation for creating delivery strategies
 */
export class DeliveryStrategyFactory implements IDeliveryStrategyFactory {
  private strategies: Map<DeliveryType, () => IDeliveryStrategy> = new Map();
  private instances: Map<DeliveryType, IDeliveryStrategy> = new Map();

  constructor() {
    this.initializeDefaultStrategies();
  }

  /**
   * Create a delivery strategy for the specified type
   */
  createStrategy(deliveryType: DeliveryType): IDeliveryStrategy {
    // Return cached instance if available
    if (this.instances.has(deliveryType)) {
      return this.instances.get(deliveryType)!;
    }

    // Create new instance
    const strategyFactory = this.strategies.get(deliveryType);
    if (!strategyFactory) {
      throw new Error(`Delivery strategy not found for type: ${deliveryType}`);
    }

    const strategy = strategyFactory();
    this.instances.set(deliveryType, strategy);
    return strategy;
  }

  /**
   * Get all available delivery types
   */
  getAvailableTypes(): DeliveryType[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Register a new delivery strategy
   */
  registerStrategy(deliveryType: DeliveryType, strategy: IDeliveryStrategy): void {
    this.strategies.set(deliveryType, () => strategy);
    this.instances.set(deliveryType, strategy);
  }

  /**
   * Register a strategy factory function
   */
  registerStrategyFactory(deliveryType: DeliveryType, factory: () => IDeliveryStrategy): void {
    this.strategies.set(deliveryType, factory);
    // Clear cached instance if exists
    this.instances.delete(deliveryType);
  }

  /**
   * Check if a delivery type is supported
   */
  isSupported(deliveryType: DeliveryType): boolean {
    return this.strategies.has(deliveryType);
  }

  /**
   * Remove a strategy registration
   */
  unregisterStrategy(deliveryType: DeliveryType): void {
    this.strategies.delete(deliveryType);
    this.instances.delete(deliveryType);
  }

  /**
   * Clear all cached instances (forces recreation)
   */
  clearCache(): void {
    this.instances.clear();
  }

  /**
   * Get strategy configuration
   */
  getStrategyConfiguration(deliveryType: DeliveryType): any {
    const strategy = this.createStrategy(deliveryType);
    return strategy.getConfiguration();
  }

  /**
   * Initialize default strategies (lazy loading)
   */
  private initializeDefaultStrategies(): void {
    // Register factory functions for lazy loading
    this.strategies.set(DeliveryType.IN_APP, () => {
      const { InAppDeliveryStrategy } = require('./InAppDeliveryStrategy');
      return new InAppDeliveryStrategy();
    });

    this.strategies.set(DeliveryType.EMAIL, () => {
      const { EmailDeliveryStrategy } = require('./EmailDeliveryStrategy');
      return new EmailDeliveryStrategy();
    });

    this.strategies.set(DeliveryType.SMS, () => {
      const { SMSDeliveryStrategy } = require('./SMSDeliveryStrategy');
      return new SMSDeliveryStrategy();
    });
  }
}

/**
 * Singleton instance of the delivery strategy factory
 */
export const deliveryStrategyFactory = new DeliveryStrategyFactory();