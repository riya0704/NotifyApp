
export interface Team {
  id: string;
  name: string;
  organizationId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTeamRequest {
  name: string;
  organizationId: string;
}

export interface UpdateTeamRequest {
  name?: string;
  isActive?: boolean;
}
