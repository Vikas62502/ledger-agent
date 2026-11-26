#!/usr/bin/env node
/**
 * MCP thin wrapper over the same grounded tools as the HTTP agent.
 * Run: npm run mcp
 * Wire into Cursor / Claude Desktop via .cursor/mcp.json (see repo).
 */
require("dotenv").config();
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { ALL_TOOL_DEFINITIONS, invokeTool } = require("../tools/registry");
const { getDb } = require("../db/connection");
const fs = require("fs");
const { dbPath } = require("../db/connection");

if (!fs.existsSync(dbPath)) {
  require("../db/seed");
} else {
  getDb();
}

const server = new Server(
  { name: "ledger-agent", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: ALL_TOOL_DEFINITIONS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments || {};
  const result = invokeTool(name, args);
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
