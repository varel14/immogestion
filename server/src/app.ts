import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { getUploadRoot } from './middleware/upload.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/users.routes.js';
import { ownerRoutes } from './modules/owners/owners.routes.js';
import { clientRoutes } from './modules/clients/clients.routes.js';
import { propertyRoutes } from './modules/properties/properties.routes.js';
import { statsRoutes } from './modules/stats/stats.routes.js';

const API_PREFIX = '/api';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  if (env.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  // Fichiers uploadés (photos et documents des biens)
  app.use('/uploads', express.static(getUploadRoot()));

  app.get(`${API_PREFIX}/health`, (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/users`, userRoutes);
  app.use(`${API_PREFIX}/owners`, ownerRoutes);
  app.use(`${API_PREFIX}/clients`, clientRoutes);
  app.use(`${API_PREFIX}/properties`, propertyRoutes);
  app.use(`${API_PREFIX}/stats`, statsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
