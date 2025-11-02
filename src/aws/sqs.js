import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { config } from '../utils/config.js';

const sqs = new SQSClient({ region: config.region });

export const sendJobMessage = async (payload) => {
    return sqs.send(new SendMessageCommand({
        QueueUrl: config.queueUrl,
        MessageBody: JSON.stringify(payload)
    }));
};
