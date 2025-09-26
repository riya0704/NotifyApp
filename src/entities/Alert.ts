import { v4 as uuidv4 } from 'uuid';
import { 
  Alert as IAlert, 
  CreateAlertRequest, 
  UpdateAlertRequest, 
  VisibilityConfig 
} from '../models/Alert';
import { AlertSeverity, AlertStatus, DeliveryType, VisibilityType } from '../models/enums';

export class AlertEntity implements IAlert {
  public readonly id: string;
  public title: string;
  public message: string;
  public severity: AlertSeverity;
  public deliveryType: DeliveryType;
  public visibility: VisibilityConfig;
  public startTime: Date;
  public expiryTime: Date;
  public reminderEnabled: boolean;
  public reminderFrequency: number;
  public createdBy: string;
  public readonly createdAt: Date;
  public status: AlertStatus;

  constructor(request: CreateAlertRequest, createdBy: string) {
    this.validateCreateRequest(request);
    
    this.id = uuidv4();
    this.title = request.title.trim();
    this.message = request.message.trim();
    this.severity = request.severity;
    this.deliveryType = request.deliveryType;
    this.visibility = request.visibility;
    this.startTime = request.startTime;
    this.expiryTime = request.expiryTime;
    this.reminderEnabled = request.reminderEnabled ?? true;
    this.reminderFrequency = request.reminderFrequency ?? 2;
    this.createdBy = createdBy;
    this.createdAt = new Date();
    this.status = AlertStatus.ACTIVE;
  }

  public static fromData(data: IAlert): AlertEntity {
    const entity = Object.create(AlertEntity.prototype);
    Object.assign(entity, data);
    return entity;
  }

  public update(request: UpdateAlertRequest): void {
    this.validateUpdateRequest(request);

    if (request.title !== undefined) {
      this.title = request.title.trim();
    }
    if (request.message !== undefined) {
      this.message = request.message.trim();
    }
    if (request.severity !== undefined) {
      this.severity = request.severity;
    }
    if (request.deliveryType !== undefined) {
      this.deliveryType = request.deliveryType;
    }
    if (request.visibility !== undefined) {
      this.visibility = request.visibility;
    }
    if (request.startTime !== undefined) {
      this.startTime = request.startTime;
    }
    if (request.expiryTime !== undefined) {
      this.expiryTime = request.expiryTime;
    }
    if (request.reminderEnabled !== undefined) {
      this.reminderEnabled = request.reminderEnabled;
    }
    if (request.reminderFrequency !== undefined) {
      this.reminderFrequency = request.reminderFrequency;
    }
    if (request.status !== undefined) {
      this.status = request.status;
    }

    // Validate time constraints after update
    this.validateTimeConstraints();
  }

  public archive(): void {
    this.status = AlertStatus.ARCHIVED;
  }

  public isActive(): boolean {
    return this.status === AlertStatus.ACTIVE && 
           new Date() >= this.startTime && 
           new Date() <= this.expiryTime;
  }

  public isExpired(): boolean {
    return new Date() > this.expiryTime || this.status === AlertStatus.EXPIRED;
  }

  public markExpired(): void {
    this.status = AlertStatus.EXPIRED;
  }

  private validateCreateRequest(request: CreateAlertRequest): void {
    if (!request.title || request.title.trim().length === 0) {
      throw new Error('Alert title is required');
    }
    if (request.title.trim().length > 255) {
      throw new Error('Alert title must be 255 characters or less');
    }
    if (!request.message || request.message.trim().length === 0) {
      throw new Error('Alert message is required');
    }
    if (request.message.trim().length > 5000) {
      throw new Error('Alert message must be 5000 characters or less');
    }
    if (!Object.values(AlertSeverity).includes(request.severity)) {
      throw new Error('Invalid alert severity');
    }
    if (!Object.values(DeliveryType).includes(request.deliveryType)) {
      throw new Error('Invalid delivery type');
    }
    
    this.validateVisibilityConfig(request.visibility);
    this.validateTimeConstraints(request.startTime, request.expiryTime);
    
    if (request.reminderFrequency !== undefined && request.reminderFrequency <= 0) {
      throw new Error('Reminder frequency must be greater than 0');
    }
  }

  private validateUpdateRequest(request: UpdateAlertRequest): void {
    if (request.title !== undefined) {
      if (!request.title || request.title.trim().length === 0) {
        throw new Error('Alert title cannot be empty');
      }
      if (request.title.trim().length > 255) {
        throw new Error('Alert title must be 255 characters or less');
      }
    }
    if (request.message !== undefined) {
      if (!request.message || request.message.trim().length === 0) {
        throw new Error('Alert message cannot be empty');
      }
      if (request.message.trim().length > 5000) {
        throw new Error('Alert message must be 5000 characters or less');
      }
    }
    if (request.severity !== undefined && !Object.values(AlertSeverity).includes(request.severity)) {
      throw new Error('Invalid alert severity');
    }
    if (request.deliveryType !== undefined && !Object.values(DeliveryType).includes(request.deliveryType)) {
      throw new Error('Invalid delivery type');
    }
    if (request.visibility !== undefined) {
      this.validateVisibilityConfig(request.visibility);
    }
    if (request.reminderFrequency !== undefined && request.reminderFrequency <= 0) {
      throw new Error('Reminder frequency must be greater than 0');
    }
    if (request.status !== undefined && !Object.values(AlertStatus).includes(request.status)) {
      throw new Error('Invalid alert status');
    }
  }

  private validateVisibilityConfig(visibility: VisibilityConfig): void {
    if (!Object.values(VisibilityType).includes(visibility.type)) {
      throw new Error('Invalid visibility type');
    }

    if (visibility.type === VisibilityType.ORGANIZATION) {
      // No target IDs are required for organization-wide alerts
      return;
    }

    if (!visibility.targetIds || visibility.targetIds.length === 0) {
      throw new Error(`At least one target ID is required for visibility type: ${visibility.type}`);
    }

    if (visibility.targetIds.some(id => !id || id.trim().length === 0)) {
      throw new Error('All target IDs must be non-empty strings');
    }
  }

  private validateTimeConstraints(startTime?: Date, expiryTime?: Date): void {
    const start = startTime || this.startTime;
    const expiry = expiryTime || this.expiryTime;
    
    if (expiry <= new Date()) {
      throw new Error('Alert expiry time must be in the future');
    }
    if (start >= expiry) {
      throw new Error('Alert start time must be before expiry time');
    }
  }
}