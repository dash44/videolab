#!/usr/bin/env bash
set -euo pipefail

export AWS_DEFAULT_REGION=ap-southeast-2
AWSCMD="aws --endpoint-url=http://localhost:4566 --region ap-southeast-2"

# names used by your code
UPLOADS="a3-local-uploads"
OUTPUTS="a3-local-outputs"
TABLE="VideoJobs"
QUEUE="videolab-a3-jobs"

echo "Creating S3 buckets…"
$AWSCMD s3api create-bucket --bucket "$UPLOADS" --create-bucket-configuration LocationConstraint=ap-southeast-2 >/dev/null || true
$AWSCMD s3api create-bucket --bucket "$OUTPUTS" --create-bucket-configuration LocationConstraint=ap-southeast-2 >/dev/null || true

echo "Creating DynamoDB table…"
$AWSCMD dynamodb create-table \
  --table-name "$TABLE" \
  --attribute-definitions AttributeName=jobId,AttributeType=S \
  --key-schema AttributeName=jobId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST >/dev/null || true

echo "Creating SQS queue…"
$AWSCMD sqs create-queue --queue-name "$QUEUE" >/dev/null || true

echo "All set."
