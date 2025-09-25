import { AlertRepository } from '../AlertRepository';
import { Alert, AlertFilters, UpdateAlertRequest } from '../../models/Alert';
import { AlertSeverity, AlertStatus, DeliveryType, VisibilityType } from '../../models/enums';

describe('AlertRepository', () => {
  let repository: AlertRepository;
  let mockConnectionPool: any;
  let mockClient: any;

  const mockAlert: Alert = {
    id: 'alert-123',
    title: 'Test Alert',
    message: 'This is a test alert',
    severity: AlertSeverity.WARNING,
    deliveryType: DeliveryType.IN_APP,
    visibility: {
      type: VisibilityType.ORGANIZATION,
      targetIds: ['org-456']
    },
    startTime: new Date('2024-01-01T00:00:00Z'),
    expiryTime: new Date('2024-12-31T23:59:59Z'),
    reminderEnabled: true,
    reminderFrequency: 2,
    createdBy: 'admin-123',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    status: AlertStatus.ACTIVE
  };

  const mockRow = {
    id: 'alert-123',
    title: 'Test Alert',
    message: 'This is a test alert',
    severity: 'warning',
    delivery_type: 'in_app',
    visibility_type: 'organization',
    target_ids: '["org-456"]',
    start_time: '2024-01-01T00:00:00Z',
    expiry_time: '2024-12-31T23:59:59Z',
    reminder_enabled: true,
    reminder_frequency: 2,
    created_by: 'admin-123',
    created_at: '2024-01-01T00:00:00Z',
    status: 'active'
  };

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockConnectionPool = {
      connect: jest.fn().mockResolvedValue(mockClient)
    };

    repository = new AlertRepository(mockConnectionPool);
  });

  // Helper to create a regex that is flexible with whitespace and escapes special chars
  const sql = (query: string) => {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped.replace(/\s+/g, '\\s*'));
  };

  describe('create', () => {
    it('should create a new alert successfully', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.create(mockAlert);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('INSERT INTO alerts')),
        expect.arrayContaining([
          mockAlert.id,
          mockAlert.title,
          mockAlert.message,
          mockAlert.severity,
          mockAlert.deliveryType
        ])
      );
      expect(result.id).toBe(mockAlert.id);
      expect(result.title).toBe(mockAlert.title);
    });

    it('should handle database errors during creation', async () => {
      const error = new Error('Database error');
      mockClient.query.mockRejectedValue(error);

      await expect(repository.create(mockAlert)).rejects.toThrow('Repository create operation failed');
    });
  });

  describe('findById', () => {
    it('should find alert by ID successfully', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findById('alert-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM alerts WHERE id = $1',
        ['alert-123']
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('alert-123');
    });

    it('should return null when alert not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update alert successfully', async () => {
      const updates: UpdateAlertRequest = { title: 'Updated Title', severity: AlertSeverity.CRITICAL };
      mockClient.query.mockResolvedValue({ 
        rows: [{ ...mockRow, title: 'Updated Title', severity: 'critical' }] 
      });

      const result = await repository.update('alert-123', updates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('UPDATE alerts SET title = $1, severity = $2')),
        ['Updated Title', AlertSeverity.CRITICAL, 'alert-123']
      );
      expect(result.title).toBe('Updated Title');
    });

    it('should update visibility configuration', async () => {
      const updates: UpdateAlertRequest = {
        visibility: {
          type: VisibilityType.TEAM,
          targetIds: ['team-123', 'team-456']
        }
      };
      mockClient.query.mockResolvedValue({ 
        rows: [{ 
          ...mockRow, 
          visibility_type: 'team', 
          target_ids: '["team-123","team-456"]' 
        }] 
      });

      const result = await repository.update('alert-123', updates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('visibility_type = $1, target_ids = $2')),
        ['team', '["team-123","team-456"]', 'alert-123']
      );
      expect(result.visibility.type).toBe(VisibilityType.TEAM);
    });

    it('should throw error when no valid fields to update', async () => {
      await expect(repository.update('alert-123', {})).rejects.toThrow('No valid fields to update');
    });

    it('should throw error when alert not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(repository.update('nonexistent', { title: 'New Title' }))
        .rejects.toThrow('Alert with ID nonexistent not found');
    });
  });

  describe('delete', () => {
    it('should delete alert successfully', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 1 });

      const result = await repository.delete('alert-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM alerts WHERE id = $1',
        ['alert-123']
      );
      expect(result).toBe(true);
    });

    it('should return false when alert not found', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 0 });

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('findByVisibility', () => {
    it('should find alerts by organization visibility', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findByVisibility('org-456');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('visibility_type = $2 AND target_ids::jsonb ? $3')),
        [AlertStatus.ACTIVE, VisibilityType.ORGANIZATION, 'org-456']
      );
      expect(result).toHaveLength(1);
    });

    it('should find alerts by organization, team, and user visibility', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findByVisibility('org-456', 'team-123', 'user-789');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('OR (visibility_type = $4 AND target_ids::jsonb ? $5)')),
        [
          AlertStatus.ACTIVE, 
          VisibilityType.ORGANIZATION, 'org-456',
          VisibilityType.TEAM, 'team-123',
          VisibilityType.USER, 'user-789'
        ]
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findActiveAlerts', () => {
    it('should find all active alerts', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findActiveAlerts();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('WHERE status = $1 AND start_time <= NOW() AND expiry_time > NOW()')),
        [AlertStatus.ACTIVE]
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findExpiredAlerts', () => {
    it('should find expired alerts', async () => {
      const expiredRow = { ...mockRow, status: 'expired' };
      mockClient.query.mockResolvedValue({ rows: [expiredRow] });

      const result = await repository.findExpiredAlerts();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('WHERE (status = $1 AND expiry_time <= NOW()) OR status = $2')),
        [AlertStatus.ACTIVE, AlertStatus.EXPIRED]
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findByCreator', () => {
    it('should find alerts by creator', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findByCreator('admin-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('WHERE created_by = $1')),
        ['admin-123']
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findWithFilters', () => {
    it('should find alerts with severity filter', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const filters: AlertFilters = { severity: AlertSeverity.WARNING };
      const result = await repository.findWithFilters(filters);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('WHERE severity = $1')),
        [AlertSeverity.WARNING]
      );
      expect(result).toHaveLength(1);
    });

    it('should find alerts with multiple filters', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const filters: AlertFilters = {
        severity: AlertSeverity.WARNING,
        status: AlertStatus.ACTIVE,
        createdBy: 'admin-123'
      };
      const result = await repository.findWithFilters(filters);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('WHERE severity = $1 AND status = $2 AND created_by = $3')),
        [AlertSeverity.WARNING, AlertStatus.ACTIVE, 'admin-123']
      );
      expect(result).toHaveLength(1);
    });

    it('should find alerts with date range filters', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const filters: AlertFilters = { startDate, endDate };
      
      const result = await repository.findWithFilters(filters);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('WHERE created_at >= $1 AND created_at <= $2')),
        [startDate, endDate]
      );
      expect(result).toHaveLength(1);
    });

    it('should find all alerts when no filters provided', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findWithFilters({});

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM alerts ORDER BY created_at DESC',
        []
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('archiveAlert', () => {
    it('should archive alert successfully', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 1 });

      const result = await repository.archiveAlert('alert-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('SET status = $1 WHERE id = $2 AND status != $3')),
        [AlertStatus.ARCHIVED, 'alert-123', AlertStatus.ARCHIVED]
      );
      expect(result).toBe(true);
    });

    it('should return false when alert already archived', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 0 });

      const result = await repository.archiveAlert('alert-123');

      expect(result).toBe(false);
    });
  });

  describe('markAsExpired', () => {
    it('should mark alert as expired successfully', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 1 });

      const result = await repository.markAsExpired('alert-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('SET status = $1 WHERE id = $2 AND status = $3')),
        [AlertStatus.EXPIRED, 'alert-123', AlertStatus.ACTIVE]
      );
      expect(result).toBe(true);
    });

    it('should return false when alert is not active', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 0 });

      const result = await repository.markAsExpired('alert-123');

      expect(result).toBe(false);
    });
  });

  describe('findAlertsForUser', () => {
    it('should find alerts for specific user', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findAlertsForUser('user-123', 'team-456', 'org-789');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('ORDER BY severity DESC, created_at DESC')),
        [
          AlertStatus.ACTIVE,
          VisibilityType.ORGANIZATION, 'org-789',
          VisibilityType.TEAM, 'team-456',
          VisibilityType.USER, 'user-123'
        ]
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('markExpiredAlerts', () => {
    it('should mark multiple alerts as expired', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 3 });

      const result = await repository.markExpiredAlerts();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('SET status = $1 WHERE status = $2 AND expiry_time <= NOW()')),
        [AlertStatus.EXPIRED, AlertStatus.ACTIVE]
      );
      expect(result).toBe(3);
    });
  });

  describe('findAlertsNeedingReminders', () => {
    it('should find alerts that need reminder processing', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findAlertsNeedingReminders();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(sql('WHERE status = $1 AND reminder_enabled = true')),
        [AlertStatus.ACTIVE]
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('mapResultsToEntities', () => {
    it('should correctly map database rows to Alert entities', () => {
      const rows = [mockRow];
      const result = (repository as any).mapResultsToEntities(rows);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockRow.id);
      expect(result[0].severity).toBe(AlertSeverity.WARNING);
      expect(result[0].visibility.type).toBe(VisibilityType.ORGANIZATION);
      expect(result[0].visibility.targetIds).toEqual(['org-456']);
      expect(result[0].startTime).toBeInstanceOf(Date);
    });
  });

  describe('mapEntityToRow', () => {
    it('should correctly map Alert entity to database row', () => {
      const result = (repository as any).mapEntityToRow(mockAlert);

      expect(result.id).toBe(mockAlert.id);
      expect(result.severity).toBe(mockAlert.severity);
      expect(result.visibility_type).toBe(mockAlert.visibility.type);
      expect(result.target_ids).toBe('["org-456"]');
      expect(result.delivery_type).toBe(mockAlert.deliveryType);
    });
  });
});
