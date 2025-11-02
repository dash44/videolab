import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";

const region = process.env.AWS_REGION || "ap-southeast-2";
const useLocal = process.env.LOCALSTACK === "1";
const endpoint = useLocal ? "http://localhost:4566" : undefined;

const shared = {
    region,
    ...(endpoint ? { endpoint } : {}),
    // LocalStack doesn’t validate; real AWS ignores these if you use SSO on EC2
    credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
        }
        : undefined,
};

export const s3 = new S3Client({ ...shared, forcePathStyle: !!endpoint });
export const ddb = new DynamoDBClient(shared);
export const sqs = new SQSClient(shared);
