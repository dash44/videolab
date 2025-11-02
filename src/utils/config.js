import 'dotenv/config';

export const config = {
    port: process.env.PORT || 8080,
    region: process.env.AWS_REGION || 'ap-southeast-2',
    ddbTable: process.env.DDB_TABLE,
    uploadsBucket: process.env.UPLOADS_BUCKET,
    outputsBucket: process.env.OUTPUTS_BUCKET,
    queueUrl: process.env.SQS_QUEUE_URL,
};
