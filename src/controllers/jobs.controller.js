import { success, fail } from '../utils/response.js';
import { createVideoJob, getVideoJob } from '../services/video.service.js';

/**
 * POST /jobs
 * Creates a new video processing job (queues SQS message, writes to DynamoDB).
 */
export const createJob = async (req, res) => {
    try {
        const { inputKey, preset = '720p' } = req.body;
        if (!inputKey) return fail(res, 'Missing inputKey', 400);

        const job = await createVideoJob(inputKey, preset);
        return success(res, job, 202);
    } catch (e) {
        return fail(res, e.message);
    }
};

/**
 * GET /jobs/:id
 * Returns job details and current status from DynamoDB.
 */
export const getJobStatus = async (req, res) => {
    try {
        const job = await getVideoJob(req.params.id);
        return success(res, job);
    } catch (e) {
        return fail(res, e.message, e.message === 'Job not found' ? 404 : 500);
    }
};
