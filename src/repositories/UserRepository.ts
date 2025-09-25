import { UserEntity } from '../entities/User';
import { BaseRepository } from './BaseRepository';

export class UserRepository extends BaseRepository<UserEntity> {
  // For now, we can rely on the base repository methods.
  // Specific finders can be added here later if needed, for example:

  public async findByEmail(email: string): Promise<UserEntity | null> {
    const allUsers = await this.findAll();
    return allUsers.find(user => user.email === email) || null;
  }

  public async findByTeamId(teamId: string): Promise<UserEntity[]> {
    const allUsers = await this.findAll();
    return allUsers.filter(user => user.teamId === teamId);
  }
}
