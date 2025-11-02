import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../utils/config.js';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));

export const putJob = (item) => client.send(new PutCommand({ TableName: config.ddbTable, Item: item }));
export const getJob = (jobId) => client.send(new GetCommand({ TableName: config.ddbTable, Key: { jobId } }));
export const updateJob = (jobId, patch) => {
    const now = new Date().toISOString();
    return client.send(new UpdateCommand({
        TableName: config.ddbTable,
        Key: { jobId },
        UpdateExpression: 'SET #s = :s, updatedAt = :u, outputKey = :o, error = :e',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
            ':s': patch.status,
            ':u': now,
            ':o': patch.outputKey || null,
            ':e': patch.error || null
        }
    }));
};
