import { UserAlertStateEntity } from '../UserAlertState';
import { CreateUserAlertStateRequest, UpdateUserAlertStateRequest } from '../../models/UserAlertState';

describe('UserAlertStateEntity', () => {
  const validCreateRequest: CreateUserAlertStateRequest = {
    userId: 'user-123',
    alertId: 'alert-456'
  };

  describe('constructor', () => {
    it('should create a valid user alert state with default values', () => {
      const state = new UserAlertStateEntity(validCreateRequest);

      expect(state.id).toBeDefined();
      expect(state.userId).toBe(validCreateRequest.userId);
      expect(state.alertId).toBe(validCreateRequest.alertId);
      expect(state.isRead).toBe(false);
      expect(state.isSnoozed).toBe(false);
      expect(state.snoozeUntil).toBeUndefined();
      expect(state.lastDelivered).toBeUndefined();
      expect(state.deliveryCount).toBe(0);
      expect(state.createdAt).toBeInstanceOf(Date);
      expect(state.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('validation', () => {
    it('should throw error for empty userId', () => {
      const request = { ...validCreateRequest, userId: '' };
      expect(() => new UserAlertStateEntity(request)).toThrow('User ID is required');
    });

    it('should throw error for whitespace-only userId', () => {
      const request = { ...validCreateRequest, userId: '   ' };
      expect(() => new UserAlertStateEntity(request)).toThrow('User ID is required');
    });

    it('should throw error for empty alertId', () => {
      const request = { ...validCreateRequest, alertId: '' };
      expect(() => new UserAlertStateEntity(request)).toThrow('Alert ID is required');
    });

    it('should throw error for whitespace-only alertId', () => {
      const request = { ...validCreateRequest, alertId: '   ' };
      expect(() => new UserAlertStateEntity(request)).toThrow('Alert ID is required');
    });
  });

  describe('update', () => {
    let state: UserAlertStateEntity;

    beforeEach(() => {
      state = new UserAlertStateEntity(validCreateRequest);
    });

    it('should update isRead successfully', () => {
      const updateRequest: UpdateUserAlertStateRequest = { isRead: true };
      const originalUpdatedAt = state.updatedAt;
      
      setTimeout(() => {
        state.update(updateRequest);
        expect(state.isRead).toBe(true);
        expect(state.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 1);
    });

    it('should update isSnoozed successfully', () => {
      const updateRequest: UpdateUserAlertStateRequest = { isSnoozed: true };
      state.update(updateRequest);
      expect(state.isSnoozed).toBe(true);
    });

    it('should update snoozeUntil successfully', () => {
      const futureDate = new Date(Date.now() + 86400000);
      const updateRequest: UpdateUserAlertStateRequest = { snoozeUntil: futureDate };
      state.update(updateRequest);
      expect(state.snoozeUntil).toBe(futureDate);
    });

    it('should update deliveryCount successfully', () => {
      const updateRequest: UpdateUserAlertStateRequest = { deliveryCount: 5 };
      state.update(updateRequest);
      expect(state.deliveryCount).toBe(5);
    });

    it('should validate negative delivery count', () => {
      const updateRequest: UpdateUserAlertStateRequest = { deliveryCount: -1 };
      expect(() => state.update(updateRequest)).toThrow('Delivery count cannot be negative');
    });

    it('should validate snooze time in past', () => {
      const pastDate = new Date(Date.now() - 1000);
      const updateRequest: UpdateUserAlertStateRequest = { snoozeUntil: pastDate };
      expect(() => state.update(updateRequest)).toThrow('Snooze time must be in the future');
    });
  });

  describe('read/unread methods', () => {
    let state: UserAlertStateEntity;

    beforeEach(() => {
      state = new UserAlertStateEntity(validCreateRequest);
    });

    describe('markAsRead', () => {
      it('should set isRead to true and update timestamp', () => {
        const originalUpdatedAt = state.updatedAt;
        
        setTimeout(() => {
          state.markAsRead();
          expect(state.isRead).toBe(true);
          expect(state.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        }, 1);
      });
    });

    describe('markAsUnread', () => {
      it('should set isRead to false and update timestamp', () => {
        state.markAsRead();
        const originalUpdatedAt = state.updatedAt;
        
        setTimeout(() => {
          state.markAsUnread();
          expect(state.isRead).toBe(false);
          expect(state.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        }, 1);
      });
    });
  });

  describe('snooze methods', () => {
    let state: UserAlertStateEntity;

    beforeEach(() => {
      state = new UserAlertStateEntity(validCreateRequest);
    });

    describe('snoozeForDay', () => {
      it('should set snooze until end of current day', () => {
        const originalUpdatedAt = state.updatedAt;
        
        setTimeout(() => {
          state.snoozeForDay();
          
          expect(state.isSnoozed).toBe(true);
          expect(state.snoozeUntil).toBeDefined();
          expect(state.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
          
          // Check that snooze time is set to end of day
          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999);
          expect(state.snoozeUntil!.getHours()).toBe(23);
          expect(state.snoozeUntil!.getMinutes()).toBe(59);
        }, 1);
      });
    });

    describe('snoozeUntilTime', () => {
      it('should set snooze until specified time', () => {
        const futureTime = new Date(Date.now() + 3600000); // 1 hour from now
        const originalUpdatedAt = state.updatedAt;
        
        setTimeout(() => {
          state.snoozeUntilTime(futureTime);
          
          expect(state.isSnoozed).toBe(true);
          expect(state.snoozeUntil).toBe(futureTime);
          expect(state.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        }, 1);
      });

      it('should throw error for past time', () => {
        const pastTime = new Date(Date.now() - 1000);
        expect(() => state.snoozeUntilTime(pastTime)).toThrow('Snooze time must be in the future');
      });
    });

    describe('unsnooze', () => {
      it('should clear snooze state and update timestamp', () => {
        state.snoozeForDay();
        const originalUpdatedAt = state.updatedAt;
        
        setTimeout(() => {
          state.unsnooze();
          
          expect(state.isSnoozed).toBe(false);
          expect(state.snoozeUntil).toBeUndefined();
          expect(state.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        }, 1);
      });
    });
  });

  describe('delivery tracking', () => {
    let state: UserAlertStateEntity;

    beforeEach(() => {
      state = new UserAlertStateEntity(validCreateRequest);
    });

    describe('recordDelivery', () => {
      it('should increment delivery count and set last delivered time', () => {
        const originalUpdatedAt = state.updatedAt;
        
        setTimeout(() => {
          state.recordDelivery();
          
          expect(state.deliveryCount).toBe(1);
          expect(state.lastDelivered).toBeInstanceOf(Date);
          expect(state.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        }, 1);
      });

      it('should increment delivery count on multiple calls', () => {
        state.recordDelivery();
        state.recordDelivery();
        state.recordDelivery();
        
        expect(state.deliveryCount).toBe(3);
      });
    });

    describe('hasBeenDelivered', () => {
      it('should return false initially', () => {
        expect(state.hasBeenDelivered()).toBe(false);
      });

      it('should return true after delivery', () => {
        state.recordDelivery();
        expect(state.hasBeenDelivered()).toBe(true);
      });
    });

    describe('getTimeSinceLastDelivery', () => {
      it('should return null when no delivery recorded', () => {
        expect(state.getTimeSinceLastDelivery()).toBeNull();
      });

      it('should return time difference after delivery', () => {
        state.recordDelivery();
        const timeSince = state.getTimeSinceLastDelivery();
        
        expect(timeSince).toBeGreaterThanOrEqual(0);
        expect(timeSince).toBeLessThan(1000); // Should be very recent
      });
    });
  });

  describe('snooze status methods', () => {
    let state: UserAlertStateEntity;

    beforeEach(() => {
      state = new UserAlertStateEntity(validCreateRequest);
    });

    describe('isCurrentlySnoozed', () => {
      it('should return false when not snoozed', () => {
        expect(state.isCurrentlySnoozed()).toBe(false);
      });

      it('should return true when snoozed without time limit', () => {
        state.update({ isSnoozed: true });
        expect(state.isCurrentlySnoozed()).toBe(true);
      });

      it('should return true when snoozed with future time', () => {
        const futureTime = new Date(Date.now() + 3600000);
        state.snoozeUntilTime(futureTime);
        expect(state.isCurrentlySnoozed()).toBe(true);
      });

      it('should return false when snooze time has expired', () => {
        // Set snooze time to 1ms in the future, then wait
        const nearFuture = new Date(Date.now() + 1);
        state.snoozeUntilTime(nearFuture);
        
        setTimeout(() => {
          expect(state.isCurrentlySnoozed()).toBe(false);
        }, 10);
      });
    });

    describe('shouldReceiveReminder', () => {
      it('should return true when not snoozed', () => {
        expect(state.shouldReceiveReminder()).toBe(true);
      });

      it('should return false when currently snoozed', () => {
        state.snoozeForDay();
        expect(state.shouldReceiveReminder()).toBe(false);
      });
    });

    describe('getSnoozeTimeRemaining', () => {
      it('should return 0 when not snoozed', () => {
        expect(state.getSnoozeTimeRemaining()).toBe(0);
      });

      it('should return 0 when snooze has expired', () => {
        const pastTime = new Date(Date.now() - 1000);
        state.update({ isSnoozed: true, snoozeUntil: pastTime });
        expect(state.getSnoozeTimeRemaining()).toBe(0);
      });

      it('should return positive value when snoozed with future time', () => {
        const futureTime = new Date(Date.now() + 3600000); // 1 hour
        state.snoozeUntilTime(futureTime);
        
        const remaining = state.getSnoozeTimeRemaining();
        expect(remaining).toBeGreaterThan(3590000); // Should be close to 1 hour
        expect(remaining).toBeLessThanOrEqual(3600000);
      });
    });

    describe('resetSnoozeIfExpired', () => {
      it('should return false when not snoozed', () => {
        expect(state.resetSnoozeIfExpired()).toBe(false);
      });

      it('should return false when snooze is still active', () => {
        const futureTime = new Date(Date.now() + 3600000);
        state.snoozeUntilTime(futureTime);
        expect(state.resetSnoozeIfExpired()).toBe(false);
      });

      it('should return true and reset when snooze has expired', () => {
        const pastTime = new Date(Date.now() - 1000);
        state.update({ isSnoozed: true, snoozeUntil: pastTime });
        
        expect(state.resetSnoozeIfExpired()).toBe(true);
        expect(state.isSnoozed).toBe(false);
        expect(state.snoozeUntil).toBeUndefined();
      });
    });
  });

  describe('getStateInfo', () => {
    let state: UserAlertStateEntity;

    beforeEach(() => {
      state = new UserAlertStateEntity(validCreateRequest);
    });

    it('should return complete state information', () => {
      state.markAsRead();
      state.recordDelivery();
      state.snoozeForDay();
      
      const stateInfo = state.getStateInfo();
      
      expect(stateInfo.isRead).toBe(true);
      expect(stateInfo.isSnoozed).toBe(true);
      expect(stateInfo.deliveryCount).toBe(1);
      expect(stateInfo.snoozeTimeRemaining).toBeGreaterThan(0);
      expect(stateInfo.timeSinceLastDelivery).toBeGreaterThanOrEqual(0);
    });

    it('should return correct values for undelivered state', () => {
      const stateInfo = state.getStateInfo();
      
      expect(stateInfo.isRead).toBe(false);
      expect(stateInfo.isSnoozed).toBe(false);
      expect(stateInfo.deliveryCount).toBe(0);
      expect(stateInfo.snoozeTimeRemaining).toBe(0);
      expect(stateInfo.timeSinceLastDelivery).toBeNull();
    });
  });

  describe('fromData', () => {
    it('should create UserAlertStateEntity from data object', () => {
      const data = {
        id: 'test-id',
        userId: 'user-123',
        alertId: 'alert-456',
        isRead: true,
        isSnoozed: false,
        snoozeUntil: undefined,
        lastDelivered: new Date(),
        deliveryCount: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const state = UserAlertStateEntity.fromData(data);

      expect(state.id).toBe(data.id);
      expect(state.userId).toBe(data.userId);
      expect(state.alertId).toBe(data.alertId);
      expect(state.isRead).toBe(data.isRead);
      expect(state.deliveryCount).toBe(data.deliveryCount);
      expect(state instanceof UserAlertStateEntity).toBe(true);
    });
  });
});