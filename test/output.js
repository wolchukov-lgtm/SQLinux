import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { reportToCsv, saveReport, renderTerminal } from "/../src/output.js";

const report = {
  stats: { totalLines: 2, validLines: 1, invalidLines: 1, matchedEvents: 1 },
  byLevel: { ERROR: 1 },
  bySource: { api: 1 },
  topErrors: [{ eventCode: "E1", count: 1 }],
  invalidSamples: [{ lineNumber: 2, reason: "bad", raw: 'oops,"x"' }]
};

test("renders terminal and CSV with escaped fields", () => {
  assert.match(renderTerminal(report), /Всего строк/);
  const csv = reportToCsv(report);
  assert.match(csv, /"topError","E1","1"/);
  assert.match(csv, /""x""/);
});

test("saves JSON and CSV reports", async () => {
  const dir = await mkdtemp(join(tmpdir(), "event-output-"));
  try {
    const jsonPath = await saveReport(report, "json", join(dir, "nested", "report.json"));
    assert.deepEqual(JSON.parse(await readFile(jsonPath, "utf8")).stats, report.stats);
    const csvPath = await saveReport(report, "csv", join(dir, "report.csv"));
    assert.match(await readFile(csvPath, "utf8"), /"section","key","count","details"/);
    await assert.rejects(() => saveReport(report, "xml", join(dir, "x.xml")), /--format/);
    await assert.rejects(() => saveReport(report, "json"), /--output/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
