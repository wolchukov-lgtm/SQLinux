import test from "node:test";
import assert from "node:assert/strict";
import { buildFilters, matchesFilters } from "/../src/filter.js";

const record = {
  epoch: Date.parse("2025-01-01T12:00:00Z"),
  level: "ERROR",
  source: "api"
};

test("start is inclusive and end is exclusive", () => {
  const filters = buildFilters({ from: "2025-01-01T12:00:00Z", to: "2025-01-02T00:00:00Z" });
  assert.equal(matchesFilters(record, filters), true);
  assert.equal(matchesFilters(record, buildFilters({ to: "2025-01-01T12:00:00Z" })), false);
});

test("combines level, source and time filters", () => {
  assert.equal(matchesFilters(record, buildFilters({
    level: "ERROR", source: "api", from: "2025-01-01T00:00:00Z"
  })), true);
  assert.equal(matchesFilters(record, buildFilters({ level: "INFO", source: "api" })), false);
});

test("rejects invalid ranges and levels", () => {
  assert.throws(() => buildFilters({ from: "bad" }));
  assert.throws(() => buildFilters({ from: "2025-01-02T00:00:00Z", to: "2025-01-01T00:00:00Z" }));
  assert.throws(() => buildFilters({ level: "FATAL" }));
});
