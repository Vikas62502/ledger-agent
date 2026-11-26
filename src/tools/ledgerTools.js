const { getDb } = require("../db/connection");

/**
 * All money facts come from these tools.
 * The LLM must never invent amounts or paid/unpaid status.
 */

function findByReferenceId(referenceId) {
  const db = getDb();
  const value = String(referenceId || "").trim();
  if (!value) return { found: false, reason: "empty referenceId" };

  const txn = db
    .prepare(
      `SELECT t.*, a.name AS agent_name, a.mobile AS agent_mobile, a.role AS agent_role
       FROM transactions t
       JOIN agents a ON a.id = t.agent_id
       WHERE t.reference_id = ?
       ORDER BY t.id DESC
       LIMIT 1`
    )
    .get(value);

  if (!txn) return { found: false, referenceId: value };
  return { found: true, matchType: "reference_id", txn };
}

function findByUtr(utr) {
  const db = getDb();
  const value = String(utr || "").trim();
  if (!value) return { found: false, reason: "empty utr" };

  const txn = db
    .prepare(
      `SELECT t.*, a.name AS agent_name, a.mobile AS agent_mobile, a.role AS agent_role
       FROM transactions t
       JOIN agents a ON a.id = t.agent_id
       WHERE t.bank_reference = ? OR t.reference_id = ?
       ORDER BY t.id DESC
       LIMIT 1`
    )
    .get(value, value);

  if (!txn) return { found: false, utr: value };
  return {
    found: true,
    matchType: txn.bank_reference === value ? "bank_reference" : "reference_id",
    txn,
  };
}

function findTagSerial(serial) {
  const db = getDb();
  const raw = String(serial || "").trim();
  const compact = raw.replace(/[-\s]/g, "");
  if (!raw) return { found: false, reason: "empty serial" };

  const tag = db
    .prepare(
      `SELECT tg.*, a.name AS agent_name, a.mobile AS agent_mobile
       FROM tags tg
       LEFT JOIN agents a ON a.id = tg.agent_id
       WHERE tg.serial = ? OR REPLACE(tg.serial, '-', '') = ?
       LIMIT 1`
    )
    .get(raw, compact);

  if (!tag) return { found: false, serial: raw };
  return { found: true, tag };
}

function findByVrn(vrn) {
  const db = getDb();
  const value = String(vrn || "").replace(/[\s-]/g, "").toUpperCase();
  if (!value) return { found: false, reason: "empty vrn" };

  const tag = db
    .prepare(
      `SELECT tg.*, a.name AS agent_name, a.mobile AS agent_mobile
       FROM tags tg
       LEFT JOIN agents a ON a.id = tg.agent_id
       WHERE REPLACE(UPPER(tg.vrn), '-', '') = ?
       ORDER BY tg.id DESC
       LIMIT 1`
    )
    .get(value);

  if (!tag) return { found: false, vrn: value };

  const related = db
    .prepare(
      `SELECT transaction_id, type, amount, reason, created_at
       FROM transactions
       WHERE agent_id = ? AND reason LIKE ?
       ORDER BY id DESC
       LIMIT 10`
    )
    .all(tag.agent_id, `%${value}%`);

  return { found: true, tag, relatedTxns: related };
}

function listWalletTxns(agentId, limit = 10) {
  const db = getDb();
  const id = Number(agentId);
  if (!id) return { found: false, reason: "invalid agentId" };

  const rows = db
    .prepare(
      `SELECT transaction_id, type, amount, reason, reference_id, bank_reference, created_at
       FROM transactions
       WHERE agent_id = ?
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(id, Math.min(Number(limit) || 10, 50));

  return { found: true, agentId: id, txns: rows };
}

const toolDefinitions = [
  {
    name: "find_by_reference_id",
    description:
      "Find wallet top-up by PhonePe Message / Cashfree payment id stored as reference_id (usually 10 digits).",
    inputSchema: {
      type: "object",
      properties: { referenceId: { type: "string" } },
      required: ["referenceId"],
    },
  },
  {
    name: "find_by_utr",
    description:
      "Find wallet top-up by UPI/bank UTR (bank_reference, usually 12 digits) or reference_id.",
    inputSchema: {
      type: "object",
      properties: { utr: { type: "string" } },
      required: ["utr"],
    },
  },
  {
    name: "find_tag_serial",
    description: "Find FASTag inventory/registration by serial (hyphenated or compact).",
    inputSchema: {
      type: "object",
      properties: { serial: { type: "string" } },
      required: ["serial"],
    },
  },
  {
    name: "find_by_vrn",
    description: "Find tag + related issuance/refund/offer txns by vehicle number.",
    inputSchema: {
      type: "object",
      properties: { vrn: { type: "string" } },
      required: ["vrn"],
    },
  },
  {
    name: "list_wallet_txns",
    description: "List recent wallet transactions for an agent id.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "number" },
        limit: { type: "number" },
      },
      required: ["agentId"],
    },
  },
];

function callTool(name, args = {}) {
  switch (name) {
    case "find_by_reference_id":
      return findByReferenceId(args.referenceId);
    case "find_by_utr":
      return findByUtr(args.utr);
    case "find_tag_serial":
      return findTagSerial(args.serial);
    case "find_by_vrn":
      return findByVrn(args.vrn);
    case "list_wallet_txns":
      return listWalletTxns(args.agentId, args.limit);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

module.exports = {
  findByReferenceId,
  findByUtr,
  findTagSerial,
  findByVrn,
  listWalletTxns,
  toolDefinitions,
  callTool,
};
