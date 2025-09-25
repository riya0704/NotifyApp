import { DeliveryType, DeliveryStatus } from '../models/enums';
import { User } from '../models/User';
import { Notification, DeliveryResult } from '../models/Notification';

/**
 * Core delivery strategy interface using Strategy pattern
 */
export interface IDeliveryStrategy {
  /**
   * Deliver a notification to a user
   */
  deliver(notification: Notification, user: User): Promise<DeliveryResult>;

  /**
   * Get the delivery channel type this strategy handles
   */
  getChannelType(): DeliveryType;

  /**
   * Check if the strategy can deliver to the given user
   */
  canDeliver(user: User): Promise<boolean>;

  /**
   * Get delivery configuration for this strategy
   */
  getConfiguration(): DeliveryConfiguration;

  /**
   * Validate delivery parameters before attempting delivery
   */
  validateDelivery(notification: Notification, user: User): Promise<ValidationResult>;
}

/**
 * Factory interface for creating delivery strategies
 */
export interface IDeliveryStrategyFactory {
  /**
   * Create a delivery strategy for the specified type
   */
  createStrategy(deliveryType: DeliveryType): IDeliveryStrategy;

  /**
   * Get all available delivery types
   */
  getAvailableTypes(): DeliveryType[];

  /**
   * Register a new delivery strategy
   */
  registerStrategy(deliveryType: DeliveryType, strategy: IDeliveryStrategy): void;

  /**
   * Check if a delivery type is supported
   */
  isSupported(deliveryType: DeliveryType): boolean;
}

/**
 * Enhanced notification interface with delivery context
 */
export interface DeliveryNotification extends Notification {
  /**
   * Delivery attempt count
   */
  attemptCount: number;

  /**
   * Maximum retry attempts allowed
   */
  maxAttempts: number;

  /**
   * Delivery priority (higher number = higher priority)
   */
  priority: number;

  /**
   * Scheduled delivery time
   */
  scheduledTime?: Date;

  /**
   * Delivery context metadata
   */
  context: DeliveryContext;
}

/**
 * Delivery context for additional information
 */
export interface DeliveryContext {
  /**
   * Source of the delivery request
   */
  source: 'reminder' | 'immediate' | 'scheduled';

  /**
   * Correlation ID for tracking
   */
  correlationId: string;

  /**
   * Additional metadata
   */
  metadata: Record<string, any>;

  /**
   * Retry configuration
   */
  retryConfig?: RetryConfiguration;
}

/**
 * Enhanced delivery result with detailed information
 */
export interface EnhancedDeliveryResult extends DeliveryResult {
  /**
   * Delivery status
   */
  status: DeliveryStatus;

  /**
   * Delivery channel used
   */
  channel: DeliveryType;

  /**
   * Delivery attempt number
   */
  attemptNumber: number;

  /**
   * Processing time in milliseconds
   */
  processingTime: number;

  /**
   * Provider-specific response data
   */
  providerResponse?: any;

  /**
   * Whether retry is recommended
   */
  shouldRetry: boolean;

  /**
   * Next retry time if applicable
   */
  nextRetryTime?: Date;
}

/**
 * Validation result for delivery parameters
 */
export interface ValidationResult {
  /**
   * Whether validation passed
   */
  isValid: boolean;

  /**
   * Validation error messages
   */
  errors: string[];

  /**
   * Validation warnings
   */
  warnings: string[];
}

/**
 * Delivery configuration for strategies
 */
export interface DeliveryConfiguration {
  /**
   * Strategy name
   */
  name: string;

  /**
   * Whether the strategy is enabled
   */
  enabled: boolean;

  /**
   * Maximum concurrent deliveries
   */
  maxConcurrency: number;

  /**
   * Timeout in milliseconds
   */
  timeout: number;

  /**
   * Retry configuration
   */
  retryConfig: RetryConfiguration;

  /**
   * Rate limiting configuration
   */
  rateLimiting: RateLimitConfiguration;

  /**
   * Provider-specific settings
   */
  providerSettings: Record<string, any>;
}

/**
 * Retry configuration
 */
export interface RetryConfiguration {
  /**
   * Maximum number of retry attempts
   */
  maxAttempts: number;

  /**
   * Base delay between retries in milliseconds
   */
  baseDelay: number;

  /**
   * Exponential backoff multiplier
   */
  backoffMultiplier: number;

  /**
   * Maximum delay between retries in milliseconds
   */
  maxDelay: number;

  /**
   * Jitter factor for randomizing delays
   */
  jitterFactor: number;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfiguration {
  /**
   * Maximum requests per time window
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Whether to queue requests when limit is exceeded
   */
  queueOnLimit: boolean;
}

/**
 * Delivery metrics for monitoring
 */
export interface DeliveryMetrics {
  /**
   * Total delivery attempts
   */
  totalAttempts: number;

  /**
   * Successful deliveries
   */
  successCount: number;

  /**
   * Failed deliveries
   */
  failureCount: number;

  /**
   * Average processing time in milliseconds
   */
  averageProcessingTime: number;

  /**
   * Success rate as percentage
   */
  successRate: number;

  /**
   * Metrics by delivery type
   */
  byDeliveryType: Record<DeliveryType, TypeMetrics>;
}

/**
 * Metrics for specific delivery type
 */
export interface TypeMetrics {
  /**
   * Delivery type
   */
  type: DeliveryType;

  /**
   * Total attempts for this type
   */
  attempts: number;

  /**
   * Successful deliveries for this type
   */
  successes: number;

  /**
   * Failed deliveries for this type
   */
  failures: number;

  /**
   * Average processing time for this type
   */
  avgProcessingTime: number;
}

/**
 * Delivery queue interface for managing delivery requests
 */
export interface IDeliveryQueue {
  /**
   * Add a delivery request to the queue
   */
  enqueue(notification: DeliveryNotification, user: User): Promise<void>;

  /**
   * Get the next delivery request from the queue
   */
  dequeue(): Promise<{ notification: DeliveryNotification; user: User } | null>;

  /**
   * Get queue size
   */
  size(): Promise<number>;

  /**
   * Clear the queue
   */
  clear(): Promise<void>;

  /**
   * Get queue statistics
   */
  getStats(): Promise<QueueStats>;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  /**
   * Current queue size
   */
  size: number;

  /**
   * Total items processed
   */
  totalProcessed: number;

  /**
   * Items processed per minute
   */
  throughput: number;

  /**
   * Average processing time
   */
  avgProcessingTime: number;
}

/**
 * Delivery processor interface for handling queued deliveries
 */
export interface IDeliveryProcessor {
  /**
   * Start processing deliveries
   */
  start(): Promise<void>;

  /**
   * Stop processing deliveries
   */
  stop(): Promise<void>;

  /**
   * Process a single delivery
   */
  processDelivery(notification: DeliveryNotification, user: User): Promise<EnhancedDeliveryResult>;

  /**
   * Get processor status
   */
  getStatus(): ProcessorStatus;

  /**
   * Get processing metrics
   */
  getMetrics(): Promise<DeliveryMetrics>;
}

/**
 * Processor status
 */
export interface ProcessorStatus {
  /**
   * Whether processor is running
   */
  isRunning: boolean;

  /**
   * Number of active workers
   */
  activeWorkers: number;

  /**
   * Items in processing
   */
  itemsInProgress: number;

  /**
   * Last processing time
   */
  lastProcessedAt?: Date;
}