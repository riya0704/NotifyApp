
import { UserService } from '../services/UserService';
import { CreateUserRequest } from '../models/User';

// This is a simplified representation of an API controller.
// In a real-world application, you would use a framework like Express.js and handle HTTP requests and responses.

export class UserApi {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  // POST /users
  public async createUser(request: CreateUserRequest) {
    return this.userService.createUser(request);
  }

  // GET /users/:id
  public async getUserById(id: string) {
    return this.userService.getUserById(id);
  }

  // POST /users/:userId/alerts/:alertId/snooze
  public async snoozeAlert(userId: string, alertId: string) {
    return this.userService.snoozeAlert(userId, alertId);
  }

  // POST /users/:userId/alerts/:alertId/read
  public async markAlertAsRead(userId: string, alertId: string) {
    return this.userService.markAlertAsRead(userId, alertId);
  }

  // GET /users/:userId/alerts
  public async getUserAlerts(userId: string) {
    return this.userService.getUserAlerts(userId);
  }
}
