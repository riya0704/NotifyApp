
import { UserService } from '../UserService';
import { UserEntity } from '../../entities/User';
import { AlertEntity } from '../../entities/Alert';
import { UserAlertStateEntity } from '../../entities/UserAlertState';
import { UserRepository } from '../../repositories/UserRepository';
import { AlertRepository } from '../../repositories/AlertRepository';
import { UserAlertStateRepository } from '../../repositories/UserAlertStateRepository';
import { AlertSeverity, DeliveryType, VisibilityType } from '../../models/enums';
import { CreateUserRequest } from '../../models/User';
import { UserAlertState } from '../../models/UserAlertState';

// Mock repositories
const mockUserRepository = {
  create: jest.fn(),
  findById: jest.fn(),
};

const mockAlertRepository = {
  findAlertsForUser: jest.fn(),
};

const mockUserAlertStateRepository = {
  create: jest.fn(),
  update: jest.fn(),
  findByUserAndAlert: jest.fn(),
};

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    userService = new UserService(
      mockUserRepository as any,
      mockAlertRepository as any,
      mockUserAlertStateRepository as any
    );
  });

  describe('createUser', () => {
    it('should create a user and return the user entity', async () => {
      const userData: CreateUserRequest = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        teamId: 'team-1',
        organizationId: 'org-1',
      };
      const userEntity = new UserEntity(userData);
      mockUserRepository.create.mockResolvedValue(userEntity);

      const result = await userService.createUser(userData);

      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.any(UserEntity));
      expect(result).toBe(userEntity);
    });
  });

  describe('getUserById', () => {
    it('should return a user by ID', async () => {
      const userEntity = new UserEntity({
        name: 'John Doe',
        email: 'john.doe@example.com',
        teamId: 'team-1',
        organizationId: 'org-1',
      });
      mockUserRepository.findById.mockResolvedValue(userEntity);

      const result = await userService.getUserById('user-1');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
      expect(result).toBe(userEntity);
    });
  });

  describe('snoozeAlert', () => {
    it('should create a new snoozed state if one does not exist', async () => {
      const userId = 'user-1';
      const alertId = 'alert-1';
      mockUserAlertStateRepository.findByUserAndAlert.mockResolvedValue(null);
      const newState = new UserAlertStateEntity({ userId, alertId });
      newState.snoozeForDay();
      mockUserAlertStateRepository.create.mockResolvedValue(newState);

      const result = await userService.snoozeAlert(userId, alertId);

      expect(mockUserAlertStateRepository.findByUserAndAlert).toHaveBeenCalledWith(userId, alertId);
      expect(mockUserAlertStateRepository.create).toHaveBeenCalledWith(expect.any(UserAlertStateEntity));
      expect(result.isSnoozed).toBe(true);
    });

    it('should update the existing state to snoozed', async () => {
        const userId = 'user-1';
        const alertId = 'alert-1';
        const existingState: UserAlertState = {
            id: 'state-1',
            userId,
            alertId,
            isRead: false,
            isSnoozed: false,
            deliveryCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        mockUserAlertStateRepository.findByUserAndAlert.mockResolvedValue(existingState);
        
        const updatedState = UserAlertStateEntity.fromData(existingState);
        updatedState.snoozeForDay();
        mockUserAlertStateRepository.update.mockResolvedValue(updatedState);

        const result = await userService.snoozeAlert(userId, alertId);

        expect(mockUserAlertStateRepository.findByUserAndAlert).toHaveBeenCalledWith(userId, alertId);
        expect(mockUserAlertStateRepository.update).toHaveBeenCalledWith(existingState.id, expect.any(UserAlertStateEntity));
        expect(result.isSnoozed).toBe(true);
    });
  });

  describe('markAlertAsRead', () => {
    it('should create a new read state if one does not exist', async () => {
        const userId = 'user-1';
        const alertId = 'alert-1';
        mockUserAlertStateRepository.findByUserAndAlert.mockResolvedValue(null);
        const newState = new UserAlertStateEntity({ userId, alertId });
        newState.markAsRead();
        mockUserAlertStateRepository.create.mockResolvedValue(newState);

        const result = await userService.markAlertAsRead(userId, alertId);

        expect(mockUserAlertStateRepository.create).toHaveBeenCalledWith(expect.any(UserAlertStateEntity));
        expect(result.isRead).toBe(true);
    });

    it('should update the existing state to read', async () => {
        const userId = 'user-1';
        const alertId = 'alert-1';
        const existingState: UserAlertState = {
            id: 'state-1',
            userId,
            alertId,
            isRead: false,
            isSnoozed: false,
            deliveryCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        mockUserAlertStateRepository.findByUserAndAlert.mockResolvedValue(existingState);
        
        const updatedState = UserAlertStateEntity.fromData(existingState);
        updatedState.markAsRead();
        mockUserAlertStateRepository.update.mockResolvedValue(updatedState);

        const result = await userService.markAlertAsRead(userId, alertId);
        
        expect(mockUserAlertStateRepository.update).toHaveBeenCalledWith(existingState.id, expect.any(UserAlertStateEntity));
        expect(result.isRead).toBe(true);
    });
  });

  describe('getUserAlerts', () => {
    it('should return alerts for a user', async () => {
      const user = new UserEntity({
        name: 'Test User',
        email: 'test@test.com',
        teamId: 'team-1',
        organizationId: 'org-1',
      });
      const alerts = [
        new AlertEntity({ title: 'Alert 1', message: 'Message 1', severity: AlertSeverity.INFO, deliveryType: DeliveryType.IN_APP, visibility: {type: VisibilityType.ORGANIZATION, targetIds: ['org-1']}, startTime: new Date(), expiryTime: new Date(Date.now() + 100000)}, 'admin'),
        new AlertEntity({ title: 'Alert 2', message: 'Message 2', severity: AlertSeverity.WARNING, deliveryType: DeliveryType.IN_APP, visibility: {type: VisibilityType.TEAM, targetIds: ['team-1']}, startTime: new Date(), expiryTime: new Date(Date.now() + 100000)}, 'admin'),
      ];

      mockUserRepository.findById.mockResolvedValue(user);
      mockAlertRepository.findAlertsForUser.mockResolvedValue(alerts);

      const result = await userService.getUserAlerts('user-1');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
      expect(mockAlertRepository.findAlertsForUser).toHaveBeenCalledWith(
        user.id,
        'team-1',
        'org-1'
      );
      expect(result).toEqual(alerts);
    });
  });
});
