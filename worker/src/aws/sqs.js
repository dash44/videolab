import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { config } from '../utils/config.js';

const sqs = new SQSClient({ region: config.region });

export async function receiveOne() {
    const resp = await sqs.send(new ReceiveMessageCommand({
        QueueUrl: config.queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: config.waitTimeSeconds,
        VisibilityTimeout: config.visibilityTimeout
    }));
    return (resp.Messages && resp.Messages[0]) || null;
}

export function del(msg) {
    return sqs.send(new DeleteMessageCommand({
        QueueUrl: config.queueUrl,
        ReceiptHandle: msg.ReceiptHandle
    }));
}
