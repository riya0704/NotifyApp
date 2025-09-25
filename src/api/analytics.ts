
import { AnalyticsService } from '../services/AnalyticsService';

// This is a simplified representation of an API controller.
// In a real-world application, you would use a framework like Express.js and handle HTTP requests and responses.

export class AnalyticsApi {
  private analyticsService: AnalyticsService;

  constructor(analyticsService: AnalyticsService) {
    this.analyticsService = analyticsService;
  }

  // GET /analytics
  public async getSystemWideMetrics() {
    return this.analyticsService.getSystemWideMetrics();
  }
}
