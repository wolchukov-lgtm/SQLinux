import test from "node:test";
import assert from "node:assert/strict";
import { parseLine } from "/../src/parser.js";

test("parses valid event", () => {
  const result = parseLine("2025-01-01T00:00:00Z | ERROR | api | E-1 | failed");
  assert.equal(result.ok, true);
  assert.equal(result.record.eventCode, "E-1");
});

test("rejects wrong number of fields and empty line", () => {
  assert.equal(parseLine("").ok, false);
  assert.equal(parseLine("a | b").ok, false);
});

test("rejects invalid date and impossible date", () => {
  assert.equal(parseLine("yesterday | INFO | api | E1 | msg").ok, false);
  assert.equal(parseLine("2025-02-30T00:00:00Z | INFO | api | E1 | msg").ok, false);
});

test("rejects invalid level and empty fields", () => {
  assert.equal(parseLine("2025-01-01T00:00:00Z | FATAL | api | E1 | msg").ok, false);
  assert.equal(parseLine("2025-01-01T00:00:00Z | INFO |  | E1 | msg").ok, false);
});

test("rejects embedded pipe because it breaks field count", () => {
  assert.equal(parseLine("2025-01-01T00:00:00Z | INFO | api | E1 | a | b").ok, false);
});
