Assignment 2 - Cloud Services Exercises - Response to Criteria
================================================

Instructions
------------------------------------------------
- Keep this file named A2_response_to_criteria.md, do not change the name
- Upload this file along with your code in the root directory of your project
- Upload this file in the current Markdown format (.md extension)
- Do not delete or rearrange sections.  If you did not attempt a criterion, leave it blank
- Text inside [ ] like [eg. S3 ] are examples and should be removed


Overview
------------------------------------------------

- **Name:** Dasha Naumova
- **Student number:** n11772671
- **Partner name (if applicable):** Saskia Wells
- **Application name:** VideoLab
- **Two line description:** The app implemented intends to transcode videos.
- **EC2 instance name or ID:** i-079f1b0fdbf297e76

------------------------------------------------

### Core - First data persistence service

- **AWS service name:**  S3
- **What data is being stored?:** Original uploads and processed outputs (video files/mp4 objects)
- **Why is this service suited to this data?:** S3 is durable, scalable object storage optimaised for large binary blobs with simple key access and lifecycle control. Ideal for video assets.
- **Why is are the other services used not suitable for this data?:** DynamoDB/RDS are for structured or relational data, not large binaries.
- **Bucket/instance/table name:**
    - Uploads: **a2-group103-uploads**
    - Outputs: **a2-group103-outputs**
- **Video timestamp:** 0:11 - 1:11
- **Relevant files:**
    - `src/server.js`
    - `public/app.html`

### Core - Second data persistence service

- **AWS service name:**  DynamoDB
- **What data is being stored?:** 
    - **Videos table:** asset metadata (assetId, ownerSub, preset, status, timestamps, outputKey)
    - **Jobs table:** async job records (jobId, videoId, ownerSub, originalName, s3Bucket/s3Key, status, createdAt, outputs map)
- **Why is this service suited to this data?:** Flexible schema, cheap per item storage and a GSI to list a users videos by owner.
- **Why is are the other services used not suitable for this data?:**
    - S3 cannot perform key condition queries over attributes
    - RDS adds operational overhead for simple key/value style lookups
- **Bucket/instance/table name:**
    - Videos: **a2-group103-videoTable** (PK: assetId; **GSI: `ByOwner`** with PK: `ownerSub`, SK: `createdAt` (String/ISO)))
    - Jobs: **a2-group103-jobTable** (PK: `jobId`)
- **Video timestamp:** 1:11 - 1:41, 2:16 - 3:59
- **Relevant files:** 
    - `src/server.js`


### Third data service

- **AWS service name:**  NA
- **What data is being stored?:** NA
- **Why is this service suited to this data?:** NA
- **Why is are the other services used not suitable for this data?:** 
- **Bucket/instance/table name:**
- **Video timestamp:**
- **Relevant files:**
    -

### S3 Pre-signed URLs

- **S3 Bucket names:** 
    - **a2-group103-uploads** pre signed PUT
    - **a2-group103-outputs** server writes via copy
- **Video timestamp:** 1:41 - 2:16, 2:54 - 3:04
- **Relevant files:**
    - `src/server.js` - `/api/v1/upload-url` creates pre-signed PUT; `/api/v1/upload-complete` marks uploaded 
    - `public/app.html` - JS calls to request URL then `fetch(putUrl, { method:'PUT', body:file })`

### In-memory cache

- **ElastiCache instance name:** NA
- **What data is being cached?:** NA
- **Why is this data likely to be accessed frequently?:** NA
- **Video timestamp:** 
- **Relevant files:** 
    -

### Core - Statelessness

- **What data is stored within your application that is not stored in cloud data services?:** 
    - Intermediate or transcoded video files that are generated temporarily during processing before being uploaded to S3, such as variants, resized videos, or format conversions.

- **Why is this data not considered persistent state?:**
    - These files are not considered as a persistent state as they can be recreated from the original version if lost. The persistent copy of all assets and job metadata is stored in DynamoDB and S3.

- **How does your application ensure data consistency if the app suddenly stops?:** 
    - Job metadata in DynamoDB tracks processing status such as queued, running, done, and error. If the app crashes during processing, the job remains in running state and can be re-queued or retried by checking DynamoDB for incomplete jobs. Intermediate files on the local filesystem are ephemeral; any missing variants can be regenerated from the source stored in S3.

- **Relevant files:**
    - `src/server.js` - `jobsMem` fallback in `/api/v1/jobs/:id`; temp file removal after S3 upload

### Graceful handling of persistent connections

- **Type of persistent connection and use:** 
- A child process (ffmpeg) is spawned to handle video transcoding. This is a persistent system connection that can run for several minutes depending on video size. 

- **Method for handling lost connections:** 
- stderr is streamed and logged so errors are captured in real time. if the process exits with a non-zero code, the service rejects the promise with a detailed error, ensuring that jobs are marked as failed rather than lost. Cleanup is handled by removing temporary files if the process fails or succeeds, avoiding state inconsistency. Becuase transcoded files are uploaded to S3 immediately after completion, there's no risk of data loss if the Node app unexpectedly stops as the source can be re-transcoded.

- **Relevant files:**
    - src/controllers/jobs.controller.js
    - src/services/video.service.js


### Core - Authentication with Cognito

- **User pool name:** ap-southeast-2_OnwWuh1EX - App Client Name: a2-group103-appclient, App Client ID: 7auhqbvug0j4fq7j5e3dp04ch0
- **How are authentication tokens handled by the client?:** 
- After successfully logging in, the client receives an ID token, access token, and refresh token from Cognito. These tokens are currently stored on the client side. The ID token is then attatched as a Bearer token in the Authorisation header when making API requests.

- **Video timestamp:** 3:48 - 5:24
- **Relevant files:**
    - `src/routes/auth.routes.js` - register, confirm, login
    - `src/server.js` - requireAuth
    - `public/index.html` - signup/login UI
    - `public/app.html` - uses token, logout redirect

### Cognito multi-factor authentication

- **What factors are used for authentication:** NA
- **Video timestamp:**
- **Relevant files:**
    -

### Cognito federated identities

- **Identity providers used:** NA
- **Video timestamp:**
- **Relevant files:**
    -

### Cognito groups

- **How are groups used to set permissions?:** NA
- **Video timestamp:**
- **Relevant files:**
    -

### Core - DNS with Route53

- **Subdomain**:  a2-group103.cab432.com
- **Video timestamp:** 5:24 - 6:03

### Parameter store

- **Parameter names:** NA
- **Video timestamp:**
- **Relevant files:**

### Secrets manager

- **Secrets names:** a2-group103-secret
- **Video timestamp:** 6:30 - 6:49
- **Relevant files:**
    - `src/server.js`

### Infrastructure as code

- **Technology used:** NA
- **Services deployed:**
- **Video timestamp:**
- **Relevant files:**
    -

### Other (with prior approval only)

- **Description:** NA
- **Video timestamp:**
- **Relevant files:**
    -

### Other (with prior permission only)

- **Description:** NA
- **Video timestamp:**
- **Relevant files:**
    -
