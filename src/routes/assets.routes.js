import { Router } from 'express';
import fs from 'fs';
import path from 'path';

import { createUploadUrl } from '../services/storage.js';
import { VideoRepo } from '../aws/dynamo.js';
import * as ctrl from '../controllers/assets.controller.js';

import { auth } from '../middleware/auth.js';
import { authCognito } from '../middleware/authCognito.js';
const guard = process.env.AUTH_MODE === "cognito" ? authCognito() : auth();
// ^^ switches auth method based on availability 

const router = Router();


router.get('/', auth, ctrl.listAssets);
router.get('/:id', auth, ctrl.getAsset);

router.post("/presign-upload", guard, async (req, res) => {
    try {
        const { filename, contentType } = req.body || {};
        if (!filename || !contentType) {
            return res.status(400).json({ sucess: false, error: { message: "filename and contentType required!!!!" } });
        }

        const ownerSub = req.user?.sub || "unknown";
        const assetId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const key = `uploads/${ownerSub}/${Date.now()}-${filename}`;

        // Presign a PUT URL for direct browser upload to s3
        const url = await createUploadUrl({
            bucket: process.env.BUCKET_UPLOADS,
            key,
            contentType,
            expiresSeconds: 900
        });

        await VideoRepo.put({
            assetId,
            ownerSub,
            filename,
            mime: contentType,
            sizeBytes: 0,
            createdAt: new Date().toISOString(),
            status: [{ key }],
            outputs: []
        });

        return res.json({ sucess: true, url, key, assetId });
    } catch (err) {
        console.error("PRESIGN UPLOAD ERROR:", err);
        return res.status(500).json({ success: false, error: { message: err.message } });
    }
});

router.get("/presign-download", guard, async (req, res) => {
    try {
        const key = req.query.key;
        if (!key) return res.status(400).json({ sucess: false, error: { message: "KEY QUERY PARAM REQUIRED!!!!" } });

        const url = await createDownloadUrl({
            bucket: process.env.BUCKET_OUTPUTS,
            key, 
            expiresSeconds: 900
        });

        return res.json({ sucess: true, url });
    } catch (err) {
        console.error("PRESIGN DOWNLOAD ERROR:", err);
        return res.status(500).json({ success: false, error: { message: err.message } });
    }
});

export default router;
