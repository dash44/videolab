import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { auth } from '../middleware/auth';
import { upload, listAssets, getAsset } from '../controllers/assets.controller.js';
const r = Router();
const uploadMw = multer({ dest: path.join(process.cwd(), 'uploads'), limits:{ fileSize: 50*1024*1024} });

r.post('/', auth(), uploadMw.single('file'), upload);
r.get('/', auth(), listAssets);
r.get('/:id', auth(), getAsset);

export default r;