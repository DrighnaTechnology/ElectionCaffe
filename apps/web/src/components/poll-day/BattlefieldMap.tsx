import { useMemo, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const TILE_LAYERS = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com">CARTO</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com">CARTO</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>',
  },
} as const;

type MapStyle = keyof typeof TILE_LAYERS;

interface BoothMapData {
  id: string;
  boothNumber: string;
  boothName: string;
  latitude: number | null;
  longitude: number | null;
  totalVoters: number;
  votedCount: number;
  turnoutPercent: number;
  classification: string;
  agentName: string | null;
  agentIsCheckedIn: boolean;
  latestMood: string | null;
  hasOpenIncident: boolean;
  pulseRate: number;
}

interface AgentMapData {
  id: string;
  name: string;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastActiveAt: string | null;
  isCheckedIn: boolean;
  boothNumber: string;
}

interface IncidentMapData {
  id: string;
  boothId: string | null;
  severity: string;
  title: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
}

interface BattlefieldMapProps {
  booths: BoothMapData[];
  agents: AgentMapData[];
  incidents: IncidentMapData[];
  onBoothClick?: (boothId: string) => void;
}

function getBoothColor(turnout: number, classification: string, hasIncident: boolean): string {
  if (hasIncident) return '#ef4444'; // red for incidents
  if (classification === 'HOSTILE') return '#991b1b';
  if (classification === 'DIFFICULT') return '#dc2626';
  if (turnout >= 60) return '#22c55e'; // green
  if (turnout >= 40) return '#eab308'; // yellow
  if (turnout >= 20) return '#f97316'; // orange
  return '#ef4444'; // red
}

function getBoothRadius(totalVoters: number): number {
  if (totalVoters > 3000) return 14;
  if (totalVoters > 2000) return 12;
  if (totalVoters > 1000) return 10;
  return 8;
}

function getMoodEmoji(mood: string | null): string {
  if (mood === 'GREEN') return 'Winning';
  if (mood === 'YELLOW') return 'Tight';
  if (mood === 'RED') return 'Losing';
  return 'No report';
}

function getClassificationBadge(c: string): string {
  const map: Record<string, string> = {
    SAFE: 'bg-green-100 text-green-800',
    FAVORABLE: 'bg-blue-100 text-blue-800',
    BATTLEGROUND: 'bg-yellow-100 text-yellow-800',
    DIFFICULT: 'bg-orange-100 text-orange-800',
    HOSTILE: 'bg-red-100 text-red-800',
    UNKNOWN: 'bg-gray-100 text-gray-800',
  };
  return map[c] || map.UNKNOWN;
}

