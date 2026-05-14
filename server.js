/**
 * AI Image Generation — Express backend
 *
 * POST /generate uses Replicate (see replicateGenerate.js).
 * Set REPLICATE_API_TOKEN in .env or on Render.
 */

// Load variables from .env into process.env (must run early).
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { runWithReplicate } = require("./replicateGenerate");

const app = express();

// --- Port: use .env PORT or default 3000 ---
const PORT = Number(process.env.PORT) || 3000;

// --- CORS: allow your Framer site to call this API from the browser ---
// Browsers block cross-origin requests unless the server sends the right headers.
// Set CORS_ORIGIN in .env to your published Framer URL (see .env.example).
const corsOrigin = process.env.CORS_ORIGIN;
const corsOptions = {
  // If CORS_ORIGIN is set, only that origin is allowed. Otherwise allow all (OK for quick local tests).
  origin: corsOrigin || true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Parse JSON bodies (not used for /generate multipart, but handy for other routes later).
app.use(express.json());

// --- Multer: handle multipart/form-data (file uploads in the same request as text fields) ---
// We store uploads on disk under ./uploads so you can inspect them while learning.
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename(_req, file, cb) {
    // Prefix with timestamp so filenames stay unique.
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safe);
  },
});

// Limit file size (5 MB per file) to avoid huge uploads during development.
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Field names your Framer (or other) client should send:
// - image (required): the user's photo
// - clothing (optional): reference clothing image
// - prompt (optional): text description
const generateUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "clothing", maxCount: 1 },
]);

// Health check so you know the server is running.
app.get("/", (_req, res) => {
  res.json({ ok: true, message: "AI image backend is running. POST files to /generate" });
});

/**
 * POST /generate
 * Content-Type: multipart/form-data
 * Fields: image (file, required), clothing (file, optional), prompt (text, optional)
 *
 * Success JSON shape (always):
 *   { "success": true, "imageUrl": "...", "imageDataUrl": "..." }
 * imageDataUrl may be "" if the server could not download the output to build a data URL
 * (imageUrl will still be a working Replicate delivery URL).
 */
app.post("/generate", generateUpload, async (req, res) => {
  const files = req.files || {};
  const userFile = files.image && files.image[0];
  const clothingFile = files.clothing && files.clothing[0];

  if (!userFile) {
    if (clothingFile && clothingFile.path) {
      fs.unlink(clothingFile.path, () => {});
    }
    return res.status(400).json({
      success: false,
      error: "Missing required file field: image",
    });
  }

  const prompt = req.body && req.body.prompt ? String(req.body.prompt).trim() : "";

  try {
    const { imageUrl, imageDataUrl } = await runWithReplicate({
      humanImagePath: userFile.path,
      clothingImagePath: clothingFile ? clothingFile.path : null,
      prompt,
    });

    return res.json({
      success: true,
      imageUrl,
      imageDataUrl: imageDataUrl || "",
    });
  } catch (err) {
    console.error(err);
    const status = err.code === "NO_TOKEN" ? 503 : 502;
    return res.status(status).json({
      success: false,
      error: err.message || "Generation failed",
    });
  } finally {
    if (userFile.path) fs.unlink(userFile.path, () => {});
    if (clothingFile && clothingFile.path) fs.unlink(clothingFile.path, () => {});
  }
});

// Central error handler for Multer errors (e.g. file too large).
app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, error: "File too large (max 5 MB per file)" });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) {
    return res.status(500).json({ success: false, error: "Unexpected error" });
  }
  next();
});

// Listen on all network interfaces so cloud hosts (e.g. Render) can send traffic to the app.
// You can still open http://localhost:PORT on your own computer while developing.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT} (bind 0.0.0.0)`);
  console.log(`CORS origin: ${corsOrigin || "(any — set CORS_ORIGIN for production Framer URL)"}`);
});
