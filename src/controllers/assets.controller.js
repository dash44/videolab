import path from 'path';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { ok, created, notfound, forbidden } from '../utils/response.js'
import { canSee } from '../middleware/auth.js'

export const upload = (req, res) => {
    const id = nanoid();
    db.prepare('INSERT INTO assets (id, owner, filename, originalPath, createdAt) VALUES (?, ?, ?, ?, datetime("now"))')
        .run(id, req.user.sub, req.file.originalname, req.file.path);
    return created(res, { assetId:id, filename:req.file.originalname });
};

export const listAssets = (req, res) => {
    const { page=1, limit=10, owner } = req.query;
    const offset = (Number(page) -1) * Number(limit);
    const canAll = req.user.role === 'admin' || (owner && owner === req.user.sub);
    const rows = db.prepare(`SELECT * FROM assets WHERE (? IS NULL OR owner =?) ${canAll?'' : 'AND owner =?'} ORDER BY createdAt DESC LIMIT ? OFFSET ?`)
        .all(owner??null, owner??null, canAll?undefined:req.user.sub, Number(limit), offset)
        .filter(Boolean);
    return ok(res, rows, { page:Number(page), limit:Number(limit) });
};

export const getAsset = (req, res) => {
    const row = db.prepare ('SELECT * FROM assets WHERE id =?')
        .get(req.params.id);
    if(!row) return notfound(res);
    if(!canSee(row.owner, req.user)) return forbidden(res);
    return ok(res, row);
};