import { UserEntity } from '../entities/User';
import { BaseRepository } from './BaseRepository';

export class UserRepository extends BaseRepository<UserEntity> {
  protected getTableName(): string {
    return 'users';
  }

  protected mapResultsToEntities(rows: any[]): UserEntity[] {
    return rows.map(row => UserEntity.fromData({
      id: row.id,
      name: row.name,
      email: row.email,
      teamId: row.team_id,
      organizationId: row.organization_id,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  protected mapEntityToRow(entity: UserEntity): Record<string, any> {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      team_id: entity.teamId,
      organization_id: entity.organizationId,
      is_active: entity.isActive,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt
    };
  }

  async create(entity: UserEntity): Promise<UserEntity> {
    this.validateEntity(entity);
    const row = this.mapEntityToRow(entity);
    const sql = `
      INSERT INTO ${this.getTableName()} 
      (id, name, email, team_id, organization_id, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [
      row.id, row.name, row.email, row.team_id, row.organization_id, 
      row.is_active, row.created_at, row.updated_at
    ];

    try {
      const result = await this.executeQuery(sql, params);
      return this.mapResultsToEntities(result.rows)[0];
    } catch (error) {
      throw this.handleError('create', error);
    }
  }

  async findById(id: string): Promise<UserEntity | null> {
    try {
      const sql = `SELECT * FROM ${this.getTableName()} WHERE id = $1`;
      const result = await this.executeQuery(sql, [id]);
      const entities = this.mapResultsToEntities(result.rows);
      return entities.length > 0 ? entities[0] : null;
    } catch (error) {
      throw this.handleError('findById', error);
    }
  }

  async update(id: string, updates: Partial<UserEntity>): Promise<UserEntity> {
    this.validateEntity(updates);
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const columnMappings: Record<string, string> = {
      name: 'name',
      email: 'email',
      teamId: 'team_id',
      isActive: 'is_active',
      updatedAt: 'updated_at'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && columnMappings[key]) {
        setClauses.push(`${columnMappings[key]} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    params.push(id);
    const sql = `
      UPDATE ${this.getTableName()} 
      SET ${setClauses.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;

    try {
      const result = await this.executeQuery(sql, params);
      if (result.rows.length === 0) {
        throw new Error(`User with ID ${id} not found`);
      }
      return this.mapResultsToEntities(result.rows)[0];
    } catch (error) {
      throw this.handleError('update', error);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const sql = `DELETE FROM ${this.getTableName()} WHERE id = $1`;
      const result = await this.executeQuery(sql, [id]);
      return result.rowCount > 0;
    } catch (error) {
      throw this.handleError('delete', error);
    }
  }

  public async findByEmail(email: string): Promise<UserEntity | null> {
    try {
      const sql = `SELECT * FROM ${this.getTableName()} WHERE email = $1`;
      const result = await this.executeQuery(sql, [email]);
      const entities = this.mapResultsToEntities(result.rows);
      return entities.length > 0 ? entities[0] : null;
    } catch (error) {
      throw this.handleError('findByEmail', error);
    }
  }

  public async findByTeamId(teamId: string): Promise<UserEntity[]> {
    try {
      const sql = `SELECT * FROM ${this.getTableName()} WHERE team_id = $1`;
      const result = await this.executeQuery(sql, [teamId]);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('findByTeamId', error);
    }
  }
}
