import { v4 as uuidv4 } from 'uuid';
import { Team as ITeam, CreateTeamRequest, UpdateTeamRequest } from '../models/Team';

export class TeamEntity implements ITeam {
  public readonly id: string;
  public name: string;
  public organizationId: string;
  public memberIds: string[];
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(request: CreateTeamRequest) {
    this.validateCreateRequest(request);
    
    this.id = uuidv4();
    this.name = request.name.trim();
    this.organizationId = request.organizationId;
    this.memberIds = request.memberIds ? [...request.memberIds] : [];
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
    if (request.memberIds !== undefined) {
      this.memberIds = [...request.memberIds];
    }
    
    this.updatedAt = new Date();
  }

  public addMember(userId: string): void {
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID cannot be empty');
    }
    if (!this.memberIds.includes(userId)) {
      this.memberIds.push(userId);
      this.updatedAt = new Date();
    }
  }

  public removeMember(userId: string): void {
    const index = this.memberIds.indexOf(userId);
    if (index > -1) {
      this.memberIds.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  public hasMember(userId: string): boolean {
    return this.memberIds.includes(userId);
  }

  public getMemberCount(): number {
    return this.memberIds.length;
  }

  public belongsToOrganization(organizationId: string): boolean {
    return this.organizationId === organizationId;
  }

  public clearMembers(): void {
    this.memberIds = [];
    this.updatedAt = new Date();
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
    if (request.memberIds) {
      this.validateMemberIds(request.memberIds);
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
    if (request.memberIds !== undefined) {
      this.validateMemberIds(request.memberIds);
    }
  }

  private validateMemberIds(memberIds: string[]): void {
    if (memberIds.some(id => !id || id.trim().length === 0)) {
      throw new Error('All member IDs must be non-empty strings');
    }
    // Check for duplicates
    const uniqueIds = new Set(memberIds);
    if (uniqueIds.size !== memberIds.length) {
      throw new Error('Duplicate member IDs are not allowed');
    }
  }
}