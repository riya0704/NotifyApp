import { TeamEntity } from '../entities/Team';
import { BaseRepository } from './BaseRepository';

export class TeamRepository extends BaseRepository<TeamEntity> {
  // For now, we can rely on the base repository methods.
  // Specific finders can be added here later if needed, for example:

  public async findByName(name: string): Promise<TeamEntity | null> {
    const allTeams = await this.findAll();
    return allTeams.find(team => team.name === name) || null;
  }
}
