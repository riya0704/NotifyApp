
import { Router, Request, Response } from 'express';
import { AlertService } from '../services/AlertService';
import { AppDataSource } from '../data-source';
import { AlertRepository } from '../repositories/AlertRepository';

const router = Router();
const alertRepository = new AlertRepository(AppDataSource);
const alertService = new AlertService(alertRepository);

// Create a new alert
router.post('/', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const newAlert = await alertService.createAlert(req.body, req.user.id);
    res.status(201).json(newAlert);
  } catch (error) {
    if (error instanceof Error) {
        return res.status(500).send({ message: error.message });
    }
    return res.status(500).send({ message: 'An unknown error occurred' });
  }
});

// Get an alert by ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const alert = await alertService.getAlertById(req.params.id);
        if (!alert) {
            return res.status(404).send({ message: 'Alert not found' });
        }
        res.json(alert);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).send({ message: error.message });
        }
        return res.status(500).send({ message: 'An unknown error occurred' });
    }
});

// Update an alert
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const alert = await alertService.updateAlert(req.params.id, req.body);
        if (!alert) {
            return res.status(404).send({ message: 'Alert not found' });
        }
        res.json(alert);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).send({ message: error.message });
        }
        return res.status(500).send({ message: 'An unknown error occurred' });
    }
});

// Archive an alert
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const alert = await alertService.archiveAlert(req.params.id);
        if (!alert) {
            return res.status(404).send({ message: 'Alert not found' });
        }
        res.status(204).send();
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).send({ message: error.message });
        }
        return res.status(500).send({ message: 'An unknown error occurred' });
    }
});

export default router;
