import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../utils/config.js';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipe = promisify(pipeline);
const s3 = new S3Client({ region: config.region });

export async function downloadToFile(key, filePath) {
    const resp = await s3.send(new GetObjectCommand({ Bucket: config.uploadsBucket, Key: key }));
    await pipe(resp.Body, createWriteStream(filePath));
}

export async function uploadFromFile(key, filePath, contentType = 'video/mp4') {
    return s3.send(new PutObjectCommand({
        Bucket: config.outputsBucket,
        Key: key,
        Body: createReadStream(filePath),
        ContentType: contentType
    }));
}
