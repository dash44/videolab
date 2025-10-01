import { presignPut, presignGet } from "../aws/s3.js";

/**
 * IMPORTANT: client must use same Content Type header used here
 */

export async function createUploadUrl({ bucket, key, contentType, expiresSeconds = 900}) {
    if (!bucket || !key) throw new Error("bucket and key required!!!!");
    return presignPut({ bucket, key, contentType, expiresSeconds });
}

export async function createDownloadUrl({ bucket, key, expiresSeconds = 900, asAttachmentName }) {
    if (!bucket || !key) throw new Error("bucket and key required!!!!");
    return presignGet({ 
        bucket, 
        key, 
        expiresSeconds,
        responseContentDisposition: asAttachmentName ? `attachment; filename="${asAttachmentName}"` : undefined
     });
}