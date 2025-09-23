import { nanoid } from 'nanoid/non-secure';
import { db } from '../db.js';
import { ok, notfound, forbidden, fail } from '../utils/response.js';
import { canSee } from '../middleware/auth.js';

export const upload = (req, res) => {
    try {
        console.log('UPLOAD CONTROLLER HIT');
        console.log('Uploaded file:', req.file);

        if (!req.file) {
            return res.status(400).json({ success: false, error: { message: "No file uploaded" } });
        }

        const id = nanoid();
        const mime = req.file.mimetype;

        const asset = {
            id,
            owner: req.user.sub,
            filename: req.file.originalname,
            originalPath: req.file.path,
            kind: mime.startsWith('image/') ? 'image' : 'video',
            mime,
            sizeBytes: req.file.size
            // createdAt is auto-set by DB
        };

        db.prepare(`
            INSERT INTO assets (id, owner, filename, originalPath, kind, mime, sizeBytes)
            VALUES (@id, @owner, @filename, @originalPath, @kind, @mime, @sizeBytes)
        `).run(asset);

        return ok(res, { assetId: id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: { message: err.message } });
    }
};

export const listAssets = (req, res) => {
    const { page = 1, limit = 10, owner, kind } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const canAll = req.user.role === 'admin' || (owner && owner === req.user.sub);

    const rows = db.prepare(`
        SELECT * FROM assets
        WHERE (? IS NULL OR owner = ?)
            ${canAll ? '' : 'AND owner = ?'}
            AND (? IS NULL OR kind = ?)
        ORDER BY createdAt DESC
            LIMIT ? OFFSET ?
    `).all(
        owner ?? null,
        owner ?? null,
        canAll ? undefined : req.user.sub,
        kind ?? null,
        kind ?? null,
        Number(limit),
        offset
    ).filter(Boolean);

    return ok(res, rows, { page: Number(page), limit: Number(limit) });
};

export const getAsset = (req, res) => {
    const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
    if (!row) return notfound(res);
    if (!canSee(row.owner, req.user)) return forbidden(res);
    return ok(res, row);
};
