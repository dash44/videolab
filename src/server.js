// src/server.js
import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";

// ESM __dirname 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App setup
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (UI) 
const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));

// index.html (login page)
app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// app.html (post-login page) + allow /app shortcut
app.get(["/app", "/app/"], (_req, res) => {
  res.sendFile(path.join(publicDir, "app.html"));
});

// Cognito auth routes (/cog/...) 
import cogRoutes from "./routes/auth.routes.js";
app.use("/cog", cogRoutes);

// Simple file upload: POST /api/v1/upload (multipart/form-data; field: "file")
const uploadsDir = path.join(__dirname, "../uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({ dest: uploadsDir });

const api = express.Router();
api.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: { message: "No file" } });
  }
  return res.json({
    success: true,
    data: {
      originalName: req.file.originalname,
      storedAs: req.file.filename,
      size: req.file.size,
    },
  });
});
app.use("/api/v1", api);

// Health 
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// 404 fallback for unknown API routes 
app.use((req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/cog/")) {
    return res.status(404).json({ success: false, error: { message: "Not Found" } });
  }
  return next();
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: { message: err.message || "Server error" },
  });
});

// Start 
console.log("COGNITO_CLIENT_ID =", process.env.COGNITO_CLIENT_ID || "(missing)");
app.listen(PORT, () => {
  console.log(`VideoLab API listening on port ${PORT}`);
});
