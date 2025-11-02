import "dotenv/config";
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { transcodeTo720p } from "../src/services/video.service.js";

const region = process.env.AWS_REGION || "ap-southeast-2";
const sqs = new SQSClient({ region });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

const QUEUE_URL = process.env.SQS_QUEUE_URL;
const TABLE = process.env.DDB_TABLE;

async function handleMessage(msg) {
    const body = JSON.parse(msg.Body);
    const { jobId, inputKey } = body;

    // mark started
    await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: { jobId, status: "STARTED", startedAt: Date.now(), inputKey }
    }));

    try {
        const { outputKey } = await transcodeTo720p({ inputKey });
        await ddb.send(new UpdateCommand({
            TableName: TABLE,
            Key: { jobId },
            UpdateExpression: "set #s=:s, outputKey=:o, finishedAt=:t",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":s": "DONE", ":o": outputKey, ":t": Date.now() },
        }));
    } catch (err) {
        await ddb.send(new UpdateCommand({
            TableName: TABLE,
            Key: { jobId },
            UpdateExpression: "set #s=:s, error=:e, finishedAt=:t",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":s": "FAILED", ":e": String(err), ":t": Date.now() },
        }));
        throw err;
    }
}

async function loop() {
    if (!QUEUE_URL) throw new Error("SQS_QUEUE_URL missing");
    for (;;) {
        const res = await sqs.send(new ReceiveMessageCommand({
            QueueUrl: QUEUE_URL,
            MaxNumberOfMessages: 1,
            WaitTimeSeconds: 10,
            VisibilityTimeout: 120,
        }));

        if (!res.Messages || res.Messages.length === 0) continue;

        for (const m of res.Messages) {
            try {
                await handleMessage(m);
                await sqs.send(new DeleteMessageCommand({
                    QueueUrl: QUEUE_URL,
                    ReceiptHandle: m.ReceiptHandle
                }));
            } catch (e) {
                console.error("Job failed:", e);
                // let SQS retry; after MaxReceiveCount it goes to DLQ
            }
        }
    }
}

loop().catch(e => {
    console.error(e);
    process.exit(1);
});
