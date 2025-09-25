
import { AlertService } from '../services/AlertService';
import { CreateAlertRequest, UpdateAlertRequest } from '../models/Alert';

// This is a simplified representation of an API controller.
// In a real-world application, you would use a framework like Express.js and handle HTTP requests and responses.

export class AlertApi {
  private alertService: AlertService;

  constructor(alertService: AlertService) {
    this.alertService = alertService;
  }

  // POST /alerts
  public async createAlert(request: CreateAlertRequest, createdBy: string) {
    return this.alertService.createAlert(request, createdBy);
  }

  // GET /alerts/:id
  public async getAlertById(id: string) {
    return this.alertService.getAlertById(id);
  }

  // PUT /alerts/:id
  public async updateAlert(id: string, request: UpdateAlertRequest) {
    return this.alertService.updateAlert(id, request);
  }

  // DELETE /alerts/:id
  public async archiveAlert(id: string) {
    return this.alertService.archiveAlert(id);
  }

  // GET /alerts
  public async listActiveAlerts() {
    return this.alertService.listActiveAlerts();
  }
}
