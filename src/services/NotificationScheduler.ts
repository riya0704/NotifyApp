
import { AlertEntity } from '../entities/Alert';
import { UserEntity } from '../entities/User';
import { AlertService } from './AlertService';
import { NotificationService } from './NotificationService';
import { UserAlertStateRepository } from '../repositories/UserAlertStateRepository';

export class NotificationScheduler {
  private alertService: AlertService;
  private notificationService: NotificationService;
  private userAlertStateRepository: UserAlertStateRepository;
  private interval: NodeJS.Timeout | null = null;

  constructor(
    alertService: AlertService,
    notificationService: NotificationService,
    userAlertStateRepository: UserAlertStateRepository
  ) {
    this.alertService = alertService;
    this.notificationService = notificationService;
    this.userAlertStateRepository = userAlertStateRepository;
  }

  public start(): void {
    if (this.interval) {
      return;
    }

    // Check for active alerts every minute
    this.interval = setInterval(async () => {
      const activeAlerts = await this.alertService.listActiveAlerts();

      for (const alert of activeAlerts) {
        if (alert.reminderEnabled) {
          await this.processAlertReminders(alert);
        }
      }
    }, 60 * 1000); // 1 minute
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async processAlertReminders(alert: AlertEntity): Promise<void> {
    const targetUsers = await this.notificationService.getTargetUsers(alert);

    for (const user of targetUsers) {
      const userState = await this.userAlertStateRepository.findByUserAndAlert(user.id, alert.id);

      if (userState) {
        userState.resetSnoozeIfExpired();
        await this.userAlertStateRepository.update(userState.id, userState);
      }

      if (!userState || userState.shouldReceiveReminder()) {
        // @ts-ignore
        await this.notificationService.sendNotification(alert, user);
      }
    }
  }
}
