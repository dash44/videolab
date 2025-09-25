import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION || "ap-southeast-2";
export const s3 = new S3Client({ region });

export async function presignPut(bucket, key, expiresSeconds = 900) {
    const cmd = new PutObjectCommand({ Bucker: bucket, Key: key });
    return getSignedUrl(s3, cmd, { expiresIn: expiresSeconds });
}

export async function presignGet(bucket, key, expiresSeconds = 900) {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(s3, cmd, { expiresIn: expiresSeconds });
}