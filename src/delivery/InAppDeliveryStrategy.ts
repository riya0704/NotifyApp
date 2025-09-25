import { v4 as uuidv4 } from 'uuid';
import { DeliveryType, DeliveryStatus } from '../models/enums';
import { User } from '../models/User';
import { Notification, DeliveryResult } from '../models/Notification';
import { IDeliveryStrategy, DeliveryConfiguration, ValidationResult } from './IDeliveryStrategy';

export class InAppDeliveryStrategy implements IDeliveryStrategy {
  getChannelType(): DeliveryType {
    return DeliveryType.IN_APP;
  }

  async deliver(notification: Notification, user: User): Promise<DeliveryResult> {
    // In a real implementation, this would involve sending the notification to the user's device
    console.log(`Delivering in-app notification to ${user.name}: "${notification.title}"`);
    return { success: true, deliveryId: uuidv4(), timestamp: new Date() };
  }

  async canDeliver(user: User): Promise<boolean> {
    // For in-app notifications, we can generally deliver to any active user.
    return user.isActive;
  }

  getConfiguration(): DeliveryConfiguration {
    // This would be loaded from a config file in a real application
    return {
      name: 'InApp',
      enabled: true,
      maxConcurrency: 100,
      timeout: 5000, // 5 seconds
      retryConfig: {
        maxAttempts: 3,
        baseDelay: 1000, // 1 second
        backoffMultiplier: 2,
        maxDelay: 60000, // 1 minute
        jitterFactor: 0.1
      },
      rateLimiting: {
        maxRequests: 1000,
        windowMs: 60000, // 1 minute
        queueOnLimit: true
      },
      providerSettings: {}
    };
  }

  async validateDelivery(notification: Notification, user: User): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!notification.title || notification.title.trim().length === 0) {
      errors.push('Notification title is required.');
    }

    if (!user.isActive) {
      warnings.push('User is not active and may not receive the notification.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
