# ledger-agent

**Grounded full-stack agent** for FASTag / wallet / ops support demos.

Built for **Full Stack + Agentic AI** portfolios: tool-calling, RAG, MCP, evals, and a real HTTP UI — with **fake SQLite data** only (safe to publish).

> The model reads. **Tools decide.** Docs never invent money.

[Architecture notes](./ARCHITECTURE.md) · MIT License

## What you can demo in an interview

| Question | What fires |
|----------|------------|
| “Was PhonePe Message `6821438796` credited?” | SQL `find_by_reference_id` |
| “Check UTR `826840318056`” | SQL `find_by_utr` |
| “Why can’t I issue tag `608268-007-0117503`?” | `explain_tag` → `TAG_PENDING_ACK` |
| “Why is `ORDER0000000001` stuck / less mapped?” | `explain_order` → `ORDER_PARTIAL_DISPATCH_STUCK` |
| “Any errors for that order?” | `search_logs` (fake Loki) |
| “Gallery or RC only?” | RAG `search_docs` |

## Stack

- **Node 22+** Express API + static UI  
- **`node:sqlite`** ledger / orders / logs (no Visual Studio native build)  
- **Deterministic planner** → tool registry → human answer + tool trace  
- **RAG** over `docs/*.md` (keyword retriever; swap for embeddings later)  
- **MCP** (`@modelcontextprotocol/sdk`) — same tools over stdio for Cursor  
- **Optional Gemini** screenshot OCR (`GEMINI_API_KEY`)

## Quick start

```bash
git clone https://github.com/Vikas62502/ledger-agent.git
cd ledger-agent
cp .env.example .env   # optional GEMINI_API_KEY
npm install
npm run seed
npm run eval           # expect 9/9
npm run dev
```

Open [http://localhost:4050](http://localhost:4050).

### MCP in Cursor

Repo includes [`.cursor/mcp.json`](./.cursor/mcp.json). Or:

```bash
npm run mcp
```

```json
{
  "mcpServers": {
    "ledger-agent": {
      "command": "node",
      "args": ["--experimental-sqlite", "src/mcp/server.js"],
      "cwd": "/absolute/path/to/ledger-agent"
    }
  }
}
```

## API

| Method | Path | Body |
|--------|------|------|
| `POST` | `/api/ask` | `{ "text": "..." }` |
| `POST` | `/api/ask-screenshot` | multipart `text` + `image` |
| `GET` | `/api/tools` | — |
| `GET` | `/api/health` | — |

Response includes `answer`, `plan`, `toolResults` (show this in interviews).

## Project layout

```
docs/                 RAG runbooks
evals/                Deterministic regression cases
public/               Minimal UI
src/agent/            Classify + optional Gemini OCR + agent loop
src/db/               Schema + seed (fake data)
src/mcp/              MCP stdio server
src/rag/              Local docs index
src/tools/            Ledger + ops + docs + registry
```

## Design principles (say this in interviews)

1. **Grounding** — amounts, ownership, order counters come from SQL tools  
2. **Separation** — RAG = process; logs = runtime; never conflate with money  
3. **One registry** — HTTP agent and MCP call the same `invokeTool`  
4. **Evals first** — CI-friendly cases without a live LLM  
5. **Safe publish** — demo DB only; no prod secrets  

## Author

**Vikas Yadav** — Full Stack / Agentic AI

## License

MIT
