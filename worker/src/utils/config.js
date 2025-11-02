import 'dotenv/config';

export const config = {
    region: process.env.AWS_REGION || 'ap-southeast-2',
    ddbTable: process.env.DDB_TABLE,
    uploadsBucket: process.env.UPLOADS_BUCKET,
    outputsBucket: process.env.OUTPUTS_BUCKET,
    queueUrl: process.env.SQS_QUEUE_URL,
    visibilityTimeout: Number(process.env.SQS_VISIBILITY || 900),
    waitTimeSeconds: Number(process.env.SQS_WAIT || 20)
};
