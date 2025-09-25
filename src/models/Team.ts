export interface Team {
  id: string;
  name: string;
  organizationId: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTeamRequest {
  name: string;
  organizationId: string;
  memberIds?: string[];
}

export interface UpdateTeamRequest {
  name?: string;
  memberIds?: string[];
}