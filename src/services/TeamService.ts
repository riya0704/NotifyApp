
import { TeamEntity } from '../entities/Team';
import { TeamRepository } from '../repositories/TeamRepository';
import { CreateTeamRequest, UpdateTeamRequest } from '../models/Team';

export class TeamService {
  private teamRepository: TeamRepository;

  constructor(teamRepository: TeamRepository) {
    this.teamRepository = teamRepository;
  }

  public async createTeam(request: CreateTeamRequest): Promise<TeamEntity> {
    const newTeam = new TeamEntity(request);
    return this.teamRepository.create(newTeam);
  }

  public async getTeamById(id: string): Promise<TeamEntity | null> {
    return this.teamRepository.findById(id);
  }

  public async updateTeam(id: string, request: UpdateTeamRequest): Promise<TeamEntity | null> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      return null;
    }

    team.update(request);
    return this.teamRepository.update(id, team);
  }

  public async deactivateTeam(id: string): Promise<TeamEntity | null> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      return null;
    }

    team.deactivate();
    return this.teamRepository.update(id, team);
  }

  public async getTeamsByOrganization(organizationId: string): Promise<TeamEntity[]> {
    return this.teamRepository.findByOrganizationId(organizationId);
  }
}
