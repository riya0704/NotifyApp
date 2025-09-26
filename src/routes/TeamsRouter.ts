
import { Router, Request, Response } from 'express';
import { TeamService } from '../services/TeamService';
import { AppDataSource } from '../data-source';
import { TeamRepository } from '../repositories/TeamRepository';

const router = Router();
const teamRepository = new TeamRepository(AppDataSource);
const teamService = new TeamService(teamRepository);

// Create a new team
router.post('/', async (req: Request, res: Response) => {
  try {
    const newTeam = await teamService.createTeam(req.body);
    res.status(201).json(newTeam);
  } catch (error) {
    if (error instanceof Error) {
        return res.status(500).send({ message: error.message });
    }
    return res.status(500).send({ message: 'An unknown error occurred' });
  }
});

// Get a team by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const team = await teamService.getTeamById(req.params.id);
    if (!team) {
      return res.status(404).send({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    if (error instanceof Error) {
        return res.status(500).send({ message: error.message });
    }
    return res.status(500).send({ message: 'An unknown error occurred' });
  }
});

// Update a team
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const team = await teamService.updateTeam(req.params.id, req.body);
    if (!team) {
      return res.status(404).send({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    if (error instanceof Error) {
        return res.status(500).send({ message: error.message });
    }
    return res.status(500).send({ message: 'An unknown error occurred' });
  }
});

// Deactivate a team
router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const team = await teamService.deactivateTeam(req.params.id);
      if (!team) {
        return res.status(404).send({ message: 'Team not found' });
      }
      res.status(200).json(team);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).send({ message: error.message });
        }
        return res.status(500).send({ message: 'An unknown error occurred' });
    }
});

// Get all teams for an organization
router.get('/organization/:organizationId', async (req: Request, res: Response) => {
  try {
    const teams = await teamService.getTeamsByOrganization(req.params.organizationId);
    res.json(teams);
  } catch (error) {
    if (error instanceof Error) {
        return res.status(500).send({ message: error.message });
    }
    return res.status(500).send({ message: 'An unknown error occurred' });
  }
});

export default router;
