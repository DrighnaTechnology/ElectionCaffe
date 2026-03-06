import React from 'react';
import { WidgetRenderer } from './WidgetRenderer';
import { cn } from '../../lib/utils';

interface DashboardRendererProps {
  dashboardConfig: {
    title: string;
    description?: string;
    widgets: Array<{
      id: string;
      type: string;
      title: string;
      size: string;
      chartConfig: Record<string, any>;
    }>;
  };
  widgetData: Record<string, any>;
}

export function DashboardRenderer({ dashboardConfig, widgetData }: DashboardRendererProps) {
  if (!dashboardConfig || !dashboardConfig.widgets) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl opacity-40">?</span>
        </div>
        <p className="text-sm">No dashboard to display</p>
      </div>
    );
  }

  // Split widgets: stat-cards go in a top row, charts in the main grid
  const statCards = dashboardConfig.widgets.filter(w => w.type === 'stat-card');
  const chartWidgets = dashboardConfig.widgets.filter(w => w.type !== 'stat-card');

  // Determine chart grid sizing: use 2-column base grid
  // full = span 2, half = span 1, third = span 1
  const chartSizeClasses: Record<string, string> = {
    full: 'col-span-1 md:col-span-2',
    half: 'col-span-1',
    third: 'col-span-1',
  };

  return (
    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Stat Cards Row */}
      {statCards.length > 0 && (
        <div className={cn(
          'grid gap-4',
          statCards.length === 1 && 'grid-cols-1 sm:grid-cols-2',
          statCards.length === 2 && 'grid-cols-1 sm:grid-cols-2',
          statCards.length === 3 && 'grid-cols-1 sm:grid-cols-3',
          statCards.length >= 4 && 'grid-cols-2 sm:grid-cols-4',
        )}>
          {statCards.map((widget, i) => (
            <WidgetRenderer
              key={widget.id}
              widget={widget}
              data={widgetData[widget.id]}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Chart Widgets Grid — 2 columns */}
      {chartWidgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chartWidgets.map((widget, i) => (
            <div
              key={widget.id}
              className={cn(chartSizeClasses[widget.size] || chartSizeClasses.half)}
            >
              <WidgetRenderer
                widget={widget}
                data={widgetData[widget.id]}
                index={statCards.length + i}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
