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

- **AWS service name:**  [eg. S3]
- **What data is being stored?:** [eg video files]
- **Why is this service suited to this data?:** [eg. large files are best suited to blob storage due to size restrictions on other services]
- **Why is are the other services used not suitable for this data?:**
- **Bucket/instance/table name:**
- **Video timestamp:**
- **Relevant files:**
    -

### Core - Second data persistence service

- **AWS service name:**  [eg. DynamoDB]
- **What data is being stored?:** 
- **Why is this service suited to this data?:**
- **Why is are the other services used not suitable for this data?:**
- **Bucket/instance/table name:**
- **Video timestamp:**
- **Relevant files:**
    -

### Third data service

- **AWS service name:**  [eg. RDS]
- **What data is being stored?:** [eg video metadata]
- **Why is this service suited to this data?:** [eg. ]
- **Why is are the other services used not suitable for this data?:** [eg. Advanced video search requires complex querries which are not available on S3 and inefficient on DynamoDB]
- **Bucket/instance/table name:**
- **Video timestamp:**
- **Relevant files:**
    -

### S3 Pre-signed URLs

- **S3 Bucket names:**
- **Video timestamp:**
- **Relevant files:**
    - src/controllers/assets.controller.js

### In-memory cache

- **ElastiCache instance name:**
- **What data is being cached?:** [eg. Thumbnails from YouTube videos obatined from external API]
- **Why is this data likely to be accessed frequently?:** [ eg. Thumbnails from popular YouTube videos are likely to be shown to multiple users ]
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
    - src/aws/dynamo.js
    - src/aws/s3.js
    - src/controllers/jobs.controller.js
    - src/controllers/assets.controller.js
    - src/services/video.service.js

### Graceful handling of persistent connections

- **Type of persistent connection and use:** 
- A child process (ffmpeg) is spawned to handle video transcoding. This is a persistent system connection that can run for several minutes depending on video size. 

- **Method for handling lost connections:** 
- stderr is streamed and logged so errors are captured in real time. if the process exits with a non-zero code, the service rejects the promise with a detailed error, ensuring that jobs are marked as failed rather than lost. Cleanup is handled by removing temporary files if the process fails or succeeds, avoiding state inconsistency. Becuase transcoded files are uploaded to S3 immediately after completion, there's no risk of data loss if the Node app unexpectedly stops as the source can be re-transcoded.

- **Relevant files:**
    - src/controllers/jobs.controller.js
    - src/services/video.service.js


### Core - Authentication with Cognito

- **User pool name:** ap-southeast-2_OnwWuh1EX
- **How are authentication tokens handled by the client?:** 
- After successfully logging in, the client receives an ID token, access token, and refresh token from Cognito. These tokens are currently stored on the client side. The ID token is then attatched as a Bearer token in the Authorisation header when making API requests.

- **Video timestamp:**
- **Relevant files:**
    - src/middleware/auth.js
    - src/controllers/auth.controller.js
    - src/routes/auth.routes.js
    - src/schemas/auth.schema.js
    - src/services/signUp.js

### Cognito multi-factor authentication

- **What factors are used for authentication:** [eg. password, SMS code]
- **Video timestamp:**
- **Relevant files:**
    -

### Cognito federated identities

- **Identity providers used:**
- **Video timestamp:**
- **Relevant files:**
    -

### Cognito groups

- **How are groups used to set permissions?:** [eg. 'admin' users can delete and ban other users]
- **Video timestamp:**
- **Relevant files:**
    -

### Core - DNS with Route53

- **Subdomain**:  a2-n11159677.cab432.com
- **Video timestamp:**

### Parameter store

- **Parameter names:** /videolab/ ?
- **Video timestamp:**
- **Relevant files:**
    - src/aws/ssm.js

### Secrets manager

- **Secrets names:** [eg. n1234567-youtube-api-key]
- **Video timestamp:**
- **Relevant files:**
    - src/aws/secrets.js

### Infrastructure as code

- **Technology used:**
- **Services deployed:**
- **Video timestamp:**
- **Relevant files:**
    -

### Other (with prior approval only)

- **Description:**
- **Video timestamp:**
- **Relevant files:**
    -

### Other (with prior permission only)

- **Description:**
- **Video timestamp:**
- **Relevant files:**
    -
