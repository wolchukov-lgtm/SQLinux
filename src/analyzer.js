import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { createInterface } from "node:readline";
import { parseLine } from "/parser.js";
import { buildFilters, matchesFilters } from "/filter.js";
import { createAggregator } from "/aggregator.js";

export async function analyzeFile(filePath, options = {}) {
  if (!filePath) throw new Error("Не указан путь к файлу (--input)");
  try {
    await access(filePath);
  } catch {
    throw new Error(`Файл не найден или недоступен: ${filePath}`);
  }

  const filters = buildFilters(options);
  const topN = options.top === undefined ? 10 : Number(options.top);
  if (!Number.isInteger(topN) || topN < 0) throw new Error("--top должен быть целым числом >= 0");

  const aggregator = createAggregator(topN, 100);
  let lineNumber = 0;
  const input = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity
  });

  try {
    for await (const line of input) {
      lineNumber += 1;
      aggregator.addLine();
      const parsed = parseLine(line);
      if (!parsed.ok) {
        aggregator.addInvalid(lineNumber, parsed.error, line);
        continue;
      }
      aggregator.addValid(parsed.record, matchesFilters(parsed.record, filters));
    }
  } catch (error) {
    input.close();
    throw new Error(`Ошибка чтения файла: ${error.message}`);
  }

  return aggregator.result();
}
