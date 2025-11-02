import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";

const region = process.env.AWS_REGION || "ap-southeast-2";

export const s3 = new S3Client({ region });
export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
export const sqs = new SQSClient({ region });
