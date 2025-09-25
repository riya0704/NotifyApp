export interface User {
  id: string;
  name: string;
  email: string;
  teamId: string;
  organizationId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  teamId: string;
  organizationId: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  teamId?: string;
  isActive?: boolean;
}