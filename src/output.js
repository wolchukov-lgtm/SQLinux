import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function reportToCsv(report) {
  const rows = [["section", "key", "count", "details"]];
  for (const [key, value] of Object.entries(report.stats)) rows.push(["stats", key, value, ""]);
  for (const [key, value] of Object.entries(report.byLevel)) rows.push(["level", key, value, ""]);
  for (const [key, value] of Object.entries(report.bySource)) rows.push(["source", key, value, ""]);
  for (const item of report.topErrors) rows.push(["topError", item.eventCode, item.count, ""]);
  for (const item of report.invalidSamples) {
    rows.push(["invalidLine", item.lineNumber, "", `${item.reason}: ${item.raw}`]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

export function renderTerminal(report) {
  const { stats } = report;
  const lines = [
    "=== АНАЛИЗ ЖУРНАЛА СОБЫТИЙ ===",
    `Всего строк:       ${stats.totalLines}`,
    `Корректных строк:  ${stats.validLines}`,
    `Ошибочных строк:   ${stats.invalidLines}`,
    `После фильтрации:  ${stats.matchedEvents}`,
    "",
    "По уровням:"
  ];
  const levels = Object.entries(report.byLevel);
  lines.push(...(levels.length ? levels.map(([key, value]) => `  ${key.padEnd(7)} ${value}`) : ["  (нет событий)"]));
  lines.push("", "По источникам:");
  const sources = Object.entries(report.bySource);
  lines.push(...(sources.length ? sources.map(([key, value]) => `  ${key.padEnd(20)} ${value}`) : ["  (нет событий)"]));
  lines.push("", "Top кодов ERROR:");
  lines.push(...(report.topErrors.length
    ? report.topErrors.map((item, i) => `  ${String(i + 1).padStart(2)}. ${item.eventCode.padEnd(20)} ${item.count}`)
    : ["  (нет ошибок ERROR)"]));
  if (report.invalidSamples.length) {
    lines.push("", "Ошибочные строки (первые до 100):");
    for (const item of report.invalidSamples) {
      lines.push(`  Строка ${item.lineNumber}: ${item.reason}`);
    }
  }
  return lines.join("\n");
}

export async function saveReport(report, format, outputPath) {
  if (!["json", "csv"].includes(format)) throw new Error("--format должен быть json или csv");
  if (!outputPath) throw new Error("Для сохранения отчёта укажите --output");
  const target = resolve(outputPath);
  await mkdir(dirname(target), { recursive: true });
  const content = format === "json" ? JSON.stringify(report, null, 2) + "\n" : reportToCsv(report);
  await writeFile(target, content, "utf8");
  return target;
}
