
import express from 'express';
import alertsRouter from './routes/AlertsRouter';
import teamsRouter from './routes/TeamsRouter';
import usersRouter from './routes/UsersRouter';

const app = express();
const port = 3000;

app.use(express.json());

// Main application routes
app.use('/alerts', alertsRouter);
app.use('/teams', teamsRouter);
app.use('/users', usersRouter);

// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Welcome to the Alerting & Notification API!',
    api_endpoints: [
      { 
        path: '/alerts', 
        methods: ['GET', 'POST'],
        description: 'Manage and retrieve alerts.'
      },
      {
        path: '/alerts/:id',
        methods: ['GET', 'PUT', 'DELETE'],
        description: 'Retrieve, update or archive a specific alert.'
      },
      {
        path: '/teams',
        methods: ['GET', 'POST'],
        description: 'Manage and retrieve teams.'
      },
      {
        path: '/teams/:id',
        methods: ['GET', 'PUT', 'DELETE'],
        description: 'Retrieve, update or deactivate a specific team.'
      },
      {
        path: '/teams/organization/:organizationId',
        methods: ['GET'],
        description: 'Retrieve all teams for a specific organization.'
      },
      {
        path: '/users',
        methods: ['POST'],
        description: 'Create a new user.'
      },
      {
        path: '/users/:id',
        methods: ['GET'],
        description: 'Retrieve a user by their ID.'
      },
      {
        path: '/users/:userId/alerts',
        methods: ['GET'],
        description: 'Fetch all active alerts for a specific user.'
      },
      {
        path: '/users/:userId/alerts/:alertId/read',
        methods: ['POST'],
        description: 'Mark an alert as read for a specific user.'
      },
      {
        path: '/users/:userId/alerts/:alertId/snooze',
        methods: ['POST'],
        description: 'Snooze an alert for a specific user.'
      }
    ]
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
