const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.join(__dirname, "../../docs");

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function loadChunks() {
  if (!fs.existsSync(DOCS_DIR)) return [];
  const files = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));
  const chunks = [];

  for (const file of files) {
    const full = path.join(DOCS_DIR, file);
    const text = fs.readFileSync(full, "utf8");
    const parts = text.split(/\n(?=#{1,3}\s)/).map((p) => p.trim()).filter(Boolean);
    parts.forEach((part, idx) => {
      chunks.push({
        id: `${file}#${idx}`,
        source: file,
        text: part,
        tokens: tokenize(part),
      });
    });
  }
  return chunks;
}

let CACHE = null;
function getChunks() {
  if (!CACHE) CACHE = loadChunks();
  return CACHE;
}

/**
 * Lightweight local RAG retriever (keyword overlap).
 * Good enough for demo runbooks; swap for embeddings later if needed.
 */
function searchDocs(query, limit = 3) {
  const qTokens = tokenize(query);
  if (!qTokens.length) return { query, results: [] };

  const scored = getChunks()
    .map((chunk) => {
      let score = 0;
      for (const t of qTokens) {
        if (chunk.tokens.includes(t)) score += 1;
        if (chunk.text.toLowerCase().includes(t)) score += 0.25;
      }
      return { ...chunk, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ id, source, text, score }) => ({ id, source, text, score }));

  return { query, results: scored };
}

module.exports = { searchDocs, getChunks };
