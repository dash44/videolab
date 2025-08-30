import { Router } from 'express';
import authRoutes from './auth.routes.js';
import assetsRoutes from './assets.routes.js';
import jobsRoutes from './jobs.routes.js';

const r = Router();

r.use('/auth', authRoutes);
r.use('/assets', assetsRoutes);
r.use('/jobs', jobsRoutes);

export default r;