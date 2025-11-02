import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { log, err } from './utils/logger.js';
import { config } from './utils/config.js';
import { receiveOne, del } from './aws/sqs.js';
import { downloadToFile, uploadFromFile } from './aws/s3.js';
import { setJobStatus } from './aws/dynamo.js';
import { runFfmpeg } from './processor/ffmpeg.js';
import { rm } from 'fs/promises';

async function handle(msg) {
    const body = JSON.parse(msg.Body);
    const { jobId, inputKey, preset } = body;

    const inPath = join(tmpdir(), `${randomUUID()}-in`);
    const outBase = `${jobId}-${preset}.mp4`;
    const outPath = join(tmpdir(), outBase);

    try {
        await setJobStatus(jobId, { status: 'PROCESSING' });

        // 1) download from uploads
        await downloadToFile(inputKey, inPath);

        // 2) ffmpeg transform
        const producedName = await runFfmpeg(preset, inPath, outPath);

        // 3) upload to outputs bucket
        const finalKey = `outputs/${producedName}`;
        const contentType =
            preset === 'thumbnail' ? 'image/jpeg' :
                preset === 'audio' ? 'audio/mp4' : 'video/mp4';

        await uploadFromFile(finalKey, preset === 'thumbnail' ? outPath.replace(/\.mp4$/i,'.jpg')
                : preset === 'audio' ? outPath.replace(/\.mp4$/i,'.m4a')
                    : outPath,
            contentType);

        // 4) update job
        await setJobStatus(jobId, { status: 'COMPLETED', outputKey: finalKey, error: null });

        log('done', { jobId, finalKey });
    } catch (e) {
        err('failed', jobId, e);
        await setJobStatus(jobId, { status: 'FAILED', error: String(e) });
    } finally {
        try { await rm(inPath, { force: true }); } catch {}
        try { await rm(outPath, { force: true }); } catch {}
    }
}

async function loop() {
    if (!config.queueUrl || !config.ddbTable || !config.uploadsBucket || !config.outputsBucket) {
        throw new Error('Missing one of SQS_QUEUE_URL, DDB_TABLE, UPLOADS_BUCKET, OUTPUTS_BUCKET');
    }

    log('listening on', config.queueUrl);
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const m = await receiveOne();
        if (!m) continue;
        await handle(m).catch(err);
        await del(m).catch(err);
    }
}

loop().catch(e => {
    err('fatal', e);
    process.exit(1);
});
