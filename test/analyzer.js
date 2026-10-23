import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { analyzeFile } from "/../src/analyzer.js";

async function fixture(content) {
  const dir = await mkdtemp(join(tmpdir(), "event-log-test-"));
  const path = join(dir, "events.log");
  await writeFile(path, content, "utf8");
  return { dir, path };
}

test("counts malformed rows and continues to end of file", async () => {
  const f = await fixture([
    "2025-01-01T00:00:00Z | ERROR | api | E1 | fail",
    "broken row",
    "2025-01-01T00:00:01Z | INFO | web | I1 | ok"
  ].join("\n"));
  try {
    const report = await analyzeFile(f.path);
    assert.deepEqual(report.stats, { totalLines: 3, validLines: 2, invalidLines: 1, matchedEvents: 2 });
    assert.equal(report.invalidSamples[0].lineNumber, 2);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test("handles empty and all-invalid files", async () => {
  const empty = await fixture("");
  const invalid = await fixture("nope\nbad\n");
  try {
    assert.equal((await analyzeFile(empty.path)).stats.totalLines, 0);
    const report = await analyzeFile(invalid.path);
    assert.equal(report.stats.invalidLines, 2);
    assert.equal(report.stats.matchedEvents, 0);
  } finally {
    await rm(empty.dir, { recursive: true, force: true });
    await rm(invalid.dir, { recursive: true, force: true });
  }
});

test("reports missing file clearly", async () => {
  await assert.rejects(() => analyzeFile("/this/path/does/not/exist.log"), /Файл не найден/);
});

test("top N is deterministic and filters combine", async () => {
  const f = await fixture([
    "2025-01-01T00:00:00Z | ERROR | api | E2 | fail",
    "2025-01-01T00:00:01Z | ERROR | api | E1 | fail",
    "2025-01-01T00:00:02Z | ERROR | api | E1 | fail",
    "2025-01-01T00:00:03Z | WARN | web | W1 | warn"
  ].join("\n"));
  try {
    const report = await analyzeFile(f.path, {
      level: "ERROR", source: "api", top: 1,
      from: "2025-01-01T00:00:00Z", to: "2025-01-01T00:00:03Z"
    });
    assert.equal(report.stats.matchedEvents, 3);
    assert.deepEqual(report.topErrors, [{ eventCode: "E1", count: 2 }]);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test("processes a large generated file without loading it as a whole", async () => {
  const dir = await mkdtemp(join(tmpdir(), "event-log-large-"));
  const path = join(dir, "large.log");
  const { open } = await import("node:fs/promises");
  const handle = await open(path, "w");
  try {
    for (let i = 0; i < 12000; i += 1) {
      await handle.write(`2025-01-01T00:00:00Z | INFO | api | I1 | row ${i}\n`);
    }
  } finally {
    await handle.close();
  }
  try {
    const report = await analyzeFile(path);
    assert.equal(report.stats.totalLines, 12000);
    assert.equal(report.stats.matchedEvents, 12000);
    assert.ok(report.events.length <= 100);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
