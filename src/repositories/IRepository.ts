export interface IRepository<T, TId = string> {
  /**
   * Create a new entity
   */
  create(entity: T): Promise<T>;

  /**
   * Find entity by ID
   */
  findById(id: TId): Promise<T | null>;

  /**
   * Find all entities matching the filter
   */
  findAll(filter?: Partial<T>): Promise<T[]>;

  /**
   * Update an existing entity
   */
  update(id: TId, updates: Partial<T>): Promise<T>;

  /**
   * Delete an entity by ID
   */
  delete(id: TId): Promise<boolean>;

  /**
   * Check if entity exists by ID
   */
  exists(id: TId): Promise<boolean>;

  /**
   * Count entities matching the filter
   */
  count(filter?: Partial<T>): Promise<number>;
}

export interface ITransactionRepository {
  /**
   * Execute operations within a transaction
   */
  executeInTransaction<TResult>(
    operation: (transaction: ITransaction) => Promise<TResult>
  ): Promise<TResult>;
}

export interface ITransaction {
  /**
   * Commit the transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback the transaction
   */
  rollback(): Promise<void>;

  /**
   * Check if transaction is active
   */
  isActive(): boolean;
}

export interface IPaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IPaginationOptions {
  page: number;
  pageSize: number;
}

export interface ISortOptions {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface IQueryOptions {
  pagination?: IPaginationOptions;
  sort?: ISortOptions[];
  filter?: Record<string, any>;
}