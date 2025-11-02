import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../utils/config.js';

const s3 = new S3Client({ region: config.region });

export const presignPut = async (key, contentType) =>
    getSignedUrl(s3, new PutObjectCommand({
        Bucket: config.uploadsBucket,
        Key: key,
        ContentType: contentType
    }), { expiresIn: 900 });

export const presignGet = async (key) =>
    getSignedUrl(s3, new GetObjectCommand({
        Bucket: config.outputsBucket,
        Key: key
    }), { expiresIn: 900 });
