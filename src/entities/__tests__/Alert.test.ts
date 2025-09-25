import { AlertEntity } from '../Alert';
import { CreateAlertRequest, UpdateAlertRequest } from '../../models/Alert';
import { AlertSeverity, AlertStatus, DeliveryType, VisibilityType } from '../../models/enums';

describe('AlertEntity', () => {
  const validCreateRequest: CreateAlertRequest = {
    title: 'Test Alert',
    message: 'This is a test alert message',
    severity: AlertSeverity.INFO,
    deliveryType: DeliveryType.IN_APP,
    visibility: {
      type: VisibilityType.ORGANIZATION,
      targetIds: ['org-123']
    },
    startTime: new Date(Date.now() - 1000), // 1 second in the past
    expiryTime: new Date(Date.now() + 86400000), // 24 hours from now
    reminderEnabled: true,
    reminderFrequency: 2
  };

  const createdBy = 'admin-user-123';

  describe('constructor', () => {
    it('should create a valid alert with all required properties', () => {
      const alert = new AlertEntity(validCreateRequest, createdBy);

      expect(alert.id).toBeDefined();
      expect(alert.title).toBe(validCreateRequest.title);
      expect(alert.message).toBe(validCreateRequest.message);
      expect(alert.severity).toBe(validCreateRequest.severity);
      expect(alert.deliveryType).toBe(validCreateRequest.deliveryType);
      expect(alert.visibility).toEqual(validCreateRequest.visibility);
      expect(alert.startTime).toBe(validCreateRequest.startTime);
      expect(alert.expiryTime).toBe(validCreateRequest.expiryTime);
      expect(alert.reminderEnabled).toBe(true);
      expect(alert.reminderFrequency).toBe(2);
      expect(alert.createdBy).toBe(createdBy);
      expect(alert.createdAt).toBeInstanceOf(Date);
      expect(alert.status).toBe(AlertStatus.ACTIVE);
    });

    it('should set default values for optional properties', () => {
      const requestWithoutOptionals = { ...validCreateRequest };
      delete requestWithoutOptionals.reminderEnabled;
      delete requestWithoutOptionals.reminderFrequency;

      const alert = new AlertEntity(requestWithoutOptionals, createdBy);

      expect(alert.reminderEnabled).toBe(true);
      expect(alert.reminderFrequency).toBe(2);
    });

    it('should trim whitespace from title and message', () => {
      const requestWithWhitespace = {
        ...validCreateRequest,
        title: '  Test Alert  ',
        message: '  This is a test message  '
      };

      const alert = new AlertEntity(requestWithWhitespace, createdBy);

      expect(alert.title).toBe('Test Alert');
      expect(alert.message).toBe('This is a test message');
    });
  });

  describe('validation', () => {
    describe('title validation', () => {
      it('should throw error for empty title', () => {
        const request = { ...validCreateRequest, title: '' };
        expect(() => new AlertEntity(request, createdBy)).toThrow('Alert title is required');
      });

      it('should throw error for whitespace-only title', () => {
        const request = { ...validCreateRequest, title: '   ' };
        expect(() => new AlertEntity(request, createdBy)).toThrow('Alert title is required');
      });

      it('should throw error for title longer than 255 characters', () => {
        const request = { ...validCreateRequest, title: 'a'.repeat(256) };
        expect(() => new AlertEntity(request, createdBy)).toThrow('Alert title must be 255 characters or less');
      });
    });

    describe('message validation', () => {
      it('should throw error for empty message', () => {
        const request = { ...validCreateRequest, message: '' };
        expect(() => new AlertEntity(request, createdBy)).toThrow('Alert message is required');
      });

      it('should throw error for message longer than 5000 characters', () => {
        const request = { ...validCreateRequest, message: 'a'.repeat(5001) };
        expect(() => new AlertEntity(request, createdBy)).toThrow('Alert message must be 5000 characters or less');
      });
    });

    describe('severity validation', () => {
      it('should throw error for invalid severity', () => {
        const request = { ...validCreateRequest, severity: 'invalid' as AlertSeverity };
        expect(() => new AlertEntity(request, createdBy)).toThrow('Invalid alert severity');
      });
    });

    describe('delivery type validation', () => {
      it('should throw error for invalid delivery type', () => {
        const request = { ...validCreateRequest, deliveryType: 'invalid' as DeliveryType };
        expect(() => new AlertEntity(request, createdBy)).toThrow('Invalid delivery type');
      });
    });

    describe('visibility validation', () => {
      it('should throw error for invalid visibility type', () => {
        const request = {
          ...validCreateRequest,
          visibility: { type: 'invalid' as VisibilityType, targetIds: ['test'] }
        };
        expect(() => new AlertEntity(request, createdBy)).toThrow('Invalid visibility type');
      });

      it('should throw error for empty target IDs', () => {
        const request = {
          ...validCreateRequest,
          visibility: { type: VisibilityType.TEAM, targetIds: [] }
        };
        expect(() => new AlertEntity(request, createdBy)).toThrow('At least one target ID is required');
      });

      it('should throw error for empty string in target IDs', () => {
        const request = {
          ...validCreateRequest,
          visibility: { type: VisibilityType.TEAM, targetIds: ['valid-id', ''] }
        };
        expect(() => new AlertEntity(request, createdBy)).toThrow('All target IDs must be non-empty strings');
      });
    });

    describe('time validation', () => {
      it('should throw error when start time is after expiry time', () => {
        const request = {
          ...validCreateRequest,
          startTime: new Date(Date.now() + 86400000),
          expiryTime: new Date(Date.now() + 1000)
        };
        expect(() => new AlertEntity(request, createdBy)).toThrow('Alert start time must be before expiry time');
      });

      it('should throw error when expiry time is in the past', () => {
        const request = {
          ...validCreateRequest,
          expiryTime: new Date(Date.now() - 1000)
        };
        expect(() => new AlertEntity(request, createdBy)).toThrow('Alert expiry time must be in the future');
      });
    });

    describe('reminder frequency validation', () => {
      it('should throw error for zero reminder frequency', () => {
        const request = { ...validCreateRequest, reminderFrequency: 0 };
        expect(() => new AlertEntity(request, createdBy)).toThrow('Reminder frequency must be greater than 0');
      });

      it('should throw error for negative reminder frequency', () => {
        const request = { ...validCreateRequest, reminderFrequency: -1 };
        expect(() => new AlertEntity(request, createdBy)).toThrow('Reminder frequency must be greater than 0');
      });
    });
  });

  describe('update', () => {
    let alert: AlertEntity;

    beforeEach(() => {
      alert = new AlertEntity(validCreateRequest, createdBy);
    });

    it('should update title successfully', () => {
      const updateRequest: UpdateAlertRequest = { title: 'Updated Title' };
      alert.update(updateRequest);
      expect(alert.title).toBe('Updated Title');
    });

    it('should update message successfully', () => {
      const updateRequest: UpdateAlertRequest = { message: 'Updated message' };
      alert.update(updateRequest);
      expect(alert.message).toBe('Updated message');
    });

    it('should update severity successfully', () => {
      const updateRequest: UpdateAlertRequest = { severity: AlertSeverity.CRITICAL };
      alert.update(updateRequest);
      expect(alert.severity).toBe(AlertSeverity.CRITICAL);
    });

    it('should validate updated fields', () => {
      const updateRequest: UpdateAlertRequest = { title: '' };
      expect(() => alert.update(updateRequest)).toThrow('Alert title cannot be empty');
    });

    it('should trim whitespace in updated fields', () => {
      const updateRequest: UpdateAlertRequest = { title: '  Updated Title  ' };
      alert.update(updateRequest);
      expect(alert.title).toBe('Updated Title');
    });
  });

  describe('status methods', () => {
    let alert: AlertEntity;

    beforeEach(() => {
      alert = new AlertEntity(validCreateRequest, createdBy);
    });

    describe('archive', () => {
      it('should set status to archived', () => {
        alert.archive();
        expect(alert.status).toBe(AlertStatus.ARCHIVED);
      });
    });

    describe('isActive', () => {
      it('should return true for active alert within time range', () => {
        expect(alert.isActive()).toBe(true);
      });

      it('should return false for archived alert', () => {
        alert.archive();
        expect(alert.isActive()).toBe(false);
      });

      it('should return false for alert before start time', () => {
        alert.startTime = new Date(Date.now() + 86400000); // 24 hours from now
        expect(alert.isActive()).toBe(false);
      });
    });

    describe('isExpired', () => {
      it('should return false for active alert', () => {
        expect(alert.isExpired()).toBe(false);
      });

      it('should return true for expired status', () => {
        alert.markExpired();
        expect(alert.isExpired()).toBe(true);
      });
    });

    describe('markExpired', () => {
      it('should set status to expired', () => {
        alert.markExpired();
        expect(alert.status).toBe(AlertStatus.EXPIRED);
      });
    });
  });

  describe('fromData', () => {
    it('should create AlertEntity from data object', () => {
      const data = {
        id: 'test-id',
        title: 'Test Alert',
        message: 'Test message',
        severity: AlertSeverity.WARNING,
        deliveryType: DeliveryType.IN_APP,
        visibility: { type: VisibilityType.USER, targetIds: ['user-123'] },
        startTime: new Date(),
        expiryTime: new Date(Date.now() + 86400000),
        reminderEnabled: true,
        reminderFrequency: 4,
        createdBy: 'admin',
        createdAt: new Date(),
        status: AlertStatus.ACTIVE
      };

      const alert = AlertEntity.fromData(data);

      expect(alert.id).toBe(data.id);
      expect(alert.title).toBe(data.title);
      expect(alert.severity).toBe(data.severity);
      expect(alert instanceof AlertEntity).toBe(true);
    });
  });
});