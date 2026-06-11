import express from 'express';
import { apiRouter } from './api/routes';

export function configureServer(app: express.Express) {
  // Parse JSON bodies
  app.use(express.json());

  // Mount Backend API routes
  app.use('/api', apiRouter);

  // Default health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'LabourFlow Backend API is running' });
  });
}