// Pulsing animation component
function PulsingMarker({ booth, onClick }: { booth: BoothMapData; onClick?: () => void }) {
  const color = getBoothColor(booth.turnoutPercent, booth.classification, booth.hasOpenIncident);
  const radius = getBoothRadius(booth.totalVoters);
  const isPulsing = booth.pulseRate > 0;
  const opacity = booth.agentIsCheckedIn ? 0.9 : 0.4; // fog of war - dim booths without active agents

  if (!booth.latitude || !booth.longitude) return null;

  return (
    <>
      {/* Pulse ring for active booths */}
      {isPulsing && (
        <CircleMarker
          center={[booth.latitude, booth.longitude]}
          radius={radius + 6}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: 0.15,
            weight: 1,
            opacity: 0.3,
          }}
        />
      )}
      {/* Main booth marker */}
      <CircleMarker
        center={[booth.latitude, booth.longitude]}
        radius={radius}
        pathOptions={{
          color: booth.hasOpenIncident ? '#ef4444' : color,
          fillColor: color,
          fillOpacity: opacity,
          weight: booth.hasOpenIncident ? 3 : 2,
        }}
        eventHandlers={{ click: () => onClick?.() }}
      >
        <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
          <div className="text-xs">
            <strong>Booth {booth.boothNumber}</strong> — {booth.turnoutPercent.toFixed(1)}%
          </div>
        </Tooltip>
        <Popup>
          <div className="min-w-[200px]">
            <h3 className="font-bold text-sm mb-1">Booth {booth.boothNumber}</h3>
            <p className="text-xs text-gray-500 mb-2">{booth.boothName}</p>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Turnout:</span>
                <strong>{booth.votedCount}/{booth.totalVoters} ({booth.turnoutPercent.toFixed(1)}%)</strong>
              </div>

              <div className="flex justify-between items-center">
                <span>Classification:</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getClassificationBadge(booth.classification)}`}>
                  {booth.classification}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Agent:</span>
                <span className={booth.agentIsCheckedIn ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  {booth.agentName || 'Unassigned'}
                  {booth.agentIsCheckedIn && ' (Active)'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Mood:</span>
                <span>{getMoodEmoji(booth.latestMood)}</span>
              </div>

              <div className="flex justify-between">
                <span>Vote Rate:</span>
                <span>{booth.pulseRate} votes/15min</span>
              </div>

              {booth.hasOpenIncident && (
                <div className="mt-1 px-2 py-1 bg-red-50 text-red-700 rounded text-[10px] font-medium">
                  Open Incident
                </div>
              )}
            </div>

            {/* Turnout progress bar */}
            <div className="mt-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, booth.turnoutPercent)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

// Map auto-fit bounds
function FitBounds({ booths }: { booths: BoothMapData[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;
    const validBooths = booths.filter((b) => b.latitude && b.longitude);
    if (validBooths.length === 0) return;

    const lats = validBooths.map((b) => b.latitude!);
    const lngs = validBooths.map((b) => b.longitude!);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lats) - 0.01, Math.min(...lngs) - 0.01],
      [Math.max(...lats) + 0.01, Math.max(...lngs) + 0.01],
    ];
    map.fitBounds(bounds, { padding: [20, 20] });
    fitted.current = true;
  }, [booths, map]);

  return null;
}

export function BattlefieldMap({ booths, agents, incidents, onBoothClick }: BattlefieldMapProps) {
  const [mapStyle, setMapStyle] = useState<MapStyle>('light');

  // Default center (India)
  const center = useMemo(() => {
    const valid = booths.filter((b) => b.latitude && b.longitude);
    if (valid.length === 0) return [20.5937, 78.9629] as [number, number];
    const avgLat = valid.reduce((s, b) => s + b.latitude!, 0) / valid.length;
    const avgLng = valid.reduce((s, b) => s + b.longitude!, 0) / valid.length;
    return [avgLat, avgLng] as [number, number];
  }, [booths]);

  const tile = TILE_LAYERS[mapStyle];

  return (
    <div className="h-full w-full relative">
      {/* Map style toggle */}
      <div className="absolute top-3 left-3 z-[1000] flex gap-1 bg-card/95 backdrop-blur border rounded-lg p-1">
        {(Object.keys(TILE_LAYERS) as MapStyle[]).map((style) => (
          <button
            key={style}
            onClick={() => setMapStyle(style)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              mapStyle === style
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {style === 'light' ? 'Light' : style === 'dark' ? 'Dark' : 'Satellite'}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 z-[1000] bg-card/95 backdrop-blur border rounded-lg p-3 text-xs space-y-1.5">
        <div className="font-semibold mb-1">Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" /> Turnout &gt;60%
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" /> Turnout 40-60%
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" /> Turnout 20-40%
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" /> Turnout &lt;20%
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300 opacity-40" /> No Agent (Fog)
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" /> Active Pulse
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-card/95 backdrop-blur border rounded-lg px-3 py-2 text-xs">
        <span className="font-medium">{booths.filter((b) => b.latitude && b.longitude).length}</span> booths mapped
        {' | '}
        <span className="font-medium text-green-600">{booths.filter((b) => b.agentIsCheckedIn).length}</span> agents active
        {incidents.filter((i) => i.status === 'OPEN' || i.status === 'ESCALATED').length > 0 && (
          <>
            {' | '}
            <span className="font-medium text-red-600">
              {incidents.filter((i) => i.status === 'OPEN' || i.status === 'ESCALATED').length} incidents
            </span>
          </>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          key={mapStyle}
          attribution={tile.attribution}
          url={tile.url}
        />
        <FitBounds booths={booths} />

        {/* Booth markers */}
        {booths.map((booth) => (
          <PulsingMarker
            key={booth.id}
            booth={booth}
            onClick={() => onBoothClick?.(booth.id)}
          />
        ))}

        {/* Agent markers */}
        {agents
          .filter((a) => a.lastLatitude && a.lastLongitude)
          .map((agent) => (
            <CircleMarker
              key={`agent-${agent.id}`}
              center={[agent.lastLatitude!, agent.lastLongitude!]}
              radius={5}
              pathOptions={{
                color: '#3b82f6',
                fillColor: agent.isCheckedIn ? '#3b82f6' : '#9ca3af',
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div className="text-xs">
                  <strong>{agent.name}</strong> — Booth {agent.boothNumber}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}

        {/* Incident markers */}
        {incidents
          .filter((i) => i.latitude && i.longitude && (i.status === 'OPEN' || i.status === 'ESCALATED'))
          .map((incident) => (
            <CircleMarker
              key={`incident-${incident.id}`}
              center={[incident.latitude!, incident.longitude!]}
              radius={8}
              pathOptions={{
                color: '#ef4444',
                fillColor: incident.severity === 'CRITICAL' ? '#7f1d1d' : '#ef4444',
                fillOpacity: 0.8,
                weight: 3,
                dashArray: '4 4',
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="text-red-600">{incident.severity}: {incident.title}</strong>
                  <p className="mt-1 text-gray-600">{incident.status}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
}
