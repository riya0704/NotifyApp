import { v4 as uuidv4 } from 'uuid';
import { User as IUser, CreateUserRequest, UpdateUserRequest } from '../models/User';

export class UserEntity implements IUser {
  public readonly id: string;
  public name: string;
  public email: string;
  public teamId: string;
  public organizationId: string;
  public isActive: boolean;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(request: CreateUserRequest) {
    this.validateCreateRequest(request);
    
    this.id = uuidv4();
    this.name = request.name.trim();
    this.email = request.email.trim().toLowerCase();
    this.teamId = request.teamId;
    this.organizationId = request.organizationId;
    this.isActive = true;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  public static fromData(data: IUser): UserEntity {
    const entity = Object.create(UserEntity.prototype);
    Object.assign(entity, data);
    return entity;
  }

  public update(request: UpdateUserRequest): void {
    this.validateUpdateRequest(request);

    if (request.name !== undefined) {
      this.name = request.name.trim();
    }
    if (request.email !== undefined) {
      this.email = request.email.trim().toLowerCase();
    }
    if (request.teamId !== undefined) {
      this.teamId = request.teamId;
    }
    if (request.isActive !== undefined) {
      this.isActive = request.isActive;
    }
    
    this.updatedAt = new Date();
  }

  public deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  public activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  public belongsToTeam(teamId: string): boolean {
    return this.teamId === teamId;
  }

  public belongsToOrganization(organizationId: string): boolean {
    return this.organizationId === organizationId;
  }

  private validateCreateRequest(request: CreateUserRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('User name is required');
    }
    if (request.name.trim().length > 100) {
      throw new Error('User name must be 100 characters or less');
    }
    if (!request.email || request.email.trim().length === 0) {
      throw new Error('User email is required');
    }
    if (!this.isValidEmail(request.email)) {
      throw new Error('Invalid email format');
    }
    if (!request.teamId || request.teamId.trim().length === 0) {
      throw new Error('Team ID is required');
    }
    if (!request.organizationId || request.organizationId.trim().length === 0) {
      throw new Error('Organization ID is required');
    }
  }

  private validateUpdateRequest(request: UpdateUserRequest): void {
    if (request.name !== undefined) {
      if (!request.name || request.name.trim().length === 0) {
        throw new Error('User name cannot be empty');
      }
      if (request.name.trim().length > 100) {
        throw new Error('User name must be 100 characters or less');
      }
    }
    if (request.email !== undefined) {
      if (!request.email || request.email.trim().length === 0) {
        throw new Error('User email cannot be empty');
      }
      if (!this.isValidEmail(request.email)) {
        throw new Error('Invalid email format');
      }
    }
    if (request.teamId !== undefined && (!request.teamId || request.teamId.trim().length === 0)) {
      throw new Error('Team ID cannot be empty');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }
}