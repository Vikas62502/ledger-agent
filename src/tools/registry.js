const { toolDefinitions, callTool } = require("./ledgerTools");
const { docsToolDefinition, search_docs } = require("./docsTool");
const { opsToolDefinitions, callOpsTool } = require("./opsTools");

const ALL_TOOL_DEFINITIONS = [
  ...toolDefinitions,
  ...opsToolDefinitions,
  docsToolDefinition,
];

function invokeTool(name, args = {}) {
  if (name === "search_docs") return search_docs(args);
  if (["explain_tag", "explain_order", "search_logs"].includes(name)) {
    return callOpsTool(name, args);
  }
  return callTool(name, args);
}

module.exports = {
  ALL_TOOL_DEFINITIONS,
  invokeTool,
};
