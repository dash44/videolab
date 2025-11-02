import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../utils/config.js';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));

export function setJobStatus(jobId, patch) {
    const now = new Date().toISOString();
    const fields = [];
    const names = { '#u': 'updatedAt' };
    const values = { ':u': now };

    if (patch.status) { fields.push('#s = :s'); names['#s'] = 'status'; values[':s'] = patch.status; }
    if (patch.outputKey !== undefined) { fields.push('outputKey = :o'); values[':o'] = patch.outputKey; }
    if (patch.error !== undefined) { fields.push('#e = :e'); names['#e'] = 'error'; values[':e'] = patch.error; }

    return ddb.send(new UpdateCommand({
        TableName: config.ddbTable,
        Key: { jobId },
        UpdateExpression: `SET ${fields.join(', ')}, #u = :u`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values
    }));
}
