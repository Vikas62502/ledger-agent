const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const dataDir = path.join(__dirname, "../../data");
const dbPath = path.join(dataDir, "ledger.db");

let cached = null;

function getDb() {
  if (cached) return cached;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(dbPath);
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);
  cached = db;
  return db;
}

function resetCache() {
  if (cached) {
    try {
      cached.close();
    } catch {
      /* ignore */
    }
    cached = null;
  }
}

module.exports = { getDb, dbPath, resetCache };
