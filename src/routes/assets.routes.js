import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { auth } from '../middleware/auth.js';
import * as ctrl from '../controllers/assets.controller.js';

const router = Router();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads');

console.log("Upload directory is:", uploadDir);

fs.mkdirSync(uploadDir, { recursive: true });

try {
    fs.accessSync(uploadDir, fs.constants.W_OK);
    console.log("Upload directory is writable ✅");
} catch (err) {
    console.error("Upload directory is NOT writable ❌", err);
}


// Store to disk; keep original name (controller uses the saved path)
const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

// Accept images/videos only; set a generous limit (adjust if needed)
const upload = multer({
    storage,
    limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
    fileFilter: (_, file, cb) => {
        const ok = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
        cb(ok ? null : new Error('Only images or videos are allowed'), ok);
    }
});

router.get('/', auth, ctrl.listAssets);
router.get('/:id', auth, ctrl.getAsset);
router.post(
    '/',
    auth(),
    (req, res, next) => {
        upload.single('file')(req, res, function (err) {
            if (err) {
                console.error("MULTER ERROR:", err);
                return res.status(400).json({ success: false, error: { message: err.message } });
            }
            ctrl.upload(req, res, next);
        });
    }
);



export default router;
