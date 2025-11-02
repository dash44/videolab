import "dotenv/config";
import express from "express";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

// ---- Env
const {
    PORT = 8080,
    AWS_REGION = "ap-southeast-2",
    SQS_QUEUE_URL,
    DDB_TABLE,
    STATIC_DIR = "./public",
} = process.env;

if (!SQS_QUEUE_URL || !DDB_TABLE) {
    console.error("Missing env SQS_QUEUE_URL or DDB_TABLE");
}

const app = express();
app.use(express.json());

// ---- AWS clients
const sqs = new SQSClient({ region: AWS_REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: AWS_REGION }));

// ---- Health for ALB
app.get("/health", (_req, res) => res.status(200).send("ok"));

// ---- Create a job
app.post("/jobs", async (req, res) => {
    try {
        // Expect { key: "uploads/<filename>" } referencing your UPLOADS bucket key
        const { key } = req.body || {};
        if (!key) return res.status(400).json({ error: "key is required" });

        const jobId = randomUUID();
        const createdAt = new Date().toISOString();

        // Save initial job
        await ddb.send(new PutCommand({
            TableName: DDB_TABLE,
            Item: { jobId, status: "queued", inputKey: key, createdAt }
        }));

        // Send to SQS
        await sqs.send(new SendMessageCommand({
            QueueUrl: SQS_QUEUE_URL,
            MessageBody: JSON.stringify({ jobId, key }),
            MessageGroupId: "videolab", // OK for standard; harmless on FIFO off
            MessageDeduplicationId: jobId // ignored on Standard queues
        }));

        res.status(202).json({ jobId, status: "queued" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "enqueue failed" });
    }
});

// ---- Get job by id
app.get("/jobs/:id", async (req, res) => {
    try {
        const out = await ddb.send(new GetCommand({
            TableName: DDB_TABLE,
            Key: { jobId: req.params.id }
        }));
        if (!out.Item) return res.status(404).json({ error: "not found" });
        res.json(out.Item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "failed to fetch job" });
    }
});

// Static (optional)
app.use(express.static(path.resolve(STATIC_DIR)));

app.listen(PORT, () => {
    console.log(`API listening on :${PORT}`);
});
