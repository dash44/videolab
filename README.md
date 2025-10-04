# VideoLab (CAB432 A2)

Node/Express app that lets users **sign up / log in with AWS Cognito**, **upload videos to S3 via pre-signed URLs**, store **video & job metadata in DynamoDB**, and simulate **transcoding** by copying to an outputs bucket. Designed to be **stateless** and deployed on **EC2**. Includes an optional **AWS Secrets Manager** demo.

## Setup

**Prerequisites**
- Node.js **v18+**
- On EC2: instance role or credentials with access to S3, DynamoDB, Cognito, (optional) Secrets Manager.

**Install**
```bash
npm install
```
**Environment variables**

Create `.env` file:
```
# Server
PORT=8080
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=supersecret

# AWS
AWS_REGION=ap-southeast-2

# S3 (two buckets)
BUCKET_UPLOADS=a2-group103-uploads
BUCKET_OUTPUTS=a2-group103-outputs

# DynamoDB
DDB_TABLE_VIDEOS=a2-group103-videoTable
DDB_TABLE_JOBS=a2-group103-jobsTable
DDB_GSI_VIDEOS_BY_OWNER=ByOwner

# Cognito
AUTH_MODE=cognito
COGNITO_USER_POOL_ID=ap-southeast-2_OnwWuh1EX
COGNITO_CLIENT_ID=7auhqbvug0j4fq7j5e3dp04ch0

# Redis
REDIS_URL=
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TLS=false
REDIS_PREFIX=videolab

APP_BASE_URL=http://a2-group103.cab432.com:8080


```
## Run

```
node src/server.js
```

Open: http://EC2-public-DNS:8080

