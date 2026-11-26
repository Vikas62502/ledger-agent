const fs = require("fs");
const path = require("path");

// Always reseed so schema/demo data match this release
require("../src/db/seed");

const { runAgent } = require("../src/agent/runAgent");

const cases = JSON.parse(
  fs.readFileSync(path.join(__dirname, "cases.json"), "utf8")
);

let passed = 0;
const failures = [];

for (const c of cases) {
  const result = runAgent({ text: c.text });
  const hit = result.toolResults.find((t) => t.name === c.expectTool);
  let ok = Boolean(hit);

  if (c.expectFound !== undefined) {
    ok = ok && hit.result && hit.result.found === c.expectFound;
  }
  if (c.expectAmount !== undefined) {
    ok =
      ok &&
      hit.result?.txn &&
      Number(hit.result.txn.amount) === Number(c.expectAmount);
  }
  if (c.expectDocs) {
    ok =
      ok &&
      Array.isArray(hit.result?.results) &&
      hit.result.results.length > 0;
  }
  if (c.expectCode) {
    ok = ok && hit.result && hit.result.code === c.expectCode;
  }
  if (c.expectLogs) {
    ok =
      ok &&
      Array.isArray(hit.result?.results) &&
      hit.result.results.length > 0;
  }

  if (ok) {
    passed += 1;
    console.log(`PASS  ${c.id}`);
  } else {
    failures.push({
      id: c.id,
      expected: c.expectTool,
      toolResults: result.toolResults.map((t) => ({
        name: t.name,
        found: t.result?.found,
        code: t.result?.code,
        n: t.result?.results?.length,
      })),
    });
    console.log(`FAIL  ${c.id}`);
  }
}

console.log(`\n${passed}/${cases.length} passed`);
if (failures.length) {
  console.log(JSON.stringify(failures, null, 2));
  process.exit(1);
}
