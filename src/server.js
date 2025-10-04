// src/server.js
import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

// AWS SDK v3
import {
  S3Client, PutObjectCommand, CopyObjectCommand, HeadObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Your existing Cognito routes
import cogRoutes from "./routes/auth.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// env
const PORT = process.env.PORT || 8080;
const REGION = process.env.AWS_REGION || "ap-southeast-2";

const BUCKET_UPLOADS  = process.env.BUCKET_UPLOADS;   // a2-group103-uploads
const BUCKET_OUTPUTS  = process.env.BUCKET_OUTPUTS;   // a2-group103-outputs

const TBL_VIDEOS = process.env.DDB_TABLE_VIDEOS;      // a2-group103-videoTable
const TBL_JOBS   = process.env.DDB_TABLE_JOBS;        // a2-group103-jobsTable
const GSI_BY_OWNER = process.env.DDB_GSI_VIDEOS_BY_OWNER || "ByOwner"; // optional

console.log("COGNITO_CLIENT_ID =", process.env.COGNITO_CLIENT_ID || "(missing)");
if (!BUCKET_UPLOADS || !BUCKET_OUTPUTS) console.warn("WARNING: BUCKET_UPLOADS/BUCKET_OUTPUTS not set");
if (!TBL_VIDEOS || !TBL_JOBS) console.warn("WARNING: DDB tables not set");

// aws clients
const s3  = new S3Client({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// tiny request logger (so you see requests again)
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => console.log(`${req.method} ${req.url} -> ${res.statusCode} ${Date.now()-t0}ms`));
  next();
});

// ---- auth guard (minimal for demo)
function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return res.status(401).json({ success:false, error:{ message:"Missing token" } });
  next();
}

// (demo) extract username from the JWT **without** verifying (ok for A2 demo)
function usernameFromAuth(req) {
  try {
    const tok = (req.headers.authorization || "").slice("Bearer ".length);
    const [, payloadB64] = tok.split(".");
    const norm = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(Buffer.from(norm, "base64").toString("utf8"));
    return json["cognito:username"] || json.username || json.email || "user";
  } catch { return "user"; }
}

// static UI
const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));
app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
app.get(["/app", "/app/"], (_req, res) => res.sendFile(path.join(publicDir, "app.html")));

// Cognito endpoints you already have
app.use("/cog", cogRoutes);

// helpers
const uid = () => crypto.randomBytes(16).toString("hex");

// S3 PRESIGNED UPLOAD 

// Ask server for a pre-signed PUT URL; browser will PUT directly to S3 uploads bucket
app.post("/api/v1/upload-url", requireAuth, async (req, res) => {
  try {
    const { filename, mime } = req.body || {};
    if (!filename) return res.status(400).json({ success:false, error:{message:"filename required"} });

    const ext = (filename.split(".").pop() || "bin").toLowerCase();
    const key = `uploads/${uid()}-${Date.now()}.${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: BUCKET_UPLOADS,
      Key: key,
      ContentType: mime || "application/octet-stream",
    });
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15m

    res.json({ success:true, data:{ key, uploadUrl }});
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, error:{ message:"Failed to create upload URL" }});
  }
});

// VIDEOS METADATA (DynamoDB) 

// After client uploads to S3, register the object as a video row
app.post("/api/v1/videos", requireAuth, async (req, res) => {
  try {
    const { key, originalName } = req.body || {};
    if (!key) return res.status(400).json({ success:false, error:{ message:"key required" } });

    const videoId = uid();
    const owner = usernameFromAuth(req);

    const item = {
      videoId,
      owner,                       // supports your GSI "ByOwner"
      bucket: BUCKET_UPLOADS,
      s3Key: key,
      originalName: originalName || key.split("/").pop(),
      status: "uploaded",
      createdAt: Date.now(),
    };

    await ddb.send(new PutCommand({ TableName: TBL_VIDEOS, Item: item }));
    res.json({ success:true, data:item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, error:{ message:"failed to save video" }});
  }
});

// TRANSCODE JOBS (DynamoDB + S3 copy uploads -> outputs) ==========

app.post("/api/v1/transcode", requireAuth, async (req, res) => {
  try {
    const { assetId, preset } = req.body || {};
    if (!assetId || !preset) return res.status(400).json({ success:false, error:{ message:"assetId & preset required" } });

    // assetId is the S3 key in uploads bucket
    const srcKey = assetId;
    const dot = srcKey.lastIndexOf(".");
    const base = dot > -1 ? srcKey.slice(0, dot) : srcKey;
    const ext  = dot > -1 ? srcKey.slice(dot) : ".mp4";
    const outKey = `${base}-${preset}p${ext}`;

    const jobId = uid();
    const item = {
      jobId,
      srcBucket: BUCKET_UPLOADS,
      srcKey,
      outBucket: BUCKET_OUTPUTS,
      outKey,
      preset: String(preset),
      status: "queued",
      createdAt: Date.now(),
    };

    await ddb.send(new PutCommand({ TableName: TBL_JOBS, Item: item }));
    return res.json({ success:true, data:{ jobId }});
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, error:{ message:"failed to create job" }});
  }
});

// Poll: after ~8s, perform S3 copy and mark complete
app.get("/api/v1/jobs/:id", requireAuth, async (req, res) => {
  try {
    const { Item: job } = await ddb.send(new GetCommand({
      TableName: TBL_JOBS,
      Key: { jobId: req.params.id }
    }));
    if (!job) return res.status(404).json({ success:false, error:{ message:"job not found" } });

    if (job.status === "queued" && Date.now() - job.createdAt > 8000) {
      try {
        // ensure source exists
        await s3.send(new HeadObjectCommand({ Bucket: job.srcBucket, Key: job.srcKey }));

        // simulate "transcode": copy to outputs bucket with -{preset}p suffix
        await s3.send(new CopyObjectCommand({
          Bucket: job.outBucket,
          CopySource: `/${job.srcBucket}/${job.srcKey}`,
          Key: job.outKey,
          MetadataDirective: "REPLACE",
        }));

        await ddb.send(new UpdateCommand({
          TableName: TBL_JOBS,
          Key: { jobId: job.jobId },
          UpdateExpression: "SET #s = :done, finishedAt = :t",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":done": "complete", ":t": Date.now() },
        }));
        job.status = "complete";
        job.finishedAt = Date.now();
      } catch (err) {
        console.error(err);
        await ddb.send(new UpdateCommand({
          TableName: TBL_JOBS,
          Key: { jobId: job.jobId },
          UpdateExpression: "SET #s = :err, message = :m",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":err": "error", ":m": String(err?.message || err) },
        }));
        job.status = "error";
        job.message = String(err?.message || err);
      }
    }

    res.json({ success:true, data: job });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, error:{ message:"job lookup failed" }});
  }
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`VideoLab API listening on port ${PORT}`));
