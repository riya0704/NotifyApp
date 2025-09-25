import { 
  IDeliveryStrategy, 
  DeliveryConfiguration, 
  ValidationResult, 
  EnhancedDeliveryResult,
  RetryConfiguration,
  RateLimitConfiguration
} from './IDeliveryStrategy';
import { DeliveryType, DeliveryStatus } from '../models/enums';
import { User } from '../models/User';
import { Notification, DeliveryResult } from '../models/Notification';

/**
 * Abstract base class for delivery strategies
 */
export abstract class BaseDeliveryStrategy implements IDeliveryStrategy {
  protected configuration: DeliveryConfiguration;
  private rateLimitTracker: Map<string, number[]> = new Map();

  constructor(configuration: Partial<DeliveryConfiguration> = {}) {
    this.configuration = this.mergeWithDefaults(configuration);
  }

  /**
   * Abstract method to be implemented by concrete strategies
   */
  abstract deliver(notification: Notification, user: User): Promise<DeliveryResult>;

  /**
   * Abstract method to get the channel type
   */
  abstract getChannelType(): DeliveryType;

  /**
   * Default implementation for delivery validation
   */
  async canDeliver(user: User): Promise<boolean> {
    if (!user.isActive) {
      return false;
    }

    // Check rate limiting
    if (!this.checkRateLimit(user.id)) {
      return false;
    }

    return this.validateUserForDelivery(user);
  }

  /**
   * Get delivery configuration
   */
  getConfiguration(): DeliveryConfiguration {
    return { ...this.configuration };
  }

  /**
   * Validate delivery parameters
   */
  async validateDelivery(notification: Notification, user: User): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate notification
    if (!notification.id || notification.id.trim().length === 0) {
      errors.push('Notification ID is required');
    }

    if (!notification.title || notification.title.trim().length === 0) {
      errors.push('Notification title is required');
    }

    if (!notification.message || notification.message.trim().length === 0) {
      errors.push('Notification message is required');
    }

    if (notification.title && notification.title.length > 255) {
      errors.push('Notification title is too long (max 255 characters)');
    }

    if (notification.message && notification.message.length > 5000) {
      errors.push('Notification message is too long (max 5000 characters)');
    }

    // Validate user
    if (!user.id || user.id.trim().length === 0) {
      errors.push('User ID is required');
    }

    if (!user.isActive) {
      errors.push('User is not active');
    }

