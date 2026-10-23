#!/usr/bin/env node
import { analyzeFile } from "/analyzer.js";
import { renderTerminal, saveReport } from "./output.js";

const HELP = `
Анализатор журналов событий

Использование:
  node src/cli.js --input logs_events_sample.log [параметры]

Параметры:
  --input <path>       Путь к журналу (обязательно)
  --from <ISO-UTC>     Начало интервала, включительно
  --to <ISO-UTC>       Конец интервала, исключительно
  --level <LEVEL>      TRACE|DEBUG|INFO|WARN|ERROR
  --source <name>      Точное совпадение источника
  --top <N>            Количество кодов ERROR в рейтинге (по умолчанию 10)
  --format <json|csv>  Формат отчёта для сохранения
  --output <path>      Путь выходного файла
  --help               Показать справку

Пример:
  node src/cli.js --input logs_events_sample.log --level ERROR --source api --top 5 --format json --output reports/errors.json
`;

function parseArgs(argv) {
  const options = {};
  const allowed = new Set(["input", "from", "to", "level", "source", "top", "format", "output"]);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (!arg.startsWith("--")) throw new Error(`Неизвестный аргумент: ${arg}`);
    const key = arg.slice(2);
    if (!allowed.has(key)) throw new Error(`Неизвестный параметр: ${arg}`);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Для ${arg} требуется значение`);
    options[key] = value;
    i += 1;
  }
  if (options.level) options.level = options.level.toUpperCase();
  return options;
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(HELP.trim());
  } else {
    if (!options.input) throw new Error("Укажите путь к файлу через --input");
    const report = await analyzeFile(options.input, options);
    console.log(renderTerminal(report));
    if (options.format || options.output) {
      const format = options.format || "json";
      const target = await saveReport(report, format, options.output);
      console.log(`\nОтчёт сохранён: ${target}`);
    }
  }
} catch (error) {
  console.error(`Ошибка: ${error.message}`);
  console.error("Используйте --help для просмотра справки.");
  process.exitCode = 1;
}
