import { v4 as uuidv4 } from 'uuid';
import { DeliveryType, DeliveryStatus } from '../models/enums';
import { User } from '../models/User';
import { Notification, DeliveryResult } from '../models/Notification';
import { IDeliveryStrategy, DeliveryConfiguration, ValidationResult } from './IDeliveryStrategy';

export class EmailDeliveryStrategy implements IDeliveryStrategy {
  getChannelType(): DeliveryType {
    return DeliveryType.EMAIL;
  }

  async deliver(notification: Notification, user: User): Promise<DeliveryResult> {
    // In a real implementation, this would involve sending an email to the user
    console.log(`Delivering email notification to ${user.email}: "${notification.title}"`);
    return { success: true, deliveryId: uuidv4(), timestamp: new Date() };
  }

  async canDeliver(user: User): Promise<boolean> {
    // We can deliver an email to any user with a valid email address.
    return !!user.email;
  }

  getConfiguration(): DeliveryConfiguration {
    // This would be loaded from a config file in a real application
    return {
      name: 'Email',
      enabled: true,
      maxConcurrency: 10,
      timeout: 10000, // 10 seconds
      retryConfig: {
        maxAttempts: 5,
        baseDelay: 5000, // 5 seconds
        backoffMultiplier: 2,
        maxDelay: 300000, // 5 minutes
        jitterFactor: 0.2
      },
      rateLimiting: {
        maxRequests: 100,
        windowMs: 60000, // 1 minute
        queueOnLimit: false
      },
      providerSettings: {
        // e.g., API keys for an email service like SendGrid or Mailgun
      }
    };
  }

  async validateDelivery(notification: Notification, user: User): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!notification.title || notification.title.trim().length === 0) {
      errors.push('Notification title is required.');
    }

    if (!user.email) {
      errors.push('User email address is missing.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
