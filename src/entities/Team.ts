
import { v4 as uuidv4 } from 'uuid';
import { Team as ITeam, CreateTeamRequest, UpdateTeamRequest } from '../models/Team';

export class TeamEntity implements ITeam {
  public readonly id: string;
  public name: string;
  public organizationId: string;
  public isActive: boolean;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(request: CreateTeamRequest) {
    this.validateCreateRequest(request);
    
    this.id = uuidv4();
    this.name = request.name.trim();
    this.organizationId = request.organizationId;
    this.isActive = true;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  public static fromData(data: ITeam): TeamEntity {
    const entity = Object.create(TeamEntity.prototype);
    Object.assign(entity, data);
    return entity;
  }

  public update(request: UpdateTeamRequest): void {
    this.validateUpdateRequest(request);

    if (request.name !== undefined) {
      this.name = request.name.trim();
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

  public belongsToOrganization(organizationId: string): boolean {
    return this.organizationId === organizationId;
  }

  private validateCreateRequest(request: CreateTeamRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('Team name is required');
    }
    if (request.name.trim().length > 100) {
      throw new Error('Team name must be 100 characters or less');
    }
    if (!request.organizationId || request.organizationId.trim().length === 0) {
      throw new Error('Organization ID is required');
    }
  }

  private validateUpdateRequest(request: UpdateTeamRequest): void {
    if (request.name !== undefined) {
      if (!request.name || request.name.trim().length === 0) {
        throw new Error('Team name cannot be empty');
      }
      if (request.name.trim().length > 100) {
        throw new Error('Team name must be 100 characters or less');
      }
    }
  }
}
