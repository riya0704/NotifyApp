import { AlertSeverity, DeliveryType, DeliveryStatus, NotificationStatus } from './enums';

export interface Notification {
  id: string;
  alertId: string;
  userId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  deliveryType: DeliveryType;
  timestamp: Date;
  status: NotificationStatus;
}

export interface DeliveryResult {
  success: boolean;
  deliveryId: string;
  timestamp: Date;
  errorMessage?: string;
}

export interface NotificationDelivery {
  id: string;
  alertId: string;
  userId: string;
  deliveryType: DeliveryType;
  status: DeliveryStatus;
  deliveredAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export interface ScheduledReminder {
  id: string;
  alertId: string;
  userId: string;
  scheduledTime: Date;
  status: string;
  createdAt: Date;
  processedAt?: Date;
}