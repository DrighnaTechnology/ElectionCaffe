import React from 'react';
import {
  BarChart, Bar,
  PieChart, Pie, Cell,
  LineChart, Line,
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  HashIcon, BarChart3Icon, PieChartIcon, TrendingUpIcon,
  ActivityIcon, TargetIcon, TableIcon, AlertCircleIcon,
} from 'lucide-react';
import { cn, formatNumber } from '../../lib/utils';

const COLORS = [
  '#3b82f6', '#10b981', '#f97316', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f59e0b', '#ef4444',
  '#84cc16', '#14b8a6', '#a855f7', '#e11d48',
];

const STAT_ACCENTS = [
  { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900', gradient: 'from-blue-500 to-blue-600' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900', gradient: 'from-emerald-500 to-emerald-600' },
  { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-900', gradient: 'from-orange-500 to-orange-600' },
  { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-900', gradient: 'from-purple-500 to-purple-600' },
  { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-900', gradient: 'from-cyan-500 to-cyan-600' },
  { bg: 'bg-pink-50 dark:bg-pink-950/40', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-900', gradient: 'from-pink-500 to-pink-600' },
];

const WIDGET_ICON_MAP: Record<string, any> = {
  'stat-card': HashIcon,
  'bar': BarChart3Icon,
  'pie': PieChartIcon,
  'line': TrendingUpIcon,
  'area': ActivityIcon,
  'radar': TargetIcon,
  'table': TableIcon,
};

interface WidgetProps {
  widget: {
    id: string;
    type: string;
    title: string;
    size: string;
    chartConfig: Record<string, any>;
  };
  data: any;
  index: number;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

function formatChartData(rawData: any[]): any[] {
  if (!Array.isArray(rawData)) return [];
  return rawData.map((item) => {
    const formatted: Record<string, any> = { ...item };
    if (item._count && typeof item._count === 'object') {
      for (const [k, v] of Object.entries(item._count)) {
        formatted[`_count_${k}`] = v;
      }
    }
    if (item._sum && typeof item._sum === 'object') {
      for (const [k, v] of Object.entries(item._sum)) {
        formatted[`_sum_${k}`] = v;
      }
    }
    if (item._avg && typeof item._avg === 'object') {
      for (const [k, v] of Object.entries(item._avg)) {
        formatted[`_avg_${k}`] = v;
      }
    }
    return formatted;
  });
}

function resolveDataKey(key: string): string {
  return key.replace('.', '_');
}

/** Truncate long XAxis labels */
function truncateLabel(label: any, maxLen = 14): string {
  const str = String(label ?? '');
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/95 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-xl text-xs">
      {label && <p className="font-medium text-muted-foreground mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">{formatNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ widget, data, index }: WidgetProps) {
  const { chartConfig } = widget;
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

  const formatted = chartConfig.format === 'percent'
    ? `${Number(value || 0).toFixed(1)}%`
    : formatNumber(Number(value || 0));

  const accent = STAT_ACCENTS[index % STAT_ACCENTS.length];

  return (
    <div className={cn(
      'relative rounded-xl border p-4 transition-all duration-300 hover:shadow-md',
      accent.bg, accent.border
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-1 truncate">
            {widget.title}
          </p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {formatted}
          </p>
          {chartConfig.subtitle && (
            <p className="text-[10px] text-muted-foreground mt-1">{chartConfig.subtitle}</p>
          )}
        </div>
        <div className={cn('p-2 rounded-lg bg-gradient-to-br shrink-0', accent.gradient)}>
          <HashIcon className="h-4 w-4 text-white" />
        </div>
      </div>
    </div>
  );
}

// ── Bar Chart ────────────────────────────────────────────────────────────────

function BarChartWidget({ widget, data }: WidgetProps) {
  const { chartConfig } = widget;
  const chartData = formatChartData(data);
  const xKey = chartConfig.xKey || 'name';
  const bars = chartConfig.bars || [{ dataKey: '_count_id', label: 'Count', color: COLORS[0] }];

  // Determine if we need angled labels (many items or long labels)
  const needsAngle = chartData.length > 6 ||
    chartData.some((d) => String(d[xKey] ?? '').length > 10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: needsAngle ? 40 : 4 }}>
        <defs>
          {bars.map((bar: any, i: number) => {
            const color = bar.color || COLORS[i % COLORS.length];
            return (
              <linearGradient key={i} id={`barGrad-${widget.id}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.6} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={needsAngle ? -35 : 0}
          textAnchor={needsAngle ? 'end' : 'middle'}
          tickFormatter={(v) => truncateLabel(v, needsAngle ? 12 : 16)}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatNumber(v)}
          width={44}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
        {bars.length > 1 && (
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        )}
        {bars.map((bar: any, i: number) => (
          <Bar
            key={i}
            dataKey={resolveDataKey(bar.dataKey)}
            name={bar.label || bar.dataKey}
            fill={`url(#barGrad-${widget.id}-${i})`}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Pie Chart ────────────────────────────────────────────────────────────────

function PieChartWidget({ widget, data }: WidgetProps) {
  const { chartConfig } = widget;
  const chartData = formatChartData(data);
  const nameKey = chartConfig.nameKey || 'name';
  const valueKey = resolveDataKey(chartConfig.valueKey || '_count_id');

  const total = chartData.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0);

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            strokeWidth={0}
          >
            {chartData.map((_: any, i: number) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1 px-2">
        {chartData.map((item: any, i: number) => {
          const val = Number(item[valueKey]) || 0;
          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
          return (
            <div key={i} className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-muted-foreground">{item[nameKey] || 'N/A'}</span>
              <span className="font-semibold text-foreground">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Line Chart ───────────────────────────────────────────────────────────────

function LineChartWidget({ widget, data }: WidgetProps) {
  const { chartConfig } = widget;
  const chartData = formatChartData(data);
  const xKey = chartConfig.xKey || 'name';
  const lines = chartConfig.lines || [{ dataKey: '_count_id', label: 'Count', color: COLORS[0] }];

  const needsAngle = chartData.length > 8;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: needsAngle ? 40 : 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={needsAngle ? -35 : 0}
          textAnchor={needsAngle ? 'end' : 'middle'}
          tickFormatter={(v) => truncateLabel(v)}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatNumber(v)}
          width={44}
        />
        <Tooltip content={<CustomTooltip />} />
        {lines.length > 1 && (
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        )}
        {lines.map((line: any, i: number) => {
          const color = line.color || COLORS[i % COLORS.length];
          return (
            <Line
              key={i}
              type="monotone"
              dataKey={resolveDataKey(line.dataKey)}
              name={line.label || line.dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 5, stroke: color, strokeWidth: 2, fill: '#fff' }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Area Chart ───────────────────────────────────────────────────────────────

function AreaChartWidget({ widget, data }: WidgetProps) {
  const { chartConfig } = widget;
  const chartData = formatChartData(data);
  const xKey = chartConfig.xKey || 'name';
  const areas = chartConfig.areas || [{ dataKey: '_count_id', label: 'Count', color: COLORS[0] }];

  const needsAngle = chartData.length > 8;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: needsAngle ? 40 : 4 }}>
        <defs>
          {areas.map((area: any, i: number) => {
            const color = area.color || COLORS[i % COLORS.length];
            return (
              <linearGradient key={i} id={`areaGrad-${widget.id}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={needsAngle ? -35 : 0}
          textAnchor={needsAngle ? 'end' : 'middle'}
          tickFormatter={(v) => truncateLabel(v)}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatNumber(v)}
          width={44}
        />
        <Tooltip content={<CustomTooltip />} />
        {areas.length > 1 && (
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        )}
        {areas.map((area: any, i: number) => {
          const color = area.color || COLORS[i % COLORS.length];
          return (
            <Area
              key={i}
              type="monotone"
              dataKey={resolveDataKey(area.dataKey)}
              name={area.label || area.dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#areaGrad-${widget.id}-${i})`}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Radar Chart ──────────────────────────────────────────────────────────────

function RadarChartWidget({ widget, data }: WidgetProps) {
  const { chartConfig } = widget;
  const chartData = formatChartData(data);
  const nameKey = chartConfig.nameKey || 'name';
  const valueKey = resolveDataKey(chartConfig.valueKey || '_count_id');

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey={nameKey}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
        />
        <PolarRadiusAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
        <Radar
          dataKey={valueKey}
          stroke={COLORS[0]}
          strokeWidth={2}
          fill={COLORS[0]}
          fillOpacity={0.2}
          dot={{ r: 3, fill: COLORS[0], strokeWidth: 2, stroke: '#fff' }}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Table Widget ─────────────────────────────────────────────────────────────

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toLocaleDateString('en-IN');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function TableWidget({ widget, data }: WidgetProps) {
  const { chartConfig } = widget;
  const rows = Array.isArray(data) ? data : [];
  let columns: { key: string; label: string }[] = chartConfig.columns ? [...chartConfig.columns] : [];

  if (columns.length === 0 && rows.length > 0) {
    for (const key of Object.keys(rows[0])) {
      if (key !== 'id' && !key.endsWith('Id') && key !== 'electionId' && key !== '_count' && key !== '_sum' && key !== '_avg') {
        columns.push({ key, label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()) });
      }
    }
  }

  // Filter out columns where ALL values are null
  if (rows.length > 0) {
    columns = columns.filter((col) =>
      rows.some((row: any) => row[col.key] !== null && row[col.key] !== undefined)
    );
  }

  return (
    <div className="overflow-auto max-h-[340px] rounded-lg border border-border/50">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-muted/80 backdrop-blur-sm">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-2 px-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row: any, i: number) => (
            <tr
              key={i}
              className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className="py-2 px-3 text-foreground whitespace-nowrap">
                  <span className={row[col.key] === null || row[col.key] === undefined ? 'text-muted-foreground/40' : ''}>
                    {formatCellValue(row[col.key])}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <TableIcon className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">No data available</p>
        </div>
      )}
    </div>
  );
}

// ── Main Widget Renderer ─────────────────────────────────────────────────────

export function WidgetRenderer({ widget, data, index }: WidgetProps) {
  const widgetData = data?.success ? data.data : data;
  const hasError = data?.success === false;
  const WidgetIcon = WIDGET_ICON_MAP[widget.type] || BarChart3Icon;

  // Stat cards render differently (no card wrapper — they ARE the card)
  if (widget.type === 'stat-card') {
    if (hasError) {
      return (
        <div className="rounded-xl border p-4 bg-destructive/5 border-destructive/20">
          <p className="text-xs font-medium text-muted-foreground mb-1">{widget.title}</p>
          <p className="text-sm text-destructive">Failed to load</p>
        </div>
      );
    }
    if (widgetData === undefined || widgetData === null) {
      return (
        <div className="rounded-xl border p-4 bg-muted/30 animate-pulse">
          <p className="text-xs font-medium text-muted-foreground mb-1">{widget.title}</p>
          <div className="h-8 w-24 bg-muted rounded" />
        </div>
      );
    }
    return <StatCard widget={widget} data={widgetData} index={index} />;
  }

  // Chart / table widgets get a card wrapper
  return (
    <div className="bg-card border rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-1">
        <div className="p-1.5 rounded-md bg-muted">
          <WidgetIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground truncate">{widget.title}</h3>
      </div>

      {/* Content */}
      <div className="flex-1 px-3 pb-3">
        {hasError ? (
          <div className="flex flex-col items-center justify-center h-[260px] text-destructive/70">
            <AlertCircleIcon className="h-7 w-7 mb-2" />
            <p className="text-xs font-medium">Failed to load data</p>
          </div>
        ) : widgetData === undefined || widgetData === null ? (
          <div className="flex flex-col items-center justify-center h-[260px] gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <>
            {widget.type === 'bar' && <BarChartWidget widget={widget} data={widgetData} index={index} />}
            {widget.type === 'pie' && <PieChartWidget widget={widget} data={widgetData} index={index} />}
            {widget.type === 'line' && <LineChartWidget widget={widget} data={widgetData} index={index} />}
            {widget.type === 'area' && <AreaChartWidget widget={widget} data={widgetData} index={index} />}
            {widget.type === 'radar' && <RadarChartWidget widget={widget} data={widgetData} index={index} />}
            {widget.type === 'table' && <TableWidget widget={widget} data={widgetData} index={index} />}
          </>
        )}
      </div>
    </div>
  );
}
