import { BaseRepository } from '../BaseRepository';
import type { Pool, PoolClient, QueryResult } from 'pg';

// Define a concrete implementation of BaseRepository for testing
class TestRepository extends BaseRepository<any> {
  protected getTableName(): string {
    return 'test_table';
  }

  protected mapResultsToEntities(rows: any[]): any[] {
    return rows;
  }

  protected mapEntityToRow(entity: any): Record<string, any> {
    return entity;
  }
}

describe('BaseRepository', () => {
  let mockPoolClient: jest.Mocked<PoolClient>;
  let mockPool: jest.Mocked<Pool>;
  let repository: TestRepository;

  beforeEach(() => {
    mockPoolClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as any;

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockPoolClient),
    } as any;

    repository = new TestRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new entity', async () => {
      const entity = { name: 'Test' };
      const queryResult: QueryResult = {
        rows: [{ id: '1', ...entity }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      };
      mockPoolClient.query.mockImplementationOnce(() => Promise.resolve(queryResult));

      const result = await repository.create(entity);

      expect(result.id).toEqual(expect.any(String));
      expect(result.name).toEqual(entity.name);
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockPoolClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO test_table'),
        expect.any(Array)
      );
      expect(mockPoolClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find an entity by ID', async () => {
      const entity = { id: '1', name: 'Test' };
      const queryResult: QueryResult = {
        rows: [entity],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };
      mockPoolClient.query.mockImplementationOnce(() => Promise.resolve(queryResult));

      const result = await repository.findById('1');

      expect(result).toEqual(entity);
      expect(mockPoolClient.query).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE id = $1',
        ['1']
      );
    });

    it('should return null if entity is not found', async () => {
      const queryResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };
      mockPoolClient.query.mockImplementationOnce(() => Promise.resolve(queryResult));

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an entity', async () => {
      const updates = { name: 'Updated Test' };
      const updatedEntity = { id: '1', name: 'Updated Test' };
      const queryResult: QueryResult = {
        rows: [updatedEntity],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      };
      mockPoolClient.query.mockImplementationOnce(() => Promise.resolve(queryResult));

      const result = await repository.update('1', updates);

      expect(result).toEqual(updatedEntity);
      expect(mockPoolClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE test_table'),
        expect.any(Array)
      );
    });

    it('should throw an error if no valid fields to update', async () => {
      await expect(repository.update('1', {})).rejects.toThrow('No valid fields to update');
    });

    it('should throw an error if entity to update is not found', async () => {
      const queryResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      };
      mockPoolClient.query.mockImplementationOnce(() => Promise.resolve(queryResult));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(repository.update('nonexistent', { name: 'test' })).rejects.toThrow('Repository update operation failed');
      consoleSpy.mockRestore();
    });
  });

  describe('delete', () => {
    it('should delete an entity', async () => {
      const queryResult: QueryResult = {
        rows: [],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: [],
      };
      mockPoolClient.query.mockImplementationOnce(() => Promise.resolve(queryResult));

      const result = await repository.delete('1');

      expect(result).toBe(true);
      expect(mockPoolClient.query).toHaveBeenCalledWith(
        'DELETE FROM test_table WHERE id = $1',
        ['1']
      );
    });

    it('should return false if entity to delete is not found', async () => {
      const queryResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'DELETE',
        oid: 0,
        fields: [],
      };
      mockPoolClient.query.mockImplementationOnce(() => Promise.resolve(queryResult));

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should find all entities', async () => {
      const entities = [{ id: '1', name: 'Test 1' }, { id: '2', name: 'Test 2' }];
      const queryResult: QueryResult = {
        rows: entities,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };
      mockPoolClient.query.mockImplementationOnce(() => Promise.resolve(queryResult));

      const result = await repository.findAll();

      expect(result).toEqual(entities);
      expect(mockPoolClient.query).toHaveBeenCalledWith('SELECT * FROM test_table', []);
    });
  });
});
