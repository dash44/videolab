import express from 'express';
import assetsRoutes from './assets.routes.js';
import jobsRoutes from './jobs.routes.js';

const router = express.Router();

router.use('/assets', assetsRoutes);
router.use('/jobs', jobsRoutes);

export default router;
