import { nanoid } from 'nanoid';
import { presignPut, presignGet } from '../aws/s3.js';
import { success, fail } from '../utils/response.js';
import { config } from '../utils/config.js';

export const getPresignUpload = async (req, res) => {
    try {
        const { contentType = 'application/octet-stream' } = req.body;
        const key = `uploads/${Date.now()}-${nanoid(8)}`;
        const url = await presignPut(key, contentType);
        return success(res, { key, url, bucket: config.uploadsBucket });
    } catch (e) {
        return fail(res, e.message);
    }
};

export const getPresignDownload = async (req, res) => {
    try {
        const { key } = req.query;
        if (!key) return fail(res, 'Missing key', 400);
        const url = await presignGet(key);
        return success(res, { key, url, bucket: config.outputsBucket });
    } catch (e) {
        return fail(res, e.message);
    }
};
