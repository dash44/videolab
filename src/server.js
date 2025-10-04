import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { randomUUID } from "crypto";

// AWS SDK v3
import { S3Client, PutObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


// env + aws clients
const {
  PORT = 8080,
  AWS_REGION,
  BUCKET_UPLOADS,
  BUCKET_OUTPUTS,
  DDB_TABLE_VIDEOS,
  DDB_TABLE_JOBS,
  DDB_GSI_VIDEOS_BY_OWNER = "ByOwner", // you said this exists already
  COGNITO_CLIENT_ID, // just to confirm .env is loading
} = process.env;

const s3 = new S3Client({ region: AWS_REGION });
const ddb  = new DynamoDBClient({ region: AWS_REGION });
const ddbc = DynamoDBDocumentClient.from(ddb);

// basic app setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// tiny logger so you see requests
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.url} -> ${res.statusCode} ${Date.now() - t0}ms`);
  });
  next();
});

// auth helpers
function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return res.status(401).json({ success: false, error: { message: "Missing token" } });
  next();
}

// Decode Cognito JWT payload (demo-only: no signature verification)
function jwtPayload(req) {
    try {
      const token = (req.headers.authorization || '').split(' ')[1] || '';
      const payloadB64 = token.split('.')[1] || '';
      return JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    } catch {
      return {};
    }
  }
  

// decode (not verify) JWT just to extract claims for demo
function getClaims(req) {
  try {
    const token = (req.headers.authorization || "").split(" ")[1] || "";
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8"));
    return {
      sub: payload.sub,
      username: payload["cognito:username"] || payload.username || payload.sub,
      email: payload.email,
    };
  } catch {
    return {};
  }
}

// static files (UI)
const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));
app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
app.get(["/app", "/app/"], (_req, res) => res.sendFile(path.join(publicDir, "app.html")));

// cognito routes (you already have these)
import cogRoutes from "./routes/auth.routes.js";
app.use("/cog", cogRoutes);

// UPLOAD -> S3 + video metadata -> DynamoDB
const uploadsDir = path.join(__dirname, "../uploads"); // temp landing for multer
fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({ dest: uploadsDir });

// NOTE: keep auth so we can set ownerSub from the token
app.post("/api/v1/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: { message: "No file" } });

    const claims = getClaims(req);
    const ownerSub = claims.sub || "unknown";
    const assetId = req.file.filename; // reuse multer id as your assetId (PK)
    const key = `uploads/${assetId}`;  // simple mapping, one key per asset

    // 1) put object to S3 uploads bucket
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_UPLOADS,
        Key: key,
        Body: fs.createReadStream(req.file.path),
        ContentType: req.file.mimetype || "application/octet-stream",
      })
    );
    // remove temp file
    fs.unlink(req.file.path, () => {});

    // 2) write video metadata to DynamoDB (PK = assetId; GSI pk = ownerSub)
    const now = new Date().toISOString();
    await ddbc.send(
      new PutCommand({
        TableName: DDB_TABLE_VIDEOS,
        Item: {
          assetId,                 // PK (matches your table)
          ownerSub,                // GSI partition key (matches your index)
          ownerUsername: claims.username,
          originalName: req.file.originalname,
          s3Bucket: BUCKET_UPLOADS,
          s3Key: key,
          size: req.file.size,
          status: "uploaded",
          createdAt: now,          // GSI sort key if you use createdAt there
          outputs: {},             // we’ll fill this as jobs complete
        },
        // optional: condition to avoid overwrite:
        // ConditionExpression: "attribute_not_exists(assetId)"
      })
    );

    return res.json({
      success: true,
      data: {
        assetId,
        bucket: BUCKET_UPLOADS,
        key,
        createdAt: now,
      },
    });
  } catch (e) {
    console.error("upload error:", e);
    return res.status(500).json({ success: false, error: { message: e.message || "Upload failed" } });
  }
});

app.post('/api/v1/upload-url', requireAuth, express.json(), async (req, res) => {
    try {
        const { filename, contentType } = req.body || {};
        if (!filename || !contentType) {
            return res.status(400).json({ success:false, error:{ message:'filename and contentType are required' }});
        }
        
        const { sub: ownerSub = 'unknown', 'cognito:username': username = 'unknown' } = jwtPayload(req);
  
        const assetId = randomUUID();
        const key = `uploads/${assetId}`;
        const now = new Date().toISOString();
    
        // record the intent in DynamoDB (status "uploading")
        await ddbc.send(new PutCommand({
            TableName: DDB_TABLE_VIDEOS,
            Item: {
            assetId,
            ownerSub,
            username,
            originalName: filename,
            contentType,
            status: 'uploading',
            createdAt: now,
            s3Bucket: BUCKET_UPLOADS,
            s3Key: key,
            }
        }));
    
        // presigned URL to upload directly to S3
        const cmd = new PutObjectCommand({
            Bucket: BUCKET_UPLOADS,
            Key: key,
            ContentType: contentType,
            Metadata: { assetId, ownerSub, username, originalName: filename }
        });
        const putUrl = await getSignedUrl(s3, cmd, { expiresIn: 900 });
    
        return res.json({ success:true, data:{ assetId, key, putUrl }});
        } catch (err) {
        console.error('upload-url error:', err);
        return res.status(500).json({ success:false, error:{ message:'Failed to create upload URL' }});
    }
});

app.post('/api/v1/upload-complete', requireAuth, express.json(), async (req, res) => {
    try {
        const { assetId } = req.body || {};
        if (!assetId) {
            return res.status(400).json({ success:false, error:{ message:'assetId required' }});
        }
    
        await ddbc.send(new UpdateCommand({
            TableName: DDB_TABLE_VIDEOS,
            Key: { assetId },
            UpdateExpression: 'SET #st = :s, uploadedAt = :t',
            ExpressionAttributeNames: { '#st': 'status' },
            ExpressionAttributeValues: { ':s':'uploaded', ':t': new Date().toISOString() }
        }));
    
        return res.json({ success:true });
        } catch (err) {
        console.error('upload-complete error:', err);
        return res.status(500).json({ success:false, error:{ message:'Failed to mark upload complete' }});
        }
    });

// serve uploaded/processed files back if needed (handy for demo)
app.get("/uploads/:name", (req, res) => {
  const f = path.join(uploadsDir, req.params.name);
  if (!fs.existsSync(f)) return res.status(404).send("Not found");
  res.sendFile(f);
});

// JOBS: simulate “transcode” by S3 copy to outputs bucket
const jobsMem = new Map(); // quick in-memory mirror for fast polling

app.post("/api/v1/transcode", requireAuth, async (req, res) => {
  const { assetId, preset } = req.body || {};
  if (!assetId || !preset) {
    return res.status(400).json({ success: false, error: { message: "assetId and preset required" } });
  }
  const claims = getClaims(req);
  const ownerSub = claims.sub || "unknown";

  try {
    // read the video item (optional, to confirm it exists)
    const v = await ddbc.send(new GetCommand({ TableName: DDB_TABLE_VIDEOS, Key: { assetId } }));
    if (!v.Item) return res.status(404).json({ success: false, error: { message: "video not found" } });

    const jobId = randomUUID();
    const srcKey = v.Item.s3Key || `uploads/${assetId}`;
    const outKey = `outputs/${assetId}.${preset}p.mp4`;

    // write job item (queued)
    await ddbc.send(
      new PutCommand({
        TableName: DDB_TABLE_JOBS,
        Item: {
          jobId,            // PK in jobs table
          videoId: assetId,
          ownerSub,
          preset,
          status: "queued",
          createdAt: Date.now(),
        },
      })
    );
    jobsMem.set(jobId, { status: "queued", preset, assetId });

    // kick async “transcode”: S3 copy from uploads bucket to outputs bucket
    (async () => {
      try {
        // mark running
        await ddbc.send(
          new UpdateCommand({
            TableName: DDB_TABLE_JOBS,
            Key: { jobId },
            UpdateExpression: "SET #s = :s, startedAt = :t",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":s": "running", ":t": Date.now() },
          })
        );
        jobsMem.set(jobId, { status: "running", preset, assetId });

        // Copy object (acts as our "transcode" for demo)
        await s3.send(
          new CopyObjectCommand({
            Bucket: BUCKET_OUTPUTS,
            Key: outKey,
            CopySource: `${BUCKET_UPLOADS}/${srcKey}`,
            ContentType: "video/mp4",
          })
        );

        // mark complete
        await ddbc.send(
          new UpdateCommand({
            TableName: DDB_TABLE_JOBS,
            Key: { jobId },
            UpdateExpression: "SET #s = :s, finishedAt = :t, outputKey = :o",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":s": "complete", ":t": Date.now(), ":o": outKey },
          })
        );
        jobsMem.set(jobId, { status: "complete", outputPath: `/s3/${BUCKET_OUTPUTS}/${outKey}` });

        // patch the video item with outputs map and status
        await ddbc.send(
          new UpdateCommand({
            TableName: DDB_TABLE_VIDEOS,
            Key: { assetId },
            UpdateExpression:
              "SET #out.#p = :k, #st = :st",
            ExpressionAttributeNames: {
              "#out": "outputs",
              "#p": preset,
              "#st": "status",
            },
            ExpressionAttributeValues: {
              ":k": outKey,
              ":st": "ready",
            },
          })
        );
      } catch (err) {
        console.error("transcode err:", err);
        await ddbc.send(
          new UpdateCommand({
            TableName: DDB_TABLE_JOBS,
            Key: { jobId },
            UpdateExpression: "SET #s = :s, error = :e",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":s": "error", ":e": String(err?.message || err) },
          })
        );
        jobsMem.set(jobId, { status: "error", message: String(err?.message || err) });
      }
    })();

    return res.json({ success: true, data: { jobId } });
  } catch (e) {
    console.error("transcode route error:", e);
    return res.status(500).json({ success: false, error: { message: e.message || "Transcode failed" } });
  }
});

app.get("/api/v1/jobs/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  const mem = jobsMem.get(id);
  if (mem) return res.json({ success: true, data: mem });

  try {
    const r = await ddbc.send(new GetCommand({ TableName: DDB_TABLE_JOBS, Key: { jobId: id } }));
    if (!r.Item) return res.status(404).json({ success: false, error: { message: "job not found" } });

    const data = {
      status: r.Item.status,
      outputPath: r.Item.outputKey ? `/s3/${BUCKET_OUTPUTS}/${r.Item.outputKey}` : null,
      message: r.Item.error || null,
    };
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, error: { message: e.message } });
  }
});

// optional: list my videos by GSI (ownerSub)
app.get("/api/v1/me/videos", requireAuth, async (req, res) => {
  const { sub } = getClaims(req);
  try {
    const r = await ddbc.send(
      new QueryCommand({
        TableName: DDB_TABLE_VIDEOS,
        IndexName: DDB_GSI_VIDEOS_BY_OWNER,
        KeyConditionExpression: "ownerSub = :o",
        ExpressionAttributeValues: { ":o": sub },
        ScanIndexForward: false,
        Limit: 20,
      })
    );
    return res.json({ success: true, data: r.Items || [] });
  } catch (e) {
    return res.status(500).json({ success: false, error: { message: e.message } });
  }
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

console.log("COGNITO_CLIENT_ID =", COGNITO_CLIENT_ID || "(missing)");
console.log("Using:", { AWS_REGION, BUCKET_UPLOADS, BUCKET_OUTPUTS, DDB_TABLE_VIDEOS, DDB_TABLE_JOBS, DDB_GSI_VIDEOS_BY_OWNER });

app.listen(PORT, () => console.log(`VideoLab API listening on port ${PORT}`));
