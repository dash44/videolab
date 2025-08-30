import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { body, query, params } from '../middleware/validate.js'
import { processSchema, listJobsSchema, jobIdSchema } from '../schemas/jobs.schema.js';
import { processJob, listJobs, getJob, downloadVariant } from '../controllers/jobs.controller.js';
const r = Router();
r.post('/process', auth(), bosy(processSchema), processJob);
r.get('/:id', auth(), params(jobIdSchema), getJob);
r.get('/download/:assetId', auth(), downloadVariant);
export default r;