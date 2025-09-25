
import { AlertRepository } from '../repositories/AlertRepository';
import { UserAlertStateRepository } from '../repositories/UserAlertStateRepository';
import { AlertSeverity, NotificationStatus } from '../models/enums';

interface AnalyticsData {
  totalAlertsCreated: number;
  alertsDeliveredVsRead: {
    delivered: number;
    read: number;
  };
  snoozedCountsPerAlert: { [alertId: string]: number };
  breakdownBySeverity: {
    [key in AlertSeverity]: number;
  };
}

export class AnalyticsService {
  private alertRepository: AlertRepository;
  private userAlertStateRepository: UserAlertStateRepository;

  constructor(
    alertRepository: AlertRepository,
    userAlertStateRepository: UserAlertStateRepository
  ) {
    this.alertRepository = alertRepository;
    this.userAlertStateRepository = userAlertStateRepository;
  }

  public async getSystemWideMetrics(): Promise<AnalyticsData> {
    const allAlerts = await this.alertRepository.findAll();
    const allUserAlertStates = await this.userAlertStateRepository.findAll();

    const totalAlertsCreated = allAlerts.length;

    const alertsDeliveredVsRead = {
      delivered: allUserAlertStates.length, // Simplified: assumes each state is a delivery
      read: allUserAlertStates.filter(s => s.status === NotificationStatus.READ).length,
    };

    const snoozedCountsPerAlert = allUserAlertStates
      .filter(s => s.status === NotificationStatus.SNOOZED)
      .reduce((acc, state) => {
        acc[state.alertId] = (acc[state.alertId] || 0) + 1;
        return acc;
      }, {} as { [alertId: string]: number });

    const breakdownBySeverity = allAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as { [key in AlertSeverity]: number });

    return {
      totalAlertsCreated,
      alertsDeliveredVsRead,
      snoozedCountsPerAlert,
      breakdownBySeverity,
    };
  }
}
