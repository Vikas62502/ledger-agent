const { ALL_TOOL_DEFINITIONS, invokeTool } = require("../tools/registry");
const { planTools } = require("./classify");

const ALL_TOOLS = ALL_TOOL_DEFINITIONS;

function formatAnswer(plan, toolResults) {
  const lines = [];
  lines.push(`Intent: ${plan.intent}`);

  const ledgerHits = toolResults.filter(
    (r) =>
      ["find_by_reference_id", "find_by_utr", "find_tag_serial", "find_by_vrn", "list_wallet_txns"].includes(
        r.name
      ) &&
      r.result &&
      (r.result.found === true || r.result.txn || r.result.tag)
  );
  const opsHits = toolResults.filter((r) =>
    ["explain_tag", "explain_order"].includes(r.name)
  );
  const logHits = toolResults.find((r) => r.name === "search_logs");
  const misses = toolResults.filter(
    (r) =>
      r.result &&
      r.result.found === false &&
      !["search_docs", "search_logs"].includes(r.name)
  );
  const docs = toolResults.find((r) => r.name === "search_docs");

  if (ledgerHits.length) {
    lines.push("");
    lines.push("Ledger facts (from SQL tools — not invented):");
    for (const hit of ledgerHits) {
      const r = hit.result;
      if (r.txn) {
        const t = r.txn;
        lines.push(
          `- ${hit.name}: ${t.type} ₹${t.amount} | ${t.reason} | ref=${t.reference_id || "-"} | utr=${t.bank_reference || "-"} | agent=${t.agent_name || t.agent_id} | ${t.created_at}`
        );
      }
      if (r.tag) {
        const tg = r.tag;
        lines.push(
          `- ${hit.name}: serial=${tg.serial} vrn=${tg.vrn || "-"} status=${tg.status} activated=${tg.activated ?? 0} agent=${tg.agent_name || tg.agent_id || "unmapped"}`
        );
        if (Array.isArray(r.relatedTxns) && r.relatedTxns.length) {
          for (const tx of r.relatedTxns.slice(0, 5)) {
            lines.push(
              `  · ${tx.type} ₹${tx.amount} ${tx.reason} (${tx.created_at})`
            );
          }
        }
      }
      if (r.txns) {
        for (const tx of r.txns.slice(0, 5)) {
          lines.push(
            `- txn: ${tx.type} ₹${tx.amount} ${tx.reason} (${tx.created_at})`
          );
        }
      }
    }
  }

  if (opsHits.length) {
    lines.push("");
    lines.push("Ops diagnose (grounded checkers):");
    for (const hit of opsHits) {
      const r = hit.result;
      lines.push(`- ${hit.name}: [${r.code || "?"}] ${r.verdict || JSON.stringify(r)}`);
      if (Array.isArray(r.blockers)) {
        for (const b of r.blockers) lines.push(`  · ${b}`);
      }
    }
  }

  if (logHits?.result?.results?.length) {
    lines.push("");
    lines.push("Runtime logs (fake Loki store):");
    for (const row of logHits.result.results.slice(0, 5)) {
      lines.push(
        `- [${row.level}] ${row.created_at} ${row.message}`
      );
    }
  }

  if (misses.length && !ledgerHits.length && !opsHits.some((h) => h.result?.found)) {
    lines.push("");
    lines.push("No matching ledger/ops rows for the ids you sent.");
    for (const m of misses) {
      lines.push(`- ${m.name}: ${JSON.stringify(m.args)}`);
    }
  }

  if (docs?.result?.results?.length) {
    lines.push("");
    lines.push("Runbook context (RAG):");
    for (const chunk of docs.result.results) {
      lines.push(`- [${chunk.source}] ${chunk.text.split("\n")[0]}`);
      const body = chunk.text.split("\n").slice(1).join(" ").trim();
      if (body) lines.push(`  ${body.slice(0, 280)}${body.length > 280 ? "…" : ""}`);
    }
  }

  if (!toolResults.length) {
    lines.push("");
    lines.push(
      "No ids detected. Paste Message (10 digits), UTR (12), serial, VRN, ORDER id — or ask about gallery / errors."
    );
  }

  lines.push("");
  lines.push(
    "Rule: money + inventory facts come only from tools; RAG explains process; logs explain runtime errors."
  );

  return lines.join("\n");
}

/**
 * Grounded agent loop:
 * 1) plan tools from text (+ optional OCR fields)
 * 2) execute tools
 * 3) format answer from tool outputs
 */
function runAgent({ text = "", extracted = {} } = {}) {
  const plan = planTools(text, extracted);
  const toolResults = plan.calls.map((c) => ({
    name: c.name,
    args: c.args,
    result: invokeTool(c.name, c.args),
  }));

  return {
    answer: formatAnswer(plan, toolResults),
    plan,
    toolResults,
    toolsAvailable: ALL_TOOLS.map((t) => t.name),
  };
}

module.exports = { runAgent, ALL_TOOLS, invoke: invokeTool };
