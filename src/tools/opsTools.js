const { getDb } = require("../db/connection");

function explainTag(serial) {
  const db = getDb();
  const raw = String(serial || "").trim();
  const compact = raw.replace(/[-\s]/g, "");
  if (!raw) return { found: false, reason: "empty serial" };

  const tag = db
    .prepare(
      `SELECT tg.*, a.name AS agent_name, p.name AS previous_owner_name
       FROM tags tg
       LEFT JOIN agents a ON a.id = tg.agent_id
       LEFT JOIN agents p ON p.id = tg.previous_owner_id
       WHERE tg.serial = ? OR REPLACE(tg.serial, '-', '') = ?
       LIMIT 1`
    )
    .get(raw, compact);

  if (!tag) {
    return {
      found: false,
      code: "TAG_NOT_FOUND",
      verdict: "Tag serial not found in inventory.",
      serial: raw,
    };
  }

  const blockers = [];
  let code = "TAG_OK";
  let verdict = "Tag looks ready for issuance.";

  if (tag.activated) {
    code = "TAG_ACTIVATED";
    verdict = "Tag already activated — cannot remap or re-issue.";
    blockers.push("activated=1");
  } else if (tag.status === "Dispatched") {
    code = "TAG_PENDING_ACK";
    verdict = "Tag dispatched but not acknowledged — Bajaj OTP blocked.";
    blockers.push("status=Dispatched (needs Acknowledged)");
  } else if (!tag.agent_id && tag.status === "Available") {
    code = "TAG_UNMAPPED";
    verdict = "Tag is Available and unmapped — needs master→agent mapping.";
    blockers.push("agent_id is null");
  } else if (tag.status !== "Acknowledged") {
    code = "TAG_NOT_READY";
    verdict = `Tag status ${tag.status} is not ready for issuance.`;
    blockers.push(`status=${tag.status}`);
  }

  return {
    found: true,
    code,
    verdict,
    blockers,
    tag,
    canIssue: code === "TAG_OK",
  };
}

function explainOrder(orderId) {
  const db = getDb();
  const id = String(orderId || "").trim().toUpperCase();
  if (!id) return { found: false, reason: "empty orderId" };

  const order = db
    .prepare(
      `SELECT o.*,
              f.name AS from_name, t.name AS to_name
       FROM orders o
       JOIN agents f ON f.id = o.from_agent_id
       JOIN agents t ON t.id = o.to_agent_id
       WHERE o.order_id = ?`
    )
    .get(id);

  if (!order) {
    return {
      found: false,
      code: "ORDER_NOT_FOUND",
      verdict: "Order not found.",
      orderId: id,
    };
  }

  const mapped = db
    .prepare(`SELECT COUNT(*) AS c FROM tags WHERE order_id = ?`)
    .get(id).c;

  const blockers = [];
  let code = "ORDER_VISIBLE";
  let verdict = "Order exists; check role/filter for list visibility.";

  if (order.status === "Dispatched" && order.tags_pending > 0) {
    code = "ORDER_PARTIAL_DISPATCH_STUCK";
    verdict =
      "Partial dispatch: status=Dispatched while tags_pending>0 — disappears from Pending and blocks further dispatch.";
    blockers.push(
      `ordered=${order.tags_ordered} dispatched_counter=${order.tags_dispatched} pending=${order.tags_pending} inventory_mapped=${mapped}`
    );
  } else if (mapped < order.tags_ordered) {
    code = "MAPPING_SHORTFALL";
    verdict = "Fewer tags mapped in inventory than ordered.";
    blockers.push(`inventory_mapped=${mapped} < tags_ordered=${order.tags_ordered}`);
  }

  return {
    found: true,
    code,
    verdict,
    blockers,
    order,
    inventoryMapped: mapped,
  };
}

function searchLogs({ query, limit = 10 } = {}) {
  const db = getDb();
  const q = String(query || "").trim();
  if (!q) return { query: q, results: [] };

  const rows = db
    .prepare(
      `SELECT level, job, message, correlation_id, created_at
       FROM app_logs
       WHERE message LIKE ? OR correlation_id LIKE ? OR IFNULL(correlation_id,'') = ?
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(`%${q}%`, `%${q}%`, q, Math.min(Number(limit) || 10, 50));

  return { query: q, results: rows };
}

const opsToolDefinitions = [
  {
    name: "explain_tag",
    description:
      "Diagnose why a FASTag serial cannot be assigned / issued (status, activated, owner).",
    inputSchema: {
      type: "object",
      properties: { serial: { type: "string" } },
      required: ["serial"],
    },
  },
  {
    name: "explain_order",
    description:
      "Diagnose why an order is missing or has fewer tags mapped (partial dispatch, shortfall).",
    inputSchema: {
      type: "object",
      properties: { orderId: { type: "string" } },
      required: ["orderId"],
    },
  },
  {
    name: "search_logs",
    description:
      "Search fake app/Loki-style logs by Message, UTR, ORDER id, or serial. Runtime errors only — not money facts.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
];

function callOpsTool(name, args = {}) {
  switch (name) {
    case "explain_tag":
      return explainTag(args.serial);
    case "explain_order":
      return explainOrder(args.orderId);
    case "search_logs":
      return searchLogs(args);
    default:
      return { error: `Unknown ops tool: ${name}` };
  }
}

module.exports = {
  explainTag,
  explainOrder,
  searchLogs,
  opsToolDefinitions,
  callOpsTool,
};
