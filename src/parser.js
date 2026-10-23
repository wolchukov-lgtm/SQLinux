export const LEVELS = new Set(["TRACE", "DEBUG", "INFO", "WARN", "ERROR"]);

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;

export function parseLine(line) {
  if (typeof line !== "string" || line.trim() === "") {
    return { ok: false, error: "Пустая строка" };
  }

  const fields = line.split("|").map((field) => field.trim());
  if (fields.length !== 5) {
    return { ok: false, error: `Ожидалось 5 полей, получено ${fields.length}` };
  }

  const [timestamp, level, source, eventCode, message] = fields;
  if (fields.some((field) => field.length === 0)) {
    return { ok: false, error: "Поля не должны быть пустыми" };
  }
  if (!ISO_UTC.test(timestamp) || Number.isNaN(Date.parse(timestamp))) {
    return { ok: false, error: "Некорректный timestamp: требуется ISO 8601 UTC" };
  }

  // Date.parse accepts some impossible dates by normalizing them; round-trip date parts.
  const datePart = timestamp.slice(0, 10);
  const timePart = timestamp.slice(11, 19);
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  const date = new Date(`${datePart}T${timePart}Z`);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day ||
    hour > 23 || minute > 59 || second > 59
  ) {
    return { ok: false, error: "Несуществующая дата или время" };
  }

  if (!LEVELS.has(level)) {
    return { ok: false, error: `Недопустимый уровень: ${level}` };
  }

  return {
    ok: true,
    record: {
      timestamp,
      epoch: Date.parse(timestamp),
      level,
      source,
      eventCode,
      message
    }
  };
}
