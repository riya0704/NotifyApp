import { 
  IRepository, 
  ITransactionRepository, 
  ITransaction, 
  IPaginatedResult, 
  IQueryOptions 
} from './IRepository';

export abstract class BaseRepository<T, TId = string> 
  implements IRepository<T, TId>, ITransactionRepository {
  
  protected connectionPool: any; // Database connection pool
  
  constructor(connectionPool: any) {
    this.connectionPool = connectionPool;
  }

  /**
   * Abstract methods that must be implemented by concrete repositories
   */
  abstract create(entity: T): Promise<T>;
  abstract findById(id: TId): Promise<T | null>;
  abstract update(id: TId, updates: Partial<T>): Promise<T>;
  abstract delete(id: TId): Promise<boolean>;

  /**
   * Default implementation for findAll - can be overridden
   */
  async findAll(filter?: Partial<T>): Promise<T[]> {
    try {
      const query = this.buildFindAllQuery(filter);
      const result = await this.executeQuery(query.sql, query.params);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('findAll', error);
    }
  }

  /**
   * Check if entity exists by ID
   */
  async exists(id: TId): Promise<boolean> {
    try {
      const entity = await this.findById(id);
      return entity !== null;
    } catch (error) {
      throw this.handleError('exists', error);
    }
  }

  /**
   * Count entities matching the filter
   */
  async count(filter?: Partial<T>): Promise<number> {
    try {
      const query = this.buildCountQuery(filter);
      const result = await this.executeQuery(query.sql, query.params);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw this.handleError('count', error);
    }
  }

  /**
   * Find entities with pagination and sorting
   */
  async findWithOptions(options: IQueryOptions): Promise<IPaginatedResult<T>> {
    try {
      const query = this.buildQueryWithOptions(options);
      const [dataResult, countResult] = await Promise.all([
        this.executeQuery(query.sql, query.params),
        this.count(options.filter)
      ]);

      const items = this.mapResultsToEntities(dataResult.rows);
      const totalCount = countResult;
      const page = options.pagination?.page || 1;
      const pageSize = options.pagination?.pageSize || 10;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items,
        totalCount,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      throw this.handleError('findWithOptions', error);
    }
  }

  /**
   * Execute operations within a transaction
   */
  async executeInTransaction<TResult>(
    operation: (transaction: ITransaction) => Promise<TResult>
  ): Promise<TResult> {
    const transaction = await this.beginTransaction();
    
    try {
      const result = await operation(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw this.handleError('transaction', error);
    }
  }

  /**
   * Begin a new transaction
   */
  protected async beginTransaction(): Promise<ITransaction> {
    const client = await this.connectionPool.connect();
    await client.query('BEGIN');
    
    return new DatabaseTransaction(client);
  }

  /**
   * Execute a SQL query with parameters
   */
  protected async executeQuery(sql: string, params: any[] = []): Promise<any> {
    const client = await this.connectionPool.connect();
    
    try {
      return await client.query(sql, params);
    } finally {
      client.release();
    }
  }

  /**
   * Abstract methods for query building - must be implemented by concrete repositories
   */
  protected abstract getTableName(): string;
  protected abstract mapResultsToEntities(rows: any[]): T[];
  protected abstract mapEntityToRow(entity: T): Record<string, any>;

  /**
   * Build query for findAll operation
   */
  protected buildFindAllQuery(filter?: Partial<T>): { sql: string; params: any[] } {
    let sql = `SELECT * FROM ${this.getTableName()}`;
    const params: any[] = [];
    
    if (filter && Object.keys(filter).length > 0) {
      const conditions: string[] = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null) {
          conditions.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }
    
    return { sql, params };
  }

  /**
   * Build count query
   */
  protected buildCountQuery(filter?: Partial<T>): { sql: string; params: any[] } {
    let sql = `SELECT COUNT(*) as count FROM ${this.getTableName()}`;
    const params: any[] = [];
    
    if (filter && Object.keys(filter).length > 0) {
      const conditions: string[] = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null) {
          conditions.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }
    
    return { sql, params };
  }

  /**
   * Build query with pagination and sorting options
   */
  protected buildQueryWithOptions(options: IQueryOptions): { sql: string; params: any[] } {
    const baseQuery = this.buildFindAllQuery(options.filter);
    let sql = baseQuery.sql;
    const params = [...baseQuery.params];
    
    // Add sorting
    if (options.sort && options.sort.length > 0) {
      const sortClauses = options.sort.map(sort => 
        `${sort.field} ${sort.direction}`
      );
      sql += ` ORDER BY ${sortClauses.join(', ')}`;
    }
    
    // Add pagination
    if (options.pagination) {
      const offset = (options.pagination.page - 1) * options.pagination.pageSize;
      sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(options.pagination.pageSize, offset);
    }
    
    return { sql, params };
  }

  /**
   * Handle and transform errors
   */
  protected handleError(operation: string, error: any): Error {
    const message = `Repository ${operation} operation failed: ${error.message}`;
    
    if (error.code === '23505') { // Unique constraint violation
      return new Error(`Duplicate entry: ${error.detail}`);
    }
    
    if (error.code === '23503') { // Foreign key constraint violation
      return new Error(`Foreign key constraint violation: ${error.detail}`);
    }
    
    if (error.code === '23502') { // Not null constraint violation
      return new Error(`Required field missing: ${error.column}`);
    }
    
    return new Error(message);
  }

  /**
   * Validate entity before operations
   */
  protected validateEntity(entity: Partial<T>): void {
    if (!entity) {
      throw new Error('Entity cannot be null or undefined');
    }
  }

  /**
   * Generate UUID for new entities
   */
  protected generateId(): string {
    return require('uuid').v4();
  }
}

/**
 * Database transaction implementation
 */
class DatabaseTransaction implements ITransaction {
  private client: any;
  private active: boolean = true;

  constructor(client: any) {
    this.client = client;
  }

  async commit(): Promise<void> {
    if (!this.active) {
      throw new Error('Transaction is not active');
    }
    
    try {
      await this.client.query('COMMIT');
      this.active = false;
    } finally {
      this.client.release();
    }
  }

  async rollback(): Promise<void> {
    if (!this.active) {
      return; // Already rolled back or committed
    }
    
    try {
      await this.client.query('ROLLBACK');
      this.active = false;
    } finally {
      this.client.release();
    }
  }

  isActive(): boolean {
    return this.active;
  }
}