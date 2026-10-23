import { LEVELS } from "/parser.js";

export function buildFilters(options = {}) {
  const filters = {
    from: options.from ? Date.parse(options.from) : null,
    to: options.to ? Date.parse(options.to) : null,
    level: options.level || null,
    source: options.source || null
  };

  if (options.from && Number.isNaN(filters.from)) {
    throw new Error("--from: некорректная дата");
  }
  if (options.to && Number.isNaN(filters.to)) {
    throw new Error("--to: некорректная дата");
  }
  if (filters.from !== null && filters.to !== null && filters.from >= filters.to) {
    throw new Error("--from должен быть раньше --to");
  }
  if (filters.level && !LEVELS.has(filters.level)) {
    throw new Error(`--level должен быть одним из: ${[...LEVELS].join(", ")}`);
  }
  return filters;
}

export function matchesFilters(record, filters) {
  if (filters.from !== null && filters.from !== undefined && record.epoch < filters.from) return false;
  if (filters.to !== null && filters.to !== undefined && record.epoch >= filters.to) return false;
  if (filters.level && record.level !== filters.level) return false;
  if (filters.source && record.source !== filters.source) return false;
  return true;
}
