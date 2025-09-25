import { v4 as uuidv4 } from 'uuid';
import { DeliveryType, DeliveryStatus } from '../models/enums';
import { User } from '../models/User';
import { Notification, DeliveryResult } from '../models/Notification';
import { IDeliveryStrategy, DeliveryConfiguration, ValidationResult } from './IDeliveryStrategy';

export class SMSDeliveryStrategy implements IDeliveryStrategy {
  getChannelType(): DeliveryType {
    return DeliveryType.SMS;
  }

  async deliver(notification: Notification, user: User): Promise<DeliveryResult> {
    // In a real implementation, this would involve sending an SMS to the user's phone number
    console.log(`Delivering SMS notification to ${user.name}: "${notification.title}"`);
    return { success: true, deliveryId: uuidv4(), timestamp: new Date() };
  }

  async canDeliver(user: User): Promise<boolean> {
    // We can deliver an SMS to any user with a phone number.
    // Assuming the User model has an optional `phoneNumber` property.
    return !!(user as any).phoneNumber;
  }

  getConfiguration(): DeliveryConfiguration {
    // This would be loaded from a config file in a real application
    return {
      name: 'SMS',
      enabled: true,
      maxConcurrency: 5,
      timeout: 15000, // 15 seconds
      retryConfig: {
        maxAttempts: 3,
        baseDelay: 10000, // 10 seconds
        backoffMultiplier: 2,
        maxDelay: 600000, // 10 minutes
        jitterFactor: 0.3
      },
      rateLimiting: {
        maxRequests: 50,
        windowMs: 60000, // 1 minute
        queueOnLimit: false
      },
      providerSettings: {
        // e.g., API keys for an SMS service like Twilio
      }
    };
  }

  async validateDelivery(notification: Notification, user: User): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!notification.title || notification.title.trim().length === 0) {
      errors.push('Notification title is required.');
    }

    if (!(user as any).phoneNumber) {
      errors.push('User phone number is missing.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
