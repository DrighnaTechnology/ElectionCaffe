/**
 * Exports dashboard as a print-optimized HTML page with Chart.js + chartjs-plugin-datalabels.
 * Opens in a new tab and auto-triggers print (Save as PDF).
 * Charts show data values directly on bars/slices/points — no hover needed.
 * Layout: 2-column grid for charts, smart stat card row, proper page breaks.
 */

const COLORS = [
  '#3b82f6', '#10b981', '#f97316', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f59e0b', '#ef4444',
  '#84cc16', '#14b8a6', '#a855f7', '#e11d48',
];

function resolveDataKey(key: string): string {
  return key.replace('.', '_');
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

function flattenRow(item: any): Record<string, any> {
  const flat: Record<string, any> = { ...item };
  for (const agg of ['_count', '_sum', '_avg', '_min', '_max']) {
    if (item[agg] && typeof item[agg] === 'object') {
      for (const [k, v] of Object.entries(item[agg])) {
        flat[`${agg.replace('.', '_')}_${k}`] = v;
      }
    }
  }
  return flat;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtNum(n: number): string {
  if (n >= 1_00_00_000) return (n / 1_00_00_000).toFixed(1) + 'Cr';
  if (n >= 1_00_000) return (n / 1_00_000).toFixed(1) + 'L';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('en-IN');
}

function resolveStatValue(data: any, chartConfig: any): string {
  let value: any = data;
  if (chartConfig.valueKey && typeof data === 'object' && data !== null) {
    value = getNestedValue(data, chartConfig.valueKey);
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const firstKey = Object.keys(value)[0];
    if (firstKey) value = value[firstKey];
    if (typeof value === 'object' && value !== null) {
      const innerKey = Object.keys(value)[0];
      if (innerKey) value = value[innerKey];
    }
  }
  if (chartConfig.format === 'percent') return `${Number(value || 0).toFixed(1)}%`;
  return fmtNum(Number(value || 0));
}

// ── Determine widget sizing for PDF grid ─────────────────────────────────────

function getWidgetCssClass(widget: any): string {
  if (widget.type === 'table') return 'chart-card span-2';
  if (widget.size === 'full') return 'chart-card span-2';
  return 'chart-card';
}

// ── HTML builders ────────────────────────────────────────────────────────────

function statCardHtml(widget: any, data: any, index: number): string {
  const value = resolveStatValue(data, widget.chartConfig);
  const color = COLORS[index % COLORS.length];
  return `<div class="stat-card" style="border-left: 4px solid ${color}">
      <div class="stat-label">${escapeHtml(widget.title)}</div>
      <div class="stat-value" style="color: ${color}">${value}</div>
    </div>`;
}

function chartCanvasHtml(widget: any, canvasId: string): string {
  const cssClass = getWidgetCssClass(widget);
  return `<div class="${cssClass}">
      <div class="chart-title">${escapeHtml(widget.title)}</div>
      <div class="chart-body"><canvas id="${canvasId}"></canvas></div>
    </div>`;
}

function tableHtml(widget: any, data: any): string {
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    return `<div class="chart-card span-2"><div class="chart-title">${escapeHtml(widget.title)}</div><p class="no-data">No data</p></div>`;
  }

  const flatRows = rows.map(flattenRow);
  let columns: { key: string; label: string }[] = widget.chartConfig?.columns ? [...widget.chartConfig.columns] : [];
  if (columns.length === 0) {
    for (const key of Object.keys(flatRows[0])) {
      if (key !== 'id' && !key.endsWith('Id') && key !== 'electionId' && !key.startsWith('_count') && !key.startsWith('_sum') && !key.startsWith('_avg')) {
        columns.push({ key, label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase()) });
      }
    }
  }
  columns = columns.filter((col) =>
    flatRows.some((row: any) => row[col.key] !== null && row[col.key] !== undefined)
  );

  const headerCells = columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('');
  const bodyRows = flatRows.slice(0, 50).map((row, ri) => {
    const cells = columns.map(c => {
      const val = row[c.key];
      let display = '-';
      if (val !== null && val !== undefined) {
        display = typeof val === 'number' ? fmtNum(val) : typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val);
      }
      return `<td>${escapeHtml(display)}</td>`;
    }).join('');
    return `<tr class="${ri % 2 === 0 ? 'even' : 'odd'}">${cells}</tr>`;
  }).join('\n');

  return `<div class="chart-card span-2">
      <div class="chart-title">${escapeHtml(widget.title)}</div>
      <div class="table-wrap">
        <table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
      </div>
    </div>`;
}

// ── Chart.js config with datalabels ──────────────────────────────────────────

