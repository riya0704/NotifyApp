export interface UserAlertState {
  id: string;
  userId: string;
  alertId: string;
  isRead: boolean;
  isSnoozed: boolean;
  snoozeUntil?: Date;
  lastDelivered?: Date;
  deliveryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserAlertStateRequest {
  userId: string;
  alertId: string;
}

export interface UpdateUserAlertStateRequest {
  isRead?: boolean;
  isSnoozed?: boolean;
  snoozeUntil?: Date;
  lastDelivered?: Date;
  deliveryCount?: number;
}