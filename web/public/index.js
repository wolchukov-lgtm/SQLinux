let report = null;
let levelChart = null;
let sourceChart = null;
const $ = (id) => document.getElementById(id);

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}
function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function number(value) { return Number(value || 0).toLocaleString("ru-RU"); }

function render(data, name) {
  if (!data || !data.stats || !data.byLevel || !data.bySource) {
    throw new Error("Файл не похож на JSON-отчёт EventScope");
  }
  report = data;
  $("emptyState").hidden = true;
  $("dashboard").hidden = false;
  $("reportName").textContent = name || "JSON-отчёт";
  $("generatedAt").textContent = data.generatedAt ? `Создан: ${new Date(data.generatedAt).toLocaleString("ru-RU")}` : "";
  for (const key of ["totalLines", "validLines", "invalidLines", "matchedEvents"]) {
    $(key).textContent = number(data.stats[key]);
  }
  renderCharts(data);
  renderTopErrors(data.topErrors || []);
  renderQuality(data);
  renderEvents(data.events || []);
}
function renderCharts(data) {
  if (typeof Chart === "undefined") {
    toast("Диаграммы недоступны без подключения к интернету");
    return;
  }
  if (levelChart) levelChart.destroy();
  if (sourceChart) sourceChart.destroy();
  const common = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#aab6c8", boxWidth: 9, usePointStyle: true, font: { size: 10 } } } }
  };
  levelChart = new Chart($("levelChart"), {
    type: "doughnut",
    data: { labels: Object.keys(data.byLevel), datasets: [{ data: Object.values(data.byLevel), backgroundColor: ["#ff7583", "#f0c16c", "#61d9a6", "#9c8cff", "#66a8e8"], borderColor: "#111722", borderWidth: 4, hoverOffset: 5 }] },
    options: { ...common, cutout: "69%" }
  });
  const sources = Object.entries(data.bySource).sort((a,b) => b[1]-a[1]).slice(0, 8);
  sourceChart = new Chart($("sourceChart"), {
    type: "bar",
    data: { labels: sources.map(x => x[0]), datasets: [{ label: "События", data: sources.map(x => x[1]), backgroundColor: "#66e3ce", borderRadius: 4, maxBarThickness: 28 }] },
    options: { ...common, indexAxis: "y", scales: { x: { beginAtZero: true, grid: { color: "#252e3b" }, ticks: { color: "#8590a3", precision: 0 } }, y: { grid: { display: false }, ticks: { color: "#aab6c8" } } } }
  });
}
function renderTopErrors(items) {
  const root = $("topErrors");
  if (!items.length) {
    root.innerHTML = '<div class="invalid-item">В этом отчёте нет событий уровня ERROR.</div>';
    return;
  }
  const max = Math.max(...items.map(x => x.count), 1);
  root.innerHTML = items.map((item, i) => `
    <div class="rank-row"><span class="rank-no">${String(i+1).padStart(2,"0")}</span>
      <div><div class="rank-code">${safeText(item.eventCode)}</div><div class="rank-bar"><div class="rank-fill" style="width:${Math.max(2, item.count/max*100)}%"></div></div></div>
      <span class="rank-count">${number(item.count)}</span></div>`).join("");
}
function renderQuality(data) {
  const s = data.stats;
  const percent = s.totalLines ? (s.invalidLines / s.totalLines * 100) : 0;
  $("quality").innerHTML = `
    <div class="quality-item"><b>${percent.toFixed(1)}%</b><span>Ошибочных строк</span></div>
    <div class="quality-item"><b>${number(s.validLines)}</b><span>Корректно разобрано</span></div>`;
  const errors = data.invalidSamples || [];
  $("invalidList").innerHTML = errors.length ? errors.slice(0, 8).map(x =>
    `<div class="invalid-item"><b>Строка ${number(x.lineNumber)}</b> · ${safeText(x.reason)}<br>${safeText(x.raw)}</div>`
  ).join("") : '<div class="invalid-item">Повреждённых строк нет в сохранённых примерах.</div>';
}
function renderEvents(events) {
  const query = $("searchEvents").value.trim().toLowerCase();
  const filtered = events.filter(event => Object.values(event).some(v => String(v).toLowerCase().includes(query)));
  $("eventRows").innerHTML = filtered.slice(0, 100).map(event => `
    <tr><td>${safeText(event.timestamp)}</td><td><span class="level level-${safeText(event.level)}">${safeText(event.level)}</span></td>
    <td>${safeText(event.source)}</td><td>${safeText(event.eventCode)}</td><td title="${safeText(event.message)}">${safeText(event.message)}</td></tr>`).join("");
  $("tableFoot").textContent = `Показано ${filtered.length} из ${events.length} записей, сохранённых в отчёте.`;
}
async function loadFile(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    render(data, file.name);
    toast("Отчёт успешно загружен");
  } catch (error) { toast(error.message || "Не удалось прочитать JSON"); }
}
$("reportFile").addEventListener("change", e => loadFile(e.target.files[0]));
$("emptyFile").addEventListener("change", e => loadFile(e.target.files[0]));
$("searchEvents").addEventListener("input", () => renderEvents(report?.events || []));
