
import { Router, Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { AppDataSource } from '../data-source';
import { UserRepository } from '../repositories/UserRepository';
import { AlertRepository } from '../repositories/AlertRepository';
import { UserAlertStateRepository } from '../repositories/UserAlertStateRepository';

const router = Router();
const userRepository = new UserRepository(AppDataSource);
const alertRepository = new AlertRepository(AppDataSource);
const userAlertStateRepository = new UserAlertStateRepository(AppDataSource);
const userService = new UserService(userRepository, alertRepository, userAlertStateRepository);

// Create a new user
router.post('/', async (req: Request, res: Response) => {
  try {
    const newUser = await userService.createUser(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    if (error instanceof Error) {
        return res.status(500).send({ message: error.message });
    }
    return res.status(500).send({ message: 'An unknown error occurred' });
  }
});

// Get a user by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    if (error instanceof Error) {
        return res.status(500).send({ message: error.message });
    }
    return res.status(500).send({ message: 'An unknown error occurred' });
  }
});

// Snooze an alert
router.post('/:userId/alerts/:alertId/snooze', async (req: Request, res: Response) => {
  try {
    const { userId, alertId } = req.params;
    const userAlertState = await userService.snoozeAlert(userId, alertId);
    res.json(userAlertState);
  } catch (error) {
    if (error instanceof Error) {
        return res.status(500).send({ message: error.message });
    }
    return res.status(500).send({ message: 'An unknown error occurred' });
  }
});

// Mark an alert as read
router.post('/:userId/alerts/:alertId/read', async (req: Request, res: Response) => {
  try {
    const { userId, alertId } = req.params;
    const userAlertState = await userService.markAlertAsRead(userId, alertId);
    res.json(userAlertState);
  } catch (error) {
    if (error instanceof Error) {
        return res.status(500).send({ message: error.message });
    }
    return res.status(500).send({ message: 'An unknown error occurred' });
  }
});

// Get user alerts
router.get('/:userId/alerts', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const alerts = await userService.getUserAlerts(userId);
    res.json(alerts);
  } catch (error) {
    if (error instanceof Error) {
        return res.status(500).send({ message: error.message });
    }
    return res.status(500).send({ message: 'An unknown error occurred' });
  }
});

export default router;
