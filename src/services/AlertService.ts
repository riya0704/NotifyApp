
import { AlertEntity } from '../entities/Alert';
import { AlertRepository } from '../repositories/AlertRepository';
import { CreateAlertRequest, UpdateAlertRequest } from '../models/Alert';

export class AlertService {
  private alertRepository: AlertRepository;

  constructor(alertRepository: AlertRepository) {
    this.alertRepository = alertRepository;
  }

  public async createAlert(request: CreateAlertRequest, createdBy: string): Promise<AlertEntity> {
    const newAlert = new AlertEntity(request, createdBy);
    return this.alertRepository.create(newAlert);
  }

  public async getAlertById(id: string): Promise<AlertEntity | null> {
    return this.alertRepository.findById(id);
  }

  public async updateAlert(id: string, request: UpdateAlertRequest): Promise<AlertEntity | null> {
    const alert = await this.alertRepository.findById(id);
    if (!alert) {
      return null;
    }

    alert.update(request);
    return this.alertRepository.update(id, alert);
  }

  public async archiveAlert(id: string): Promise<AlertEntity | null> {
    const alert = await this.alertRepository.findById(id);
    if (!alert) {
      return null;
    }

    alert.archive();
    return this.alertRepository.update(id, alert);
  }

  public async listActiveAlerts(): Promise<AlertEntity[]> {
    return this.alertRepository.findActiveAlerts();
  }
}
