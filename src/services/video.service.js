import { nanoid } from 'nanoid';
import { sendJobMessage } from '../aws/sqs.js';
import { putJob, getJob } from '../aws/dynamo.js';
import { config } from '../utils/config.js';

/**
 * Creates and queues a new video transformation job.
 * @param {string} inputKey - S3 key of the uploaded source video.
 * @param {string} preset - Transformation preset (720p, 480p, audio, thumbnail).
 * @returns {Promise<{ jobId: string, status: string, preset: string }>}
 */
export async function createVideoJob(inputKey, preset = '720p') {
    if (!inputKey) throw new Error('inputKey required');
    const jobId = nanoid();
    const now = new Date().toISOString();

    const job = {
        jobId,
        inputKey,
        preset,
        status: 'QUEUED',
        createdAt: now,
        updatedAt: now,
        outputKey: null,
        error: null,
    };

    // Store in DynamoDB
    await putJob(job);

    // Send SQS message for worker
    await sendJobMessage({ jobId, inputKey, preset, outputsBucket: config.outputsBucket });

    return { jobId, status: job.status, preset };
}

/**
 * Gets job information from DynamoDB.
 * @param {string} jobId - Job ID to fetch.
 * @returns {Promise<object>} - Job item.
 */
export async function getVideoJob(jobId) {
    const result = await getJob(jobId);
    if (!result.Item) throw new Error('Job not found');
    return result.Item;
}
