import { BaseRepository } from '../BaseRepository';
import { IQueryOptions } from '../IRepository';

// Mock entity for testing
interface TestEntity {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// Concrete implementation for testing
class TestRepository extends BaseRepository<TestEntity> {
  protected getTableName(): string {
    return 'test_entities';
  }

  protected mapResultsToEntities(rows: any[]): TestEntity[] {
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: new Date(row.created_at)
    }));
  }

  protected mapEntityToRow(entity: TestEntity): Record<string, any> {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      created_at: entity.createdAt
    };
  }

  async create(entity: TestEntity): Promise<TestEntity> {
    const row = this.mapEntityToRow(entity);
    const sql = `INSERT INTO ${this.getTableName()} (id, name, email, created_at) VALUES ($1, $2, $3, $4) RETURNING *`;
    const result = await this.executeQuery(sql, [row.id, row.name, row.email, row.created_at]);
    return this.mapResultsToEntities(result.rows)[0];
  }

  async findById(id: string): Promise<TestEntity | null> {
    const sql = `SELECT * FROM ${this.getTableName()} WHERE id = $1`;
    const result = await this.executeQuery(sql, [id]);
    const entities = this.mapResultsToEntities(result.rows);
    return entities.length > 0 ? entities[0] : null;
  }

  async update(id: string, updates: Partial<TestEntity>): Promise<TestEntity> {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        setClauses.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    params.push(id);
    const sql = `UPDATE ${this.getTableName()} SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.executeQuery(sql, params);
    return this.mapResultsToEntities(result.rows)[0];
  }

  async delete(id: string): Promise<boolean> {
    const sql = `DELETE FROM ${this.getTableName()} WHERE id = $1`;
    const result = await this.executeQuery(sql, [id]);
    return result.rowCount > 0;
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let mockConnectionPool: any;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockConnectionPool = {
      connect: jest.fn().mockResolvedValue(mockClient)
    };

    repository = new TestRepository(mockConnectionPool);
  });

  describe('findAll', () => {
    it('should find all entities without filter', async () => {
      const mockRows = [
        { id: '1', name: 'John', email: 'john@test.com', created_at: new Date() },
        { id: '2', name: 'Jane', email: 'jane@test.com', created_at: new Date() }
      ];

      mockClient.query.mockResolvedValue({ rows: mockRows });

      const result = await repository.findAll();

      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM test_entities', []);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John');
      expect(result[1].name).toBe('Jane');
    });

    it('should find entities with filter', async () => {
      const mockRows = [
        { id: '1', name: 'John', email: 'john@test.com', created_at: new Date() }
      ];

      mockClient.query.mockResolvedValue({ rows: mockRows });

      const filter = { name: 'John' };
      const result = await repository.findAll(filter);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE name = $1',
        ['John']
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John');
    });

    it('should handle empty results', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findAll();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockClient.query.mockRejectedValue(error);

      await expect(repository.findAll()).rejects.toThrow('Repository findAll operation failed');
    });
  });

  describe('exists', () => {
    it('should return true when entity exists', async () => {
      const mockRow = { id: '1', name: 'John', email: 'john@test.com', created_at: new Date() };
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.exists('1');

      expect(result).toBe(true);
    });

    it('should return false when entity does not exist', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.exists('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count all entities without filter', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ count: '5' }] });

      const result = await repository.count();

      expect(mockClient.query).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM test_entities', []);
      expect(result).toBe(5);
    });

    it('should count entities with filter', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ count: '2' }] });

      const filter = { name: 'John' };
      const result = await repository.count(filter);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM test_entities WHERE name = $1',
        ['John']
      );
      expect(result).toBe(2);
    });
  });

  describe('findWithOptions', () => {
    it('should find entities with pagination', async () => {
      const mockRows = [
        { id: '1', name: 'John', email: 'john@test.com', created_at: new Date() }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: mockRows }) // Data query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }); // Count query

      const options: IQueryOptions = {
        pagination: { page: 1, pageSize: 5 }
      };

      const result = await repository.findWithOptions(options);

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(5);
      expect(result.totalPages).toBe(2);
    });

    it('should find entities with sorting', async () => {
      const mockRows = [
        { id: '1', name: 'John', email: 'john@test.com', created_at: new Date() }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: mockRows })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const options: IQueryOptions = {
        sort: [{ field: 'name', direction: 'ASC' }]
      };

      await repository.findWithOptions(options);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM test_entities ORDER BY name ASC',
        []
      );
    });

    it('should find entities with filter, sorting, and pagination', async () => {
      const mockRows = [
        { id: '1', name: 'John', email: 'john@test.com', created_at: new Date() }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: mockRows })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] });

      const options: IQueryOptions = {
        filter: { name: 'John' },
        sort: [{ field: 'email', direction: 'DESC' }],
        pagination: { page: 2, pageSize: 2 }
      };

      await repository.findWithOptions(options);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE name = $1 ORDER BY email DESC LIMIT $2 OFFSET $3',
        ['John', 2, 2]
      );
    });
  });

  describe('executeInTransaction', () => {
    it('should execute operation in transaction and commit on success', async () => {
      const transactionClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn()
      };

      mockConnectionPool.connect.mockResolvedValue(transactionClient);

      const operation = jest.fn().mockResolvedValue('success');

      const result = await repository.executeInTransaction(operation);

      expect(transactionClient.query).toHaveBeenCalledWith('BEGIN');
      expect(operation).toHaveBeenCalled();
      expect(transactionClient.query).toHaveBeenCalledWith('COMMIT');
      expect(transactionClient.release).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    it('should rollback transaction on operation failure', async () => {
      const transactionClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn()
      };

      mockConnectionPool.connect.mockResolvedValue(transactionClient);

      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(repository.executeInTransaction(operation)).rejects.toThrow('Repository transaction operation failed');

      expect(transactionClient.query).toHaveBeenCalledWith('BEGIN');
      expect(transactionClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(transactionClient.release).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle unique constraint violation', async () => {
      const error = { code: '23505', detail: 'Key (email)=(test@test.com) already exists.' };
      mockClient.query.mockRejectedValue(error);

      await expect(repository.findAll()).rejects.toThrow('Duplicate entry');
    });

    it('should handle foreign key constraint violation', async () => {
      const error = { code: '23503', detail: 'Key (user_id)=(123) is not present in table "users".' };
      mockClient.query.mockRejectedValue(error);

      await expect(repository.findAll()).rejects.toThrow('Foreign key constraint violation');
    });

    it('should handle not null constraint violation', async () => {
      const error = { code: '23502', column: 'name' };
      mockClient.query.mockRejectedValue(error);

      await expect(repository.findAll()).rejects.toThrow('Required field missing: name');
    });

    it('should handle generic database errors', async () => {
      const error = { message: 'Connection timeout' };
      mockClient.query.mockRejectedValue(error);

      await expect(repository.findAll()).rejects.toThrow('Repository findAll operation failed');
    });
  });

  describe('query building', () => {
    it('should build query with multiple filter conditions', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const filter = { name: 'John', email: 'john@test.com' };
      await repository.findAll(filter);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE name = $1 AND email = $2',
        ['John', 'john@test.com']
      );
    });

    it('should ignore undefined and null filter values', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const filter = { name: 'John', email: undefined, id: undefined };
      await repository.findAll(filter);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE name = $1',
        ['John']
      );
    });

    it('should build count query correctly', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ count: '0' }] });

      const filter = { name: 'John' };
      await repository.count(filter);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM test_entities WHERE name = $1',
        ['John']
      );
    });
  });

  describe('validation', () => {
    it('should validate entity is not null', () => {
      expect(() => (repository as any).validateEntity(null)).toThrow('Entity cannot be null or undefined');
    });

    it('should validate entity is not undefined', () => {
      expect(() => (repository as any).validateEntity(undefined)).toThrow('Entity cannot be null or undefined');
    });

    it('should pass validation for valid entity', () => {
      const entity = { id: '1', name: 'John' };
      expect(() => (repository as any).validateEntity(entity)).not.toThrow();
    });
  });
});