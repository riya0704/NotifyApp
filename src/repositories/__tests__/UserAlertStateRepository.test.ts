import { UserAlertStateRepository } from '../UserAlertStateRepository';
import { UserAlertState } from '../../models/UserAlertState';

describe('UserAlertStateRepository', () => {
  let repository: UserAlertStateRepository;
  let mockConnectionPool: any;
  let mockClient: any;

  const mockState: UserAlertState = {
    id: 'state-123',
    userId: 'user-456',
    alertId: 'alert-789',
    isRead: false,
    isSnoozed: false,
    snoozeUntil: undefined,
    lastDelivered: undefined,
    deliveryCount: 0,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  };

  const mockRow = {
    id: 'state-123',
    user_id: 'user-456',
    alert_id: 'alert-789',
    is_read: false,
    is_snoozed: false,
    snooze_until: null,
    last_delivered: null,
    delivery_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockConnectionPool = {
      connect: jest.fn().mockResolvedValue(mockClient)
    };

    repository = new UserAlertStateRepository(mockConnectionPool);
  });

  describe('create', () => {
    it('should create a new user alert state successfully', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.create(mockState);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_alert_states'),
        expect.arrayContaining([
          mockState.id,
          mockState.userId,
          mockState.alertId,
          mockState.isRead,
          mockState.isSnoozed
        ])
      );
      expect(result.id).toBe(mockState.id);
      expect(result.userId).toBe(mockState.userId);
    });

    it('should handle upsert on conflict', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      await repository.create(mockState);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (user_id, alert_id) DO UPDATE SET'),
        expect.any(Array)
      );
    });
  });

  describe('findById', () => {
    it('should find user alert state by ID successfully', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findById('state-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM user_alert_states WHERE id = $1',
        ['state-123']
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('state-123');
    });

    it('should return null when state not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user alert state successfully', async () => {
      const updates = { isRead: true, deliveryCount: 5 };
      mockClient.query.mockResolvedValue({ 
        rows: [{ ...mockRow, is_read: true, delivery_count: 5 }] 
      });

      const result = await repository.update('state-123', updates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_alert_states SET is_read = $1, delivery_count = $2, updated_at = $3'),
        [true, 5, expect.any(Date), 'state-123']
      );
      expect(result.isRead).toBe(true);
      expect(result.deliveryCount).toBe(5);
    });

    it('should throw error when no valid fields to update', async () => {
      await expect(repository.update('state-123', {})).rejects.toThrow('No valid fields to update');
    });

    it('should throw error when state not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(repository.update('nonexistent', { isRead: true }))
        .rejects.toThrow('UserAlertState with ID nonexistent not found');
    });
  });

  describe('findByUserId', () => {
    it('should find all states for a user', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findByUserId('user-456');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-456']
      );
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-456');
    });
  });

  describe('findByAlertId', () => {
    it('should find all states for an alert', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findByAlertId('alert-789');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE alert_id = $1'),
        ['alert-789']
      );
      expect(result).toHaveLength(1);
      expect(result[0].alertId).toBe('alert-789');
    });
  });

  describe('findByUserAndAlert', () => {
    it('should find specific user alert state', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findByUserAndAlert('user-456', 'alert-789');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND alert_id = $2'),
        ['user-456', 'alert-789']
      );
      expect(result).not.toBeNull();
      expect(result!.userId).toBe('user-456');
      expect(result!.alertId).toBe('alert-789');
    });

    it('should return null when state not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findByUserAndAlert('user-456', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findSnoozedStates', () => {
    it('should find all snoozed states', async () => {
      const snoozedRow = { ...mockRow, is_snoozed: true };
      mockClient.query.mockResolvedValue({ rows: [snoozedRow] });

      const result = await repository.findSnoozedStates();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_snoozed = true'),
        []
      );
      expect(result).toHaveLength(1);
      expect(result[0].isSnoozed).toBe(true);
    });

    it('should find snoozed states for specific user', async () => {
      const snoozedRow = { ...mockRow, is_snoozed: true };
      mockClient.query.mockResolvedValue({ rows: [snoozedRow] });

      const result = await repository.findSnoozedStates('user-456');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_snoozed = true AND user_id = $1'),
        ['user-456']
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findExpiredSnoozes', () => {
    it('should find expired snooze states', async () => {
      const expiredRow = { 
        ...mockRow, 
        is_snoozed: true, 
        snooze_until: '2024-01-01T00:00:00Z' 
      };
      mockClient.query.mockResolvedValue({ rows: [expiredRow] });

      const result = await repository.findExpiredSnoozes();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_snoozed = true AND snooze_until IS NOT NULL AND snooze_until <= NOW()'),
        []
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple states successfully', async () => {
      const states = [mockState, { ...mockState, id: 'state-456', userId: 'user-789' }];
      const rows = [mockRow, { ...mockRow, id: 'state-456', user_id: 'user-789' }];
      mockClient.query.mockResolvedValue({ rows });

      const result = await repository.bulkCreate(states);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10), ($11, $12, $13, $14, $15, $16, $17, $18, $19, $20)'),
        expect.any(Array)
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.bulkCreate([]);

      expect(result).toEqual([]);
      expect(mockClient.query).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpdateSnoozeStatus', () => {
    it('should update snooze status for multiple users', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 3 });

      const result = await repository.bulkUpdateSnoozeStatus(['user-1', 'user-2', 'user-3'], 'alert-123', true);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SET is_snoozed = $1'),
        [true, 'user-1', 'user-2', 'user-3', 'alert-123']
      );
      expect(result).toBe(3);
    });

    it('should return 0 for empty user list', async () => {
      const result = await repository.bulkUpdateSnoozeStatus([], 'alert-123', true);

      expect(result).toBe(0);
      expect(mockClient.query).not.toHaveBeenCalled();
    });
  });

  describe('resetExpiredSnoozes', () => {
    it('should reset expired snooze states', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 5 });

      const result = await repository.resetExpiredSnoozes();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SET is_snoozed = false, snooze_until = NULL'),
        []
      );
      expect(result).toBe(5);
    });
  });

  describe('getReadStatusStats', () => {
    it('should return read status statistics', async () => {
      mockClient.query.mockResolvedValue({ 
        rows: [{ total_users: '10', read_count: '7', unread_count: '3' }] 
      });

      const result = await repository.getReadStatusStats('alert-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) as total_users'),
        ['alert-123']
      );
      expect(result).toEqual({
        totalUsers: 10,
        readCount: 7,
        unreadCount: 3
      });
    });
  });

  describe('getSnoozeStats', () => {
    it('should return snooze statistics', async () => {
      mockClient.query.mockResolvedValue({ 
        rows: [{ total_users: '10', snoozed_count: '4', active_snoozed_count: '2' }] 
      });

      const result = await repository.getSnoozeStats('alert-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(CASE WHEN is_snoozed = true THEN 1 END) as snoozed_count'),
        ['alert-123']
      );
      expect(result).toEqual({
        totalUsers: 10,
        snoozedCount: 4,
        activeSnoozedCount: 2
      });
    });
  });

  describe('findStatesNeedingReminders', () => {
    it('should find states that need reminder processing', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findStatesNeedingReminders('alert-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE alert_id = $1 AND (is_snoozed = false OR'),
        ['alert-123']
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('recordDelivery', () => {
    it('should record delivery for user alert state', async () => {
      const deliveredRow = { ...mockRow, delivery_count: 1, last_delivered: new Date().toISOString() };
      mockClient.query.mockResolvedValue({ rows: [deliveredRow] });

      const result = await repository.recordDelivery('user-456', 'alert-789');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SET last_delivered = NOW(), delivery_count = delivery_count + 1'),
        ['user-456', 'alert-789']
      );
      expect(result).not.toBeNull();
      expect(result!.deliveryCount).toBe(1);
    });

    it('should return null when state not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.recordDelivery('user-456', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getDeliveryStats', () => {
    it('should return delivery statistics', async () => {
      mockClient.query.mockResolvedValue({ 
        rows: [{ total_deliveries: '25', unique_users: '10', avg_deliveries_per_user: '2.5' }] 
      });

      const result = await repository.getDeliveryStats('alert-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SUM(delivery_count) as total_deliveries'),
        ['alert-123']
      );
      expect(result).toEqual({
        totalDeliveries: 25,
        uniqueUsers: 10,
        avgDeliveriesPerUser: 2.5
      });
    });

    it('should handle null values in statistics', async () => {
      mockClient.query.mockResolvedValue({ 
        rows: [{ total_deliveries: null, unique_users: null, avg_deliveries_per_user: null }] 
      });

      const result = await repository.getDeliveryStats('alert-123');

      expect(result).toEqual({
        totalDeliveries: 0,
        uniqueUsers: 0,
        avgDeliveriesPerUser: 0
      });
    });
  });

  describe('mapResultsToEntities', () => {
    it('should correctly map database rows to UserAlertState entities', () => {
      const rowWithDates = {
        ...mockRow,
        snooze_until: '2024-12-31T23:59:59Z',
        last_delivered: '2024-01-15T10:30:00Z'
      };
      const rows = [rowWithDates];
      const result = (repository as any).mapResultsToEntities(rows);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockRow.id);
      expect(result[0].userId).toBe(mockRow.user_id);
      expect(result[0].alertId).toBe(mockRow.alert_id);
      expect(result[0].isRead).toBe(mockRow.is_read);
      expect(result[0].isSnoozed).toBe(mockRow.is_snoozed);
      expect(result[0].snoozeUntil).toBeInstanceOf(Date);
      expect(result[0].lastDelivered).toBeInstanceOf(Date);
      expect(result[0].deliveryCount).toBe(mockRow.delivery_count);
    });

    it('should handle null dates correctly', () => {
      const rows = [mockRow];
      const result = (repository as any).mapResultsToEntities(rows);

      expect(result[0].snoozeUntil).toBeUndefined();
      expect(result[0].lastDelivered).toBeUndefined();
    });
  });

  describe('mapEntityToRow', () => {
    it('should correctly map UserAlertState entity to database row', () => {
      const stateWithDates = {
        ...mockState,
        snoozeUntil: new Date('2024-12-31T23:59:59Z'),
        lastDelivered: new Date('2024-01-15T10:30:00Z')
      };
      const result = (repository as any).mapEntityToRow(stateWithDates);

      expect(result.id).toBe(stateWithDates.id);
      expect(result.user_id).toBe(stateWithDates.userId);
      expect(result.alert_id).toBe(stateWithDates.alertId);
      expect(result.is_read).toBe(stateWithDates.isRead);
      expect(result.is_snoozed).toBe(stateWithDates.isSnoozed);
      expect(result.snooze_until).toBe(stateWithDates.snoozeUntil);
      expect(result.last_delivered).toBe(stateWithDates.lastDelivered);
      expect(result.delivery_count).toBe(stateWithDates.deliveryCount);
    });
  });
});