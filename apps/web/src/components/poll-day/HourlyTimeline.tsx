import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface HourlyTimelineProps {
  data: Array<{
    hour: string;
    votes: number;
    cumulative: number;
    percentage: number;
  }>;
  totalVoters: number;
}

export function HourlyTimeline({ data, totalVoters }: HourlyTimelineProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xs text-muted-foreground">No turnout data available yet. Votes will appear as they are recorded.</p>
      </div>
    );
  }

  // Ensure we show all polling hours (7am to 6pm)
  const fullHours = [];
  for (let h = 7; h <= 18; h++) {
    const key = `${h.toString().padStart(2, '0')}:00`;
    const existing = data.find((d) => d.hour === key);
    fullHours.push({
      hour: key,
      votes: existing?.votes || 0,
      cumulative: existing?.cumulative || (fullHours.length > 0 ? fullHours[fullHours.length - 1].cumulative : 0),
      percentage: existing?.percentage || (fullHours.length > 0 ? fullHours[fullHours.length - 1].percentage : 0),
    });
  }

  return (
    <div className="h-full flex gap-4">
      {/* Cumulative chart */}
      <div className="flex-1">
        <div className="text-xs font-semibold mb-1">Cumulative Turnout</div>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={fullHours} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="turnoutGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--brand))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--brand))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
            <YAxis
              tick={{ fontSize: 10 }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(value: number, name: string) => {
                if (name === 'percentage') return [`${value.toFixed(1)}%`, 'Turnout'];
                return [value, name];
              }}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="percentage"
              stroke="hsl(var(--brand))"
              fill="url(#turnoutGradient)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly bar chart */}
      <div className="w-[300px] flex-shrink-0">
        <div className="text-xs font-semibold mb-1">Votes Per Hour</div>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={fullHours} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(value: number) => [value.toLocaleString(), 'Votes']}
              labelFormatter={(label) => `Hour: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="votes"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f97316' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats sidebar */}
      <div className="w-[120px] flex-shrink-0 space-y-2">
        <div className="text-xs font-semibold mb-2">Stats</div>
        <div className="p-2 rounded bg-muted text-center">
          <div className="text-lg font-bold text-brand">{data[data.length - 1]?.percentage?.toFixed(1) || 0}%</div>
          <div className="text-[10px] text-muted-foreground">Current</div>
        </div>
        <div className="p-2 rounded bg-muted text-center">
          <div className="text-lg font-bold">{data[data.length - 1]?.cumulative?.toLocaleString() || 0}</div>
          <div className="text-[10px] text-muted-foreground">Total Voted</div>
        </div>
        <div className="p-2 rounded bg-muted text-center">
          <div className="text-lg font-bold">{totalVoters.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">Total Voters</div>
        </div>
        {data.length > 0 && (
          <div className="p-2 rounded bg-muted text-center">
            <div className="text-lg font-bold text-orange-500">
              {Math.max(...data.map((d) => d.votes)).toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground">Peak Hour</div>
          </div>
        )}
      </div>
    </div>
  );
}
