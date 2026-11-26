require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { runAgent, ALL_TOOLS } = require("./agent/runAgent");
const { extractFromScreenshot } = require("./agent/geminiExtract");
const { getDb } = require("./db/connection");

// ensure DB file exists (seed if missing)
const fs = require("fs");
const { dbPath } = require("./db/connection");
if (!fs.existsSync(dbPath)) {
  require("./db/seed");
} else {
  getDb();
}

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ledger-agent", gemini: Boolean(process.env.GEMINI_API_KEY) });
});

app.get("/api/tools", (_req, res) => {
  res.json({ tools: ALL_TOOLS });
});

app.post("/api/ask", async (req, res) => {
  try {
    const text = String(req.body?.text || req.body?.question || "").trim();
    const extracted = req.body?.extracted || {};
    const result = runAgent({ text, extracted });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || "ask failed" });
  }
});

app.post("/api/ask-screenshot", upload.single("image"), async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!req.file) {
      return res.status(400).json({ error: "image file required (field: image)" });
    }
    const ocr = await extractFromScreenshot(req.file.buffer, req.file.mimetype);
    const result = runAgent({ text, extracted: ocr.fields || {} });
    res.json({ ocr, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "screenshot ask failed" });
  }
});

const port = Number(process.env.PORT) || 4050;
app.listen(port, () => {
  console.log(`ledger-agent listening on http://localhost:${port}`);
});
