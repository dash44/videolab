import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { randomUUID } from "crypto";
import { spawn, spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// very small request logger
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.url} -> ${res.statusCode} ${Date.now() - t0}ms`);
  });
  next();
});

// in-memory job store
const jobs = new Map();

// auth guard (demo-level check)
function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: { message: "Missing token" } });
  }
  next();
}

// Static UI
const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));
app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
app.get(["/app", "/app/"], (_req, res) => res.sendFile(path.join(publicDir, "app.html")));

// Cognito routes
import cogRoutes from "./routes/auth.routes.js";
app.use("/cog", cogRoutes);

// Uploads
const uploadsDir = path.join(__dirname, "../uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

// serve /uploads/* files (so output URLs work)
app.use("/uploads", express.static(uploadsDir));

const upload = multer({ dest: uploadsDir });

// (you can add requireAuth here if you want to enforce login for uploads)
app.post("/api/v1/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: { message: "No file" } });
  const assetId = req.file.filename; // use multer's random name as asset id
  res.json({
    success: true,
    data: {
      assetId,
      originalName: req.file.originalname,
      storedAs: req.file.filename,
      size: req.file.size
    }
  });
});

app.get("/uploads/:name", (req, res) => {
    const f = path.join(uploadsDir, req.params.name);
    if (!fs.existsSync(f)) return res.status(404).send("Not found");
    res.sendFile(f);
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Transcode job (local ffmpeg or simulated)
app.post("/api/v1/transcode", requireAuth, async (req, res) => {
  const { assetId, preset } = req.body || {};
  if (!assetId || !preset) {
    return res.status(400).json({ success: false, error: { message: "assetId and preset required" } });
  }

  const inFile = path.join(uploadsDir, assetId);
  if (!fs.existsSync(inFile)) {
    return res.status(404).json({ success: false, error: { message: "source not found" } });
  }

  const jobId = randomUUID();
  const outName = `${assetId}.${preset}p.mp4`;
  const outFile = path.join(uploadsDir, outName);
  jobs.set(jobId, { status: "queued", outputPath: null, preset, assetId, startedAt: Date.now() });

  // robust ffmpeg availability check
  const hasFfmpeg = (() => {
    try { spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; }
    catch { return false; }
  })();

  if (hasFfmpeg) {
    const h = String(preset); // 360 | 720 | 1080
    const vf = `scale=-2:${h}`;
    const ff = spawn("ffmpeg", [
      "-y", "-i", inFile, "-vf", vf,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
      "-c:a", "aac", outFile
    ]);

    jobs.set(jobId, { status: "running", outputPath: null, preset, assetId, startedAt: Date.now() });

    ff.on("close", (code) => {
      if (code === 0) {
        jobs.set(jobId, {
          status: "complete",
          outputPath: `/uploads/${outName}`,
          preset, assetId, finishedAt: Date.now()
        });
      } else {
        jobs.set(jobId, { status: "error", message: `ffmpeg exited ${code}` });
      }
    });
  } else {
    // simulate a short job so you can demo
    jobs.set(jobId, { status: "running", outputPath: null, preset, assetId, startedAt: Date.now() });
    setTimeout(() => {
      jobs.set(jobId, {
        status: "complete",
        outputPath: `/uploads/${outName}`, // path will 404 in sim (no file), but keeps the flow
        preset, assetId, finishedAt: Date.now()
      });
    }, 4000);
  }

  return res.json({ success: true, data: { jobId } });
});

// Poll a job
app.get("/api/v1/jobs/:id", requireAuth, (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j) return res.status(404).json({ success: false, error: { message: "job not found" } });
  return res.json({ success: true, data: j });
});

console.log("COGNITO_CLIENT_ID =", process.env.COGNITO_CLIENT_ID || "(missing)");
app.listen(PORT, () => console.log(`VideoLab API listening on port ${PORT}`));
