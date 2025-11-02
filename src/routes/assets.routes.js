import express from 'express';
import { getPresignUpload, getPresignDownload } from '../controllers/assets.controller.js';

const router = express.Router();

router.post('/presign', getPresignUpload);
router.get('/presign', getPresignDownload);

export default router;
