import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    UpdateCommand,
    QueryCommand
} from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "ap-southeast-2";
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

export const tables = {
    videos: process.env.DDB_TABLE_VIDEOS || "VideosTable",
    jobs: process.env.DDB_TABLE_JOBS || "JobsTable"
};

export const VideoRepo = {
    put: (item) =>
        ddb.send(new PutCommand({ TableName: tables.videos, Item: item })),

    get: (assetId) =>
        ddb.send(new GetCommand({ TableName: tables.videos, Key: { assetId } })),

    queryByOwner: (ownerSub, { limit = 25, newestFirst = true, nextKey } = {}) =>
        ddb.send(
            new QueryCommand({
                TableName: tables.videos,
                IndexName: process.env.DDB_GSI_VIDEOS_BY_OWNER || "ByOwner",
                KeyConditionExpression: "#o = :o",
                ExpressionAttributeNames: { "#o": "ownerSub" }, // needs to match schema 
                ExpressionAttributeValues: { ":o": ownerSub },
                Limit: limit,
                ScanIndexForward: !newestFirst,
                ExclusiveStartKey: nextKey || undefined
            })
        ),
    
    updateOutputs: (asstId, output, status) =>
        ddb.send(
            new UpdateCommand({
                TableName: tables.videos,
                Key: { assetId },
                UpdateExpression: "SET #o = list_append(if_not_exists(#o, :empty), :one), #s = :s, #u = :u",
                ExpressionAttributeNames: {
                    "#o": "outputs",
                    "#s": "status",
                    "#u": "updatedAt"
                },
                ExpressionAttributeValues: {
                    ":one": [output],
                    ":empty": [],
                    ":s": status,
                    ":u": new Date().toISOString()
                },
            })
        )
};

export const JobRepo = {
    put: (item) =>
        ddb.send(new PutCommand({ TableName: tables.jobs, Item: item })),

    get: (jobId) =>
        ddb.send(new GetCommand({ TableName: tables.jobs, Key: { jobId } })),

    setStatus: (jobId, status, extra = {}) => {
        const names = { "#s": "status", "#u": "updatedAt" };
        const values = { ":s": status, ":u": new Date().toISOString() };
        const sets = ["#s = :s", "#u = :u"];

        Object.entries(extra).forEach(([k, v], i) => {
            const nameKey = `#f${i}`;
            const valueKey = `:v${i}`;
            names[nameKey] = k;
            values[valueKey] = v;
            sets.push(`${nameKey} = ${valueKey}`);
        })
    }
};