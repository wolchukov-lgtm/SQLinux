export function createAggregator(topN = 10, sampleLimit = 100) {
  if (!Number.isInteger(topN) || topN < 0) throw new Error("--top должен быть целым числом >= 0");

  const levels = new Map();
  const sources = new Map();
  const errorCodes = new Map();
  const sampleEvents = [];
  const sampleErrors = [];
  let totalLines = 0;
  let validLines = 0;
  let invalidLines = 0;
  let matchedEvents = 0;

  return {
    addLine() { totalLines += 1; },
    addInvalid(lineNumber, reason, raw) {
      invalidLines += 1;
      if (sampleErrors.length < sampleLimit) {
        sampleErrors.push({ lineNumber, reason, raw: raw.slice(0, 500) });
      }
    },
    addValid(record, matched) {
      validLines += 1;
      if (!matched) return;
      matchedEvents += 1;
      levels.set(record.level, (levels.get(record.level) || 0) + 1);
      sources.set(record.source, (sources.get(record.source) || 0) + 1);
      if (record.level === "ERROR") {
        errorCodes.set(record.eventCode, (errorCodes.get(record.eventCode) || 0) + 1);
      }
      if (sampleEvents.length < sampleLimit) {
        sampleEvents.push({
          timestamp: record.timestamp,
          level: record.level,
          source: record.source,
          eventCode: record.eventCode,
          message: record.message
        });
      }
    },
    result() {
      const toSortedObject = (map) => Object.fromEntries(
        [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "en"))
      );
      const topErrors = [...errorCodes.entries()]
        .map(([eventCode, count]) => ({ eventCode, count }))
        .sort((a, b) => b.count - a.count || a.eventCode.localeCompare(b.eventCode, "en"))
        .slice(0, topN);

      return {
        generatedAt: new Date().toISOString(),
        stats: { totalLines, validLines, invalidLines, matchedEvents },
        byLevel: toSortedObject(levels),
        bySource: toSortedObject(sources),
        topErrors,
        invalidSamples: sampleErrors,
        events: sampleEvents,
        note: sampleEvents.length === 100
          ? "events содержит первые 100 подходящих записей; агрегаты рассчитаны по всему файлу."
          : "events содержит подходящие записи, ограниченные sampleLimit."
      };
    }
  };
}
