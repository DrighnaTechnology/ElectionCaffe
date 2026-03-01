import { useEffect, useRef } from 'react';
import { AlertTriangleIcon, CheckCircleIcon, ZapIcon, UserIcon, ActivityIcon } from 'lucide-react';

interface EventItem {
  type: string;
  message: string;
  time: Date;
  severity?: string;
}

interface EventTickerProps {
  events: EventItem[];
}

const typeIcons: Record<string, React.ReactNode> = {
  vote: <CheckCircleIcon className="h-3 w-3 text-green-500 flex-shrink-0" />,
  incident: <AlertTriangleIcon className="h-3 w-3 text-red-500 flex-shrink-0" />,
  agent: <UserIcon className="h-3 w-3 text-blue-500 flex-shrink-0" />,
  mood: <ActivityIcon className="h-3 w-3 text-purple-500 flex-shrink-0" />,
  order: <ZapIcon className="h-3 w-3 text-orange-500 flex-shrink-0" />,
  gotv: <ZapIcon className="h-3 w-3 text-brand flex-shrink-0" />,
  alert: <AlertTriangleIcon className="h-3 w-3 text-red-600 flex-shrink-0" />,
  anomaly: <AlertTriangleIcon className="h-3 w-3 text-red-600 flex-shrink-0" />,
  system: <ActivityIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />,
};

export function EventTicker({ events }: EventTickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest (leftmost)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="flex-shrink-0 border-t bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
        Waiting for events...
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 border-t bg-muted/50">
      <div ref={scrollRef} className="flex items-center gap-4 px-4 py-1.5 overflow-x-auto scrollbar-hide">
        {events.slice(0, 30).map((event, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 text-[11px] whitespace-nowrap flex-shrink-0 ${
              event.severity === 'critical' ? 'text-red-600 font-medium' :
              event.severity === 'warning' ? 'text-orange-600' :
              'text-muted-foreground'
            }`}
          >
            {typeIcons[event.type] || typeIcons.system}
            <span>{event.message}</span>
            <span className="text-[9px] opacity-60">
              {event.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
