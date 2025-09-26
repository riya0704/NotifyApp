import { Pool, PoolClient, QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export abstract class BaseRepository<T, TId = string> {
  protected pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  protected abstract getTableName(): string;
  protected abstract mapResultsToEntities(rows: any[]): T[];
  protected abstract mapEntityToRow(entity: T): Record<string, any>;

  protected async executeQuery(query: string, params: any[] = []): Promise<QueryResult> {
    const client: PoolClient = await this.pool.connect();
    try {
      const result = await client.query(query, params);
      return result;
    } finally {
      client.release();
    }
  }

  protected handleError(operation: string, error: any): Error {
    // Basic error logging
    console.error(`Repository ${operation} operation failed`, {
      tableName: this.getTableName(),
      error: error.message,
      stack: error.stack,
    });

    // Create a more generic error to send to the client
    return new Error(`Repository ${operation} operation failed`);
  }

  // Common validation logic
  protected validateEntity(entity: Partial<T>): void {
    // Example: Ensure required fields are present for creation
    // This method can be overridden in subclasses for more specific validation
  }

  // Default implementation for creating a new entity
  async create(entity: T): Promise<T> {
    this.validateEntity(entity);
    const row = this.mapEntityToRow(entity);
    
    // Assign a UUID if the entity does not have an ID
    if (!row.id) {
      row.id = uuidv4();
    }
    
    const columns = Object.keys(row).join(', ');
    const values = Object.values(row);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.getTableName()} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;

    try {
      const result = await this.executeQuery(query, values);
      return this.mapResultsToEntities(result.rows)[0];
    } catch (error) {
      throw this.handleError('create', error);
    }
  }

  // Default implementation for finding an entity by its ID
  async findById(id: TId): Promise<T | null> {
    try {
      const query = `SELECT * FROM ${this.getTableName()} WHERE id = $1`;
      const result = await this.executeQuery(query, [id]);
      const entities = this.mapResultsToEntities(result.rows);
      return entities.length > 0 ? entities[0] : null;
    } catch(error) {
      throw this.handleError('findById', error);
    }
  }

  // Default implementation for updating an entity
  async update(id: TId, updates: Partial<T>): Promise<T> {
    this.validateEntity(updates);
    const mappedUpdates = this.mapEntityToRow(updates as T);

    const columns = Object.keys(mappedUpdates).filter(key => key !== 'id' && mappedUpdates[key] !== undefined);
    if (columns.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    const params = columns.map(col => mappedUpdates[col]);
    params.push(id);

    const query = `
      UPDATE ${this.getTableName()}
      SET ${setClause}
      WHERE id = $${params.length}
      RETURNING *
    `;
    
    try {
      const result = await this.executeQuery(query, params);
      if (result.rows.length === 0) {
        throw new Error(`Entity with ID ${id} not found in ${this.getTableName()}`);
      }
      return this.mapResultsToEntities(result.rows)[0];
    } catch (error) {
      if (error instanceof Error && error.message.includes('No valid fields')) {
        throw error;
      }
      throw this.handleError('update', error);
    }
  }

  // Default implementation for deleting an entity by its ID
  async delete(id: TId): Promise<boolean> {
    try {
      const query = `DELETE FROM ${this.getTableName()} WHERE id = $1`;
      const result = await this.executeQuery(query, [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw this.handleError('delete', error);
    }
  }

  // Default implementation for finding all entities
  async findAll(): Promise<T[]> {
    try {
      const query = `SELECT * FROM ${this.getTableName()}`;
      const result = await this.executeQuery(query);
      return this.mapResultsToEntities(result.rows);
    } catch(error) {
      throw this.handleError('findAll', error);
    }
  }
}
