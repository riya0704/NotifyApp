import { AlertSeverity, AlertStatus, DeliveryType, VisibilityType } from './enums';

export interface VisibilityConfig {
  type: VisibilityType;
  targetIds: string[]; // organization, team, or user IDs
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  deliveryType: DeliveryType;
  visibility: VisibilityConfig;
  startTime: Date;
  expiryTime: Date;
  reminderEnabled: boolean;
  reminderFrequency: number; // hours
  createdBy: string;
  createdAt: Date;
  status: AlertStatus;
}

export interface CreateAlertRequest {
  title: string;
  message: string;
  severity: AlertSeverity;
  deliveryType: DeliveryType;
  visibility: VisibilityConfig;
  startTime: Date;
  expiryTime: Date;
  reminderEnabled?: boolean;
  reminderFrequency?: number;
}

export interface UpdateAlertRequest {
  title?: string;
  message?: string;
  severity?: AlertSeverity;
  deliveryType?: DeliveryType;
  visibility?: VisibilityConfig;
  startTime?: Date;
  expiryTime?: Date;
  reminderEnabled?: boolean;
  reminderFrequency?: number;
  status?: AlertStatus;
}

export interface AlertFilters {
  severity?: AlertSeverity;
  status?: AlertStatus;
  visibilityType?: VisibilityType;
  createdBy?: string;
  startDate?: Date;
  endDate?: Date;
}