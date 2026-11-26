const { searchDocs } = require("../rag/docsIndex");

const docsToolDefinition = {
  name: "search_docs",
  description:
    "Search internal runbooks (UTR vs Message, gallery access, serial format, offers). Not for money facts.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      limit: { type: "number" },
    },
    required: ["query"],
  },
};

function search_docs(args = {}) {
  return searchDocs(args.query, args.limit || 3);
}

module.exports = { docsToolDefinition, search_docs };
