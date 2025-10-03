// src/server.js
import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// request logger
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} ${Date.now()-t0}ms`);
  });
  next();
});

// Static UI
const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));
app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
app.get(["/app", "/app/"], (_req, res) => res.sendFile(path.join(publicDir, "app.html")));

// Cognito routes
import cogRoutes from "./routes/auth.routes.js";
app.use("/cog", cogRoutes);

// Upload API
const uploadsDir = path.join(__dirname, "../uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({ dest: uploadsDir });

app.post("/api/v1/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: { message: "No file" } });

  // Use multer's random filename as an assetId the UI can carry forward
  const assetId = req.file.filename;

  res.json({
    success: true,
    data: {
      assetId,
      originalName: req.file.originalname,
      storedAs: req.file.filename,
      size: req.file.size,
    },
  });
});

// serve uploaded files if you want to preview them
app.get("/uploads/:name", (req, res) => {
  const f = path.join(uploadsDir, req.params.name);
  if (!fs.existsSync(f)) return res.status(404).send("Not found");
  res.sendFile(f);
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

console.log("COGNITO_CLIENT_ID =", process.env.COGNITO_CLIENT_ID || "(missing)");
app.listen(PORT, () => console.log(`VideoLab API listening on port ${PORT}`));