    // Strategy-specific validation
    const strategyValidation = await this.validateStrategySpecific(notification, user);
    errors.push(...strategyValidation.errors);
    warnings.push(...strategyValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Enhanced delivery method with error handling and metrics
   */
  async deliverWithMetrics(notification: Notification, user: User): Promise<EnhancedDeliveryResult> {
    const startTime = Date.now();
    let attemptNumber = 1;

    try {
      // Validate before delivery
      const validation = await this.validateDelivery(notification, user);
      if (!validation.isValid) {
        return this.createFailureResult(
          notification,
          `Validation failed: ${validation.errors.join(', ')}`,
          startTime,
          attemptNumber
        );
      }

      // Check if delivery is possible
      const canDeliver = await this.canDeliver(user);
      if (!canDeliver) {
        return this.createFailureResult(
          notification,
          'Delivery not possible for this user',
          startTime,
          attemptNumber
        );
      }

      // Record rate limit usage
      this.recordRateLimitUsage(user.id);

      // Perform delivery
      const result = await this.deliver(notification, user);
      const processingTime = Date.now() - startTime;

      return {
        ...result,
        status: result.success ? DeliveryStatus.DELIVERED : DeliveryStatus.FAILED,
        channel: this.getChannelType(),
        attemptNumber,
        processingTime,
        shouldRetry: !result.success && this.shouldRetryDelivery(result.errorMessage),
        nextRetryTime: this.calculateNextRetryTime(attemptNumber)
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      return this.createFailureResult(
        notification,
        error instanceof Error ? error.message : 'Unknown error',
        startTime,
        attemptNumber,
        processingTime
      );
    }
  }

  /**
   * Strategy-specific validation (to be overridden by concrete strategies)
   */
  protected async validateStrategySpecific(notification: Notification, user: User): Promise<ValidationResult> {
    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * User validation for delivery (to be overridden by concrete strategies)
   */
  protected async validateUserForDelivery(user: User): Promise<boolean> {
    return true;
  }

  /**
   * Check rate limiting for user
   */
  protected checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const windowMs = this.configuration.rateLimiting.windowMs;
    const maxRequests = this.configuration.rateLimiting.maxRequests;

    // Get or create request history for user
    let requests = this.rateLimitTracker.get(userId) || [];
    
    // Remove requests outside the current window
    requests = requests.filter(timestamp => now - timestamp < windowMs);
    
    // Check if under limit
    if (requests.length >= maxRequests) {
      return false;
    }

    return true;
  }

  /**
   * Record rate limit usage
   */
  protected recordRateLimitUsage(userId: string): void {
    const now = Date.now();
    const requests = this.rateLimitTracker.get(userId) || [];
    requests.push(now);
    this.rateLimitTracker.set(userId, requests);
  }

  /**
   * Determine if delivery should be retried based on error
   */
  protected shouldRetryDelivery(errorMessage?: string): boolean {
    if (!errorMessage) {
      return false;
    }

    // Don't retry validation errors
    const nonRetryableErrors = [
      'validation failed',
      'user not active',
      'invalid email',
      'invalid phone number',
      'user not found'
    ];

    const lowerError = errorMessage.toLowerCase();
    return !nonRetryableErrors.some(error => lowerError.includes(error));
  }

  /**
   * Calculate next retry time using exponential backoff
   */
  protected calculateNextRetryTime(attemptNumber: number): Date {
    const config = this.configuration.retryConfig;
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attemptNumber - 1),
      config.maxDelay
    );

    // Add jitter
    const jitter = delay * config.jitterFactor * Math.random();
    const finalDelay = delay + jitter;

    return new Date(Date.now() + finalDelay);
  }

  /**
   * Create failure result
   */
  protected createFailureResult(
    notification: Notification,
    errorMessage: string,
    startTime: number,
    attemptNumber: number,
    processingTime?: number
  ): EnhancedDeliveryResult {
    return {
      success: false,
      deliveryId: `failed-${notification.id}-${Date.now()}`,
      timestamp: new Date(),
      errorMessage,
      status: DeliveryStatus.FAILED,
      channel: this.getChannelType(),
      attemptNumber,
      processingTime: processingTime || Date.now() - startTime,
      shouldRetry: this.shouldRetryDelivery(errorMessage),
      nextRetryTime: this.calculateNextRetryTime(attemptNumber)
    };
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config: Partial<DeliveryConfiguration>): DeliveryConfiguration {
    const defaultRetryConfig: RetryConfiguration = {
      maxAttempts: 3,
      baseDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 30000,
      jitterFactor: 0.1
    };

    const defaultRateLimiting: RateLimitConfiguration = {
      maxRequests: 100,
      windowMs: 60000, // 1 minute
      queueOnLimit: false
    };

    return {
      name: config.name || this.getChannelType(),
      enabled: config.enabled !== undefined ? config.enabled : true,
      maxConcurrency: config.maxConcurrency || 10,
      timeout: config.timeout || 30000,
      retryConfig: { ...defaultRetryConfig, ...config.retryConfig },
      rateLimiting: { ...defaultRateLimiting, ...config.rateLimiting },
      providerSettings: config.providerSettings || {}
    };
  }

  /**
   * Clean up old rate limit entries
   */
  protected cleanupRateLimitTracker(): void {
    const now = Date.now();
    const windowMs = this.configuration.rateLimiting.windowMs;

    for (const [userId, requests] of this.rateLimitTracker.entries()) {
      const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
      if (validRequests.length === 0) {
        this.rateLimitTracker.delete(userId);
      } else {
        this.rateLimitTracker.set(userId, validRequests);
      }
    }
  }
}