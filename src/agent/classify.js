/**
 * Deterministic routing helpers.
 * Prefer rules for ids; use Gemini only when screenshot / free text is messy.
 */

const MESSAGE_RE = /\b(\d{10})\b/;
const UTR_RE = /\b(\d{12})\b/;
const SERIAL_HYPHEN_RE = /\b(\d{6}-\d{3}-\d{7})\b/;
const SERIAL_COMPACT_RE = /\b(608268\d{10})\b/;
const VRN_RE = /\b([A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4})\b/i;
const ORDER_RE = /\b(ORDER\d+)\b/i;

function extractIds(text) {
  const raw = String(text || "");
  const upper = raw.toUpperCase();
  const ids = {
    referenceIds: [],
    utrs: [],
    serials: [],
    vrns: [],
    orderIds: [],
  };

  const order = raw.match(ORDER_RE);
  if (order) ids.orderIds.push(order[1].toUpperCase());

  const utr = raw.match(UTR_RE);
  if (utr) ids.utrs.push(utr[1]);

  const msg = raw.match(MESSAGE_RE);
  if (msg && !ids.utrs.includes(msg[1])) ids.referenceIds.push(msg[1]);

  const serialH = raw.match(SERIAL_HYPHEN_RE);
  if (serialH) ids.serials.push(serialH[1]);
  const serialC = raw.match(SERIAL_COMPACT_RE);
  if (serialC) ids.serials.push(serialC[1]);

  const vrn = upper.match(VRN_RE);
  if (vrn) ids.vrns.push(vrn[1].replace(/[\s-]/g, ""));

  return ids;
}

function classifyIntent(text) {
  const t = String(text || "").toLowerCase();
  if (/error|log|loki|failed|exception/.test(t)) return "logs";
  if (/gallery|rc only|upload|photo/.test(t)) return "docs_gallery";
  if (/order|not\s*show|mapped|mapping|partial\s*dispatch|less\s*tag/.test(t)) {
    return "ops_order";
  }
  if (/assign|why.*(tag|serial)|not\s*issu|otp\s*block/.test(t)) return "ops_tag";
  if (/utr|phonepe|top.?up|wallet|credit|message/.test(t)) return "wallet";
  if (/serial|tag|fastag|issuance/.test(t)) return "tag";
  if (/offer|refund|tag.?cost|vrn|vehicle/.test(t)) return "offer_refund";
  if (/how|what is|policy|runbook|docs/.test(t)) return "docs";
  return "general";
}

function planTools(text, extracted = {}) {
  const base = extractIds(text);
  const ids = {
    referenceIds: [
      ...base.referenceIds,
      ...(extracted.referenceId ? [extracted.referenceId] : []),
      ...(extracted.message ? [extracted.message] : []),
    ].filter(Boolean),
    utrs: [...base.utrs, ...(extracted.utr ? [extracted.utr] : [])].filter(Boolean),
    serials: [
      ...base.serials,
      ...(extracted.serial ? [extracted.serial] : []),
    ].filter(Boolean),
    vrns: [
      ...base.vrns,
      ...(extracted.vrn ? [String(extracted.vrn).toUpperCase()] : []),
    ].filter(Boolean),
    orderIds: [
      ...base.orderIds,
      ...(extracted.orderId ? [String(extracted.orderId).toUpperCase()] : []),
    ].filter(Boolean),
  };

  ids.referenceIds = [...new Set(ids.referenceIds)];
  ids.utrs = [...new Set(ids.utrs)];
  ids.serials = [...new Set(ids.serials)];
  ids.vrns = [...new Set(ids.vrns)];
  ids.orderIds = [...new Set(ids.orderIds)];

  const intent = classifyIntent(text);
  const calls = [];

  for (const utr of ids.utrs) {
    calls.push({ name: "find_by_utr", args: { utr } });
  }
  for (const referenceId of ids.referenceIds) {
    if (ids.utrs.includes(referenceId)) continue;
    calls.push({ name: "find_by_reference_id", args: { referenceId } });
  }
  for (const serial of ids.serials) {
    if (intent === "ops_tag" || /assign|otp|issu|why/.test(String(text || "").toLowerCase())) {
      calls.push({ name: "explain_tag", args: { serial } });
    } else {
      calls.push({ name: "find_tag_serial", args: { serial } });
    }
  }
  for (const vrn of ids.vrns) {
    calls.push({ name: "find_by_vrn", args: { vrn } });
  }
  for (const orderId of ids.orderIds) {
    calls.push({ name: "explain_order", args: { orderId } });
  }

  if (intent === "logs" || /error|failed/.test(String(text || "").toLowerCase())) {
    const logQuery =
      ids.orderIds[0] ||
      ids.serials[0] ||
      ids.referenceIds[0] ||
      ids.utrs[0] ||
      text;
    calls.push({ name: "search_logs", args: { query: logQuery } });
  }

  if (
    intent === "docs" ||
    intent === "docs_gallery" ||
    (!calls.length &&
      /utr|message|gallery|offer|serial|refund|order|map/.test(
        String(text || "").toLowerCase()
      ))
  ) {
    calls.push({ name: "search_docs", args: { query: text } });
  }

  return { intent, ids, calls };
}

module.exports = { extractIds, classifyIntent, planTools };
