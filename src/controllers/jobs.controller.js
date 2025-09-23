import fs from 'fs';
import { nanoid } from 'nanoid/non-secure';
import { db } from '../db.js';
import { ok, notfound, forbidden, fail } from '../utils/response.js'
import { canSee } from '../middleware/auth.js'
import { transcode, buildOutputPath } from '../services/video.service.js';

export const processJob = async (req, res) => {
    const { assetId, iterations, variants } = req.body;
    const a = db.prepare('SELECT * FROM assets WHERE id =?').get(assetId);
    if(!a) return notfound(res, 'Asset not found');
    if(!canSee(a.owner, req.user)) return forbidden(res);
    const jobId = nanoid();
    db.prepare(
        `INSERT INTO jobs (id, assetId, owner, status, startedAt, finishedAt, outputsJson, variants) 
        VALUES (?, ?, ?, 'running',  CURRENT_TIMESTAMP, NULL, '[]', ?)`)
        .run(jobId, assetId, req.user.sub, variants);
    const outs = [];
    try {
        for (let v=1; v <= Number(variants); v++) {
            const outPath = buildOutputPath(a.path || a.originalPath, assetId, `v${v}`);
            const { size } = await transcode(a.originalPath, outPath);
            outs.push({ variant: `v${v}`, path: outPath, size });
        }
        db.prepare(`UPDATE jobs SET status ='done', finishedAt = CURRENT_TIMESTAMP, outputsJson = ? WHERE id =?`)
            .run(JSON.stringify(outs), jobId);
        return ok(res, { jobId, status: 'done', outputs: outs });
    } catch (e) {
        console.log(`ERROR during transcoding:`, e);
        db.prepare(`UPDATE jobs SET status ='error', finishedAt = CURRENT_TIMESTAMP WHERE id =?`)
            .run(jobId);
        return fail(res, 'processing failed');
        console.log(`Processing variant ${v}, output path: ${outPath}`);

    }
};

export const listJobs = (req, res) => {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const rows = db.prepare(`SELECT * FROM jobs WHERE (? IS NULL OR status =?) AND (owner =? OR ?='admin') ORDER BY startedAt DESC LIMIT ? OFFSET ?`)
        .all(status ?? null, status ?? null, req.user.sub, req.user.role, Number(limit), offset)
        .map(r=>({ ...r, outputs: JSON.parse(r.outputsJson) }));
    return ok(res, rows, { page: Number(page), limit: Number(limit) });
};

export const getJob = (req, res) => {
    const r = db.prepare('SELECT * FROM jobs WHERE id =?')
        .get(req.params.id);
    if (!r) return notfound(res);
    if (!canSee(r.owner, req.user)) return forbidden(res);
    r.outputsJson = JSON.parse(r.outputsJson);
    delete r.outputsJson;
    return ok(res, r);
};

export const downloadVariant = (req, res) => {
    const { assetId } = req.params; const { variant='v1' } = req.query;
    const a = db.prepare('SELECT * FROM assets WHERE id =?').get(assetId);
    if (!a) return notfound(res, 'Asset not found');
    if (!canSee(a.owner, req.user)) return forbidden(res);
    const file = buildOutputPath(a.originalPath, assetId, variant);
    if (!fs.existsSync(file)) return notfound(res, 'Variant not found');
    return res.download(file);
};