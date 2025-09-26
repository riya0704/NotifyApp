
import { UserEntity } from '../entities/User';
import { AlertEntity } from '../entities/Alert';
import { UserRepository } from '../repositories/UserRepository';
import { AlertRepository } from '../repositories/AlertRepository';
import { UserAlertStateRepository } from '../repositories/UserAlertStateRepository';
import { UserAlertStateEntity } from '../entities/UserAlertState';
import { CreateUserRequest } from '../models/User';

export class UserService {
  private userRepository: UserRepository;
  private alertRepository: AlertRepository;
  private userAlertStateRepository: UserAlertStateRepository;

  constructor(
    userRepository: UserRepository,
    alertRepository: AlertRepository,
    userAlertStateRepository: UserAlertStateRepository
  ) {
    this.userRepository = userRepository;
    this.alertRepository = alertRepository;
    this.userAlertStateRepository = userAlertStateRepository;
  }

  public async createUser(request: CreateUserRequest): Promise<UserEntity> {
    const newUser = new UserEntity(request);
    return this.userRepository.create(newUser);
  }

  public async getUserById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findById(id);
  }

  public async snoozeAlert(userId: string, alertId: string): Promise<UserAlertStateEntity> {
    const existingState = await this.userAlertStateRepository.findByUserAndAlert(userId, alertId);

    if (existingState) {
      const userAlertState = UserAlertStateEntity.fromData(existingState);
      userAlertState.snoozeForDay();
      await this.userAlertStateRepository.update(userAlertState.id, userAlertState);
      return userAlertState;
    } else {
      const userAlertState = new UserAlertStateEntity({ userId, alertId });
      userAlertState.snoozeForDay();
      await this.userAlertStateRepository.create(userAlertState);
      return userAlertState;
    }
  }

  public async markAlertAsRead(userId: string, alertId: string): Promise<UserAlertStateEntity> {
    const existingState = await this.userAlertStateRepository.findByUserAndAlert(userId, alertId);

    if (existingState) {
      const userAlertState = UserAlertStateEntity.fromData(existingState);
      userAlertState.markAsRead();
      await this.userAlertStateRepository.update(userAlertState.id, userAlertState);
      return userAlertState;
    } else {
      const userAlertState = new UserAlertStateEntity({ userId, alertId });
      userAlertState.markAsRead();
      await this.userAlertStateRepository.create(userAlertState);
      return userAlertState;
    }
  }

  public async getUserAlerts(userId: string): Promise<AlertEntity[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return [];
    }

    return this.alertRepository.findAlertsForUser(user.id, user.teamId, user.organizationId);
  }
}