function buildChartJsConfig(widget: any, data: any): any | null {
  const chartData = Array.isArray(data) ? data.map(flattenRow) : [];
  if (chartData.length === 0) return null;

  const cfg = widget.chartConfig;
  const type = widget.type;
  const manyPoints = chartData.length > 15;

  // Common datalabel config for bar/line/area
  const barDataLabels = {
    display: !manyPoints, // hide labels if too many points to avoid overlap
    anchor: 'end' as const,
    align: 'top' as const,
    font: { size: 9, weight: '600' as const },
    color: '#334155',
    formatter: (v: number) => v >= 1000 ? fmtNum(v) : v,
  };

  if (type === 'bar') {
    const xKey = cfg.xKey || 'name';
    const bars = cfg.bars || [{ dataKey: '_count_id', label: 'Count', color: COLORS[0] }];
    return {
      type: 'bar',
      data: {
        labels: chartData.map(d => {
          const label = String(d[xKey] ?? '');
          return label.length > 16 ? label.slice(0, 14) + '…' : label;
        }),
        datasets: bars.map((bar: any, i: number) => ({
          label: bar.label || bar.dataKey,
          data: chartData.map(d => Number(d[resolveDataKey(bar.dataKey)] ?? 0)),
          backgroundColor: (bar.color || COLORS[i % COLORS.length]) + 'CC',
          borderColor: bar.color || COLORS[i % COLORS.length],
          borderWidth: 1,
          borderRadius: 3,
          datalabels: barDataLabels,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { display: bars.length > 1, labels: { font: { size: 10 }, boxWidth: 10, padding: 8 } },
          tooltip: { enabled: false },
        },
        scales: {
          y: { beginAtZero: true, ticks: { font: { size: 9 } } },
          x: { ticks: { font: { size: 9 }, maxRotation: manyPoints ? 45 : 0 } },
        },
      },
    };
  }

  if (type === 'pie') {
    const nameKey = cfg.nameKey || 'name';
    const valueKey = resolveDataKey(cfg.valueKey || '_count_id');
    const total = chartData.reduce((s, d) => s + Number(d[valueKey] ?? 0), 0);
    return {
      type: 'doughnut',
      data: {
        labels: chartData.map(d => String(d[nameKey] ?? '')),
        datasets: [{
          data: chartData.map(d => Number(d[valueKey] ?? 0)),
          backgroundColor: chartData.map((_: any, i: number) => COLORS[i % COLORS.length]),
          borderWidth: 1,
          borderColor: '#fff',
          datalabels: {
            display: true,
            color: '#fff',
            font: { size: 10, weight: 'bold' as const },
            formatter: (v: number) => {
              const pct = total > 0 ? ((v / total) * 100).toFixed(0) : '0';
              return Number(pct) >= 3 ? `${pct}%` : ''; // hide tiny slices
            },
          },
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { position: 'right' as const, labels: { font: { size: 9 }, boxWidth: 10, padding: 6 } },
          tooltip: { enabled: false },
        },
      },
    };
  }

  if (type === 'line' || type === 'area') {
    const xKey = cfg.xKey || 'name';
    const lines = cfg.lines || cfg.areas || [{ dataKey: '_count_id', label: 'Count', color: COLORS[0] }];
    return {
      type: 'line',
      data: {
        labels: chartData.map(d => {
          const label = String(d[xKey] ?? '');
          return label.length > 12 ? label.slice(0, 10) + '…' : label;
        }),
        datasets: lines.map((line: any, i: number) => {
          const color = line.color || COLORS[i % COLORS.length];
          return {
            label: line.label || line.dataKey,
            data: chartData.map(d => Number(d[resolveDataKey(line.dataKey)] ?? 0)),
            borderColor: color,
            backgroundColor: type === 'area' ? color + '25' : 'transparent',
            fill: type === 'area',
            tension: 0.3,
            pointRadius: manyPoints ? 1 : 3,
            pointBackgroundColor: color,
            borderWidth: 2,
            datalabels: {
              display: !manyPoints,
              anchor: 'end' as const,
              align: 'top' as const,
              font: { size: 8 },
              color: '#475569',
              formatter: (v: number) => v >= 1000 ? fmtNum(v) : v,
            },
          };
        }),
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { display: lines.length > 1, labels: { font: { size: 10 }, boxWidth: 10 } },
          tooltip: { enabled: false },
        },
        scales: {
          y: { beginAtZero: true, ticks: { font: { size: 9 } } },
          x: { ticks: { font: { size: 9 }, maxRotation: manyPoints ? 45 : 0 } },
        },
      },
    };
  }

  if (type === 'radar') {
    const nameKey = cfg.nameKey || 'name';
    const valueKey = resolveDataKey(cfg.valueKey || '_count_id');
    return {
      type: 'radar',
      data: {
        labels: chartData.map(d => {
          const label = String(d[nameKey] ?? '');
          return label.length > 14 ? label.slice(0, 12) + '…' : label;
        }),
        datasets: [{
          label: widget.title,
          data: chartData.map(d => Number(d[valueKey] ?? 0)),
          backgroundColor: COLORS[0] + '25',
          borderColor: COLORS[0],
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: COLORS[0],
          datalabels: {
            display: true,
            font: { size: 9 },
            color: '#334155',
            formatter: (v: number) => v >= 1000 ? fmtNum(v) : v,
          },
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { r: { ticks: { font: { size: 8 } }, pointLabels: { font: { size: 9 } } } },
      },
    };
  }

  return null;
}

// ── Load logo as base64 ──────────────────────────────────────────────────────

function loadLogoAsBase64(): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = '/logo-light.png';
  });
}

// ── Main export function ─────────────────────────────────────────────────────

export async function exportDashboardAsPdf(
  dashboardConfig: { title: string; description?: string; widgets: any[] },
  widgetData: Record<string, any>,
) {
  const logoBase64 = await loadLogoAsBase64();

  const statCards = dashboardConfig.widgets.filter(w => w.type === 'stat-card');
  const chartWidgets = dashboardConfig.widgets.filter(w => w.type !== 'stat-card');

  // Build stat cards
  const statCardsHtml = statCards.map((w, i) => {
    const d = widgetData[w.id];
    const raw = d?.success ? d.data : d;
    return statCardHtml(w, raw, i);
  }).join('\n');

  // Build chart HTML + JS configs
  const chartHtmlParts: string[] = [];
  const chartJsConfigs: { canvasId: string; config: any }[] = [];

  chartWidgets.forEach((w, i) => {
    const d = widgetData[w.id];
    const raw = d?.success ? d.data : d;
    const canvasId = `chart_${i}`;

    if (w.type === 'table') {
      chartHtmlParts.push(tableHtml(w, raw));
    } else {
      chartHtmlParts.push(chartCanvasHtml(w, canvasId));
      const config = buildChartJsConfig(w, raw);
      if (config) {
        chartJsConfigs.push({ canvasId, config });
      }
    }
  });

  const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(dashboardConfig.title)} — ElectionCaffe</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"><\/script>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    /* Hide browser default headers/footers (URL, page number, date) */
    @media print {
      @page { margin: 10mm; }
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fff;
      color: #1e293b;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 14px;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-logo { height: 36px; width: auto; }
    .header h1 { font-size: 16px; font-weight: 700; color: #0f172a; }
    .header .meta { font-size: 10px; color: #94a3b8; text-align: right; }
    .header .meta span { display: block; }
    .header p { font-size: 11px; color: #64748b; margin-top: 2px; }

    /* Stat Cards */
    .stat-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }
    .stat-card {
      background: #f8fafc;
      border-radius: 6px;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
    }
    .stat-label {
      font-size: 9px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 4px;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    /* Chart Grid — 2 columns */
    .chart-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .chart-card {
      background: #fff;
      border-radius: 6px;
      padding: 10px;
      border: 1px solid #e2e8f0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .chart-card.span-2 {
      grid-column: 1 / -1;
    }
    .chart-title {
      font-size: 11px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid #f1f5f9;
    }
    .chart-body {
      position: relative;
      height: 220px;
    }

    /* Table */
    .table-wrap { overflow: visible; }
    .no-data { color: #94a3b8; text-align: center; padding: 1.5rem; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    thead th {
      background: #f1f5f9;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      text-align: left;
      padding: 5px 8px;
      border-bottom: 1px solid #cbd5e1;
    }
    tbody td {
      padding: 4px 8px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    tbody tr.odd { background: #fafbfc; }

    /* Footer */
    .footer {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 9px;
      color: #94a3b8;
    }
    .footer-brand { display: flex; align-items: center; gap: 6px; }
    .footer-logo { height: 18px; width: auto; opacity: 0.6; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoBase64 ? `<img src="${logoBase64}" class="header-logo" alt="ElectionCaffe" />` : ''}
      <div>
        <h1>${escapeHtml(dashboardConfig.title)}</h1>
        ${dashboardConfig.description ? `<p>${escapeHtml(dashboardConfig.description)}</p>` : ''}
      </div>
    </div>
    <div class="meta">
      <span>${escapeHtml(timestamp)}</span>
      <span>ElectionCaffe</span>
    </div>
  </div>

  ${statCards.length > 0 ? `<div class="stat-row">${statCardsHtml}</div>` : ''}

  ${chartHtmlParts.length > 0 ? `<div class="chart-grid">${chartHtmlParts.join('\n')}</div>` : ''}

  <div class="footer">
    <div class="footer-brand">
      ${logoBase64 ? `<img src="${logoBase64}" class="footer-logo" alt="" />` : ''}
      <span>Generated by ElectionCaffe AI Dashboard Builder</span>
    </div>
    <span>${escapeHtml(timestamp)}</span>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Register datalabels plugin globally
      Chart.register(ChartDataLabels);

      var configs = ${JSON.stringify(chartJsConfigs)};
      var rendered = 0;
      var total = configs.length;

      if (total === 0) {
        setTimeout(function() { window.print(); }, 300);
        return;
      }

      configs.forEach(function(item) {
        var ctx = document.getElementById(item.canvasId);
        if (ctx) {
          new Chart(ctx.getContext('2d'), item.config);
        }
        rendered++;
        if (rendered === total) {
          setTimeout(function() { window.print(); }, 800);
        }
      });
    });
  <\/script>
</body>
</html>`;

  // Open via Blob URL (avoids "about:blank" watermark in print)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    // Clean up blob URL after the window loads
    printWindow.addEventListener('afterprint', () => {
      URL.revokeObjectURL(blobUrl);
    });
  }
}
