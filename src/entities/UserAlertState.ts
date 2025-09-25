import { v4 as uuidv4 } from 'uuid';
import { 
  UserAlertState as IUserAlertState, 
  CreateUserAlertStateRequest, 
  UpdateUserAlertStateRequest 
} from '../models/UserAlertState';

export class UserAlertStateEntity implements IUserAlertState {
  public readonly id: string;
  public readonly userId: string;
  public readonly alertId: string;
  public isRead: boolean;
  public isSnoozed: boolean;
  public snoozeUntil?: Date;
  public lastDelivered?: Date;
  public deliveryCount: number;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(request: CreateUserAlertStateRequest) {
    this.validateCreateRequest(request);
    
    this.id = uuidv4();
    this.userId = request.userId;
    this.alertId = request.alertId;
    this.isRead = false;
    this.isSnoozed = false;
    this.snoozeUntil = undefined;
    this.lastDelivered = undefined;
    this.deliveryCount = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  public static fromData(data: IUserAlertState): UserAlertStateEntity {
    const entity = Object.create(UserAlertStateEntity.prototype);
    Object.assign(entity, data);
    return entity;
  }

  public update(request: UpdateUserAlertStateRequest): void {
    this.validateUpdateRequest(request);

    if (request.isRead !== undefined) {
      this.isRead = request.isRead;
    }
    if (request.isSnoozed !== undefined) {
      this.isSnoozed = request.isSnoozed;
    }
    if (request.snoozeUntil !== undefined) {
      this.snoozeUntil = request.snoozeUntil;
    }
    if (request.lastDelivered !== undefined) {
      this.lastDelivered = request.lastDelivered;
    }
    if (request.deliveryCount !== undefined) {
      this.deliveryCount = request.deliveryCount;
    }
    
    this.updatedAt = new Date();
  }

  public markAsRead(): void {
    this.isRead = true;
    this.updatedAt = new Date();
  }

  public markAsUnread(): void {
    this.isRead = false;
    this.updatedAt = new Date();
  }

  public snoozeForDay(): void {
    this.isSnoozed = true;
    // Set snooze until end of current day
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    this.snoozeUntil = endOfDay;
    this.updatedAt = new Date();
  }

  public snoozeUntilTime(until: Date): void {
    if (until <= new Date()) {
      throw new Error('Snooze time must be in the future');
    }
    
    this.isSnoozed = true;
    this.snoozeUntil = until;
    this.updatedAt = new Date();
  }

  public unsnooze(): void {
    this.isSnoozed = false;
    this.snoozeUntil = undefined;
    this.updatedAt = new Date();
  }

  public recordDelivery(): void {
    this.lastDelivered = new Date();
    this.deliveryCount += 1;
    this.updatedAt = new Date();
  }

  public isCurrentlySnoozed(): boolean {
    if (!this.isSnoozed) {
      return false;
    }
    
    // If no snooze time set, consider it snoozed
    if (!this.snoozeUntil) {
      return true;
    }
    
    // Check if snooze period has expired
    return new Date() < this.snoozeUntil;
  }

  public shouldReceiveReminder(): boolean {
    return !this.isCurrentlySnoozed();
  }

  public getSnoozeTimeRemaining(): number {
    if (!this.isCurrentlySnoozed() || !this.snoozeUntil) {
      return 0;
    }
    
    const now = new Date();
    const remaining = this.snoozeUntil.getTime() - now.getTime();
    return Math.max(0, remaining);
  }

  public hasBeenDelivered(): boolean {
    return this.deliveryCount > 0;
  }

  public getTimeSinceLastDelivery(): number | null {
    if (!this.lastDelivered) {
      return null;
    }
    
    const now = new Date();
    return now.getTime() - this.lastDelivered.getTime();
  }

  public resetSnoozeIfExpired(): boolean {
    if (this.isSnoozed && this.snoozeUntil && new Date() >= this.snoozeUntil) {
      this.unsnooze();
      return true;
    }
    return false;
  }

  public getStateInfo(): {
    isRead: boolean;
    isSnoozed: boolean;
    snoozeTimeRemaining: number;
    deliveryCount: number;
    timeSinceLastDelivery: number | null;
  } {
    return {
      isRead: this.isRead,
      isSnoozed: this.isCurrentlySnoozed(),
      snoozeTimeRemaining: this.getSnoozeTimeRemaining(),
      deliveryCount: this.deliveryCount,
      timeSinceLastDelivery: this.getTimeSinceLastDelivery()
    };
  }

  private validateCreateRequest(request: CreateUserAlertStateRequest): void {
    if (!request.userId || request.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }
    if (!request.alertId || request.alertId.trim().length === 0) {
      throw new Error('Alert ID is required');
    }
  }

  private validateUpdateRequest(request: UpdateUserAlertStateRequest): void {
    if (request.deliveryCount !== undefined && request.deliveryCount < 0) {
      throw new Error('Delivery count cannot be negative');
    }
    if (request.snoozeUntil !== undefined && request.snoozeUntil <= new Date()) {
      throw new Error('Snooze time must be in the future');
    }
  }
}