export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  ARCHIVED = 'archived'
}

export enum VisibilityType {
  ORGANIZATION = 'organization',
  TEAM = 'team',
  USER = 'user'
}

export enum DeliveryType {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms'
}

export enum DeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed'
}

export enum ReminderStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  CANCELLED = 'cancelled'
}