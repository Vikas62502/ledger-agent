# Architecture (interview cheat-sheet)

## One sentence

**Tools decide facts; the model (optional) only reads/extracts; RAG explains process; MCP reuses the same tools in the IDE.**

```text
  UI / HTTP / MCP
        │
        ▼
  Classifier (regex + intent)
        │
        ├──► SQL tools      → wallet / tags / orders   (truth)
        ├──► Ops checkers   → TAG_* / ORDER_* codes    (truth)
        ├──► search_logs    → fake Loki rows           (errors)
        └──► search_docs    → markdown runbooks        (process)
        │
        ▼
  Formatted answer + tool trace (eval-able)
```

## Why not “just ChatGPT”?

| Risk | Mitigation in this repo |
|------|-------------------------|
| Hallucinated “₹500 credited” | Amounts only from `transactions` |
| Wrong UTR vs Message | Separate tools + runbook |
| Invented “order stuck” | `explain_order` counters from DB |
| Docs used as money source | RAG never answers paid/unpaid |

## Full-stack surface

- **API:** Express `POST /api/ask`, screenshot OCR optional (Gemini)
- **UI:** single-page ask box with tool-trace JSON
- **Data:** SQLite via Node `node:sqlite` (no native build)
- **Evals:** `npm run eval` — deterministic tool + verdict assertions
- **MCP:** stdio server exporting the identical tool registry

## Mapping to production CBPL work

This demo mirrors patterns used in real ops:

- Wallet case explain (UTR / Message / serial)
- Ops diagnose (tag assign, order visibility, mapping gap)
- Loki-style log search (here: seeded `app_logs`)

**No production credentials or live customer data** ship in this repo.
