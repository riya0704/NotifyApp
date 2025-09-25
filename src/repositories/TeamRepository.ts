import { TeamEntity } from '../entities/Team';
import { BaseRepository } from './BaseRepository';

export class TeamRepository extends BaseRepository<TeamEntity> {
  protected getTableName(): string {
    return 'teams';
  }

  protected mapResultsToEntities(rows: any[]): TeamEntity[] {
    return rows.map(row => TeamEntity.fromData({
      id: row.id,
      name: row.name,
      organizationId: row.organization_id,
      memberIds: JSON.parse(row.member_ids),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  protected mapEntityToRow(entity: TeamEntity): Record<string, any> {
    return {
      id: entity.id,
      name: entity.name,
      organization_id: entity.organizationId,
      member_ids: JSON.stringify(entity.memberIds),
      created_at: entity.createdAt,
      updated_at: entity.updatedAt
    };
  }

  async create(entity: TeamEntity): Promise<TeamEntity> {
    this.validateEntity(entity);
    const row = this.mapEntityToRow(entity);
    const sql = `
      INSERT INTO ${this.getTableName()} (id, name, organization_id, member_ids, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const params = [row.id, row.name, row.organization_id, row.member_ids, row.created_at, row.updated_at];

    try {
      const result = await this.executeQuery(sql, params);
      return this.mapResultsToEntities(result.rows)[0];
    } catch (error) {
      throw this.handleError('create', error);
    }
  }

  async findById(id: string): Promise<TeamEntity | null> {
    try {
      const sql = `SELECT * FROM ${this.getTableName()} WHERE id = $1`;
      const result = await this.executeQuery(sql, [id]);
      const entities = this.mapResultsToEntities(result.rows);
      return entities.length > 0 ? entities[0] : null;
    } catch (error) {
      throw this.handleError('findById', error);
    }
  }

  async update(id: string, updates: Partial<TeamEntity>): Promise<TeamEntity> {
    this.validateEntity(updates);
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const columnMappings: Record<string, string> = {
      name: 'name',
      memberIds: 'member_ids',
      updatedAt: 'updated_at'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && columnMappings[key]) {
        setClauses.push(`${columnMappings[key]} = $${paramIndex}`);
        params.push(key === 'memberIds' ? JSON.stringify(value) : value);
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
        throw new Error(`Team with ID ${id} not found`);
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

  public async findByName(name: string): Promise<TeamEntity | null> {
    try {
      const sql = `SELECT * FROM ${this.getTableName()} WHERE name = $1`;
      const result = await this.executeQuery(sql, [name]);
      const entities = this.mapResultsToEntities(result.rows);
      return entities.length > 0 ? entities[0] : null;
    } catch (error) {
      throw this.handleError('findByName', error);
    }
  }
}
