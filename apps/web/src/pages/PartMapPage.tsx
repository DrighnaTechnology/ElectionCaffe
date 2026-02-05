import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { partsAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import {
  AlertTriangleIcon,
  MapPinIcon,
  SearchIcon,
  LayersIcon,
  UsersIcon,
  MapIcon,
  ListIcon,
  LocateIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react';
import { formatNumber, cn } from '../lib/utils';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons for different vulnerability levels
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const vulnerabilityIcons = {
  HIGH: createCustomIcon('#ef4444'),
  MEDIUM: createCustomIcon('#f59e0b'),
  LOW: createCustomIcon('#22c55e'),
  NORMAL: createCustomIcon('#6b7280'),
};

// Map controls component
function MapControls() {
  const map = useMap();

  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleLocate = () => {
    map.locate({ setView: true, maxZoom: 14 });
  };

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <Button size="icon" variant="secondary" className="shadow-md" onClick={handleZoomIn}>
        <ZoomInIcon className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="secondary" className="shadow-md" onClick={handleZoomOut}>
        <ZoomOutIcon className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="secondary" className="shadow-md" onClick={handleLocate}>
        <LocateIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Component to fly to location
function FlyToLocation({ position }: { position: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1 });
    }
  }, [map, position]);

  return null;
}

// Interface for part with location
interface PartWithLocation {
  id: string;
  partNo: number;
  partNameEn: string;
  partNameLocal?: string;
  boothAddress?: string;
  latitude?: number;
  longitude?: number;
  totalVoters?: number;
  maleVoters?: number;
  femaleVoters?: number;
  vulnerability?: string;
  _count?: {
    sections: number;
    voters: number;
    cadres: number;
  };
}

export function PartMapPage() {
  const { selectedElectionId } = useElectionStore();
  const [search, setSearch] = useState('');
  const [vulnerabilityFilter, setVulnerabilityFilter] = useState<string>('all');
  const [selectedPart, setSelectedPart] = useState<PartWithLocation | null>(null);
  const [flyToPosition, setFlyToPosition] = useState<[number, number] | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');

  // Fetch all parts with location data
  const { data: partsData, isLoading } = useQuery({
    queryKey: ['parts-map', selectedElectionId],
    queryFn: () => partsAPI.getAll(selectedElectionId!, { limit: 500 }),
    enabled: !!selectedElectionId,
  });

  const parts: PartWithLocation[] = partsData?.data?.data || [];

  // Filter parts based on search and vulnerability
  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const matchesSearch =
        !search ||
        part.partNameEn?.toLowerCase().includes(search.toLowerCase()) ||
        part.partNo?.toString().includes(search) ||
        part.boothAddress?.toLowerCase().includes(search.toLowerCase());

      const matchesVulnerability =
        vulnerabilityFilter === 'all' || part.vulnerability === vulnerabilityFilter;

      return matchesSearch && matchesVulnerability;
    });
  }, [parts, search, vulnerabilityFilter]);

  // Parts with valid coordinates
  const partsWithCoordinates = useMemo(() => {
    return filteredParts.filter(
      (part) =>
        part.latitude &&
        part.longitude &&
        !isNaN(part.latitude) &&
        !isNaN(part.longitude)
    );
  }, [filteredParts]);

  // Calculate map center based on parts
  const mapCenter = useMemo<[number, number]>(() => {
    if (partsWithCoordinates.length > 0) {
      const avgLat =
        partsWithCoordinates.reduce((sum, p) => sum + (p.latitude || 0), 0) /
        partsWithCoordinates.length;
      const avgLng =
        partsWithCoordinates.reduce((sum, p) => sum + (p.longitude || 0), 0) /
        partsWithCoordinates.length;
      return [avgLat, avgLng];
    }
    // Default to center of India
    return [20.5937, 78.9629];
  }, [partsWithCoordinates]);

  // Vulnerability stats
  const vulnerabilityStats = useMemo(() => {
    const stats = { HIGH: 0, MEDIUM: 0, LOW: 0, NORMAL: 0 };
    parts.forEach((part) => {
      const v = (part.vulnerability || 'NORMAL') as keyof typeof stats;
      if (stats[v] !== undefined) stats[v]++;
    });
    return stats;
  }, [parts]);

  const handlePartClick = (part: PartWithLocation) => {
    setSelectedPart(part);
    if (part.latitude && part.longitude) {
      setFlyToPosition([part.latitude, part.longitude]);
    }
  };

  const getVulnerabilityBadge = (vulnerability?: string) => {
    switch (vulnerability) {
      case 'HIGH':
        return <Badge variant="destructive">High Risk</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Medium Risk</Badge>;
      case 'LOW':
        return <Badge variant="success">Low Risk</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Election Selected</h2>
        <p className="text-gray-500 mt-2">
          Please select an election from the sidebar to view the part map.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapIcon className="h-6 w-6" />
            Part Map
          </h1>
          <p className="text-gray-500">
            Visualize polling booths on map ({partsWithCoordinates.length} of {filteredParts.length}{' '}
            parts have coordinates)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'map' | 'list')}>
            <TabsList>
              <TabsTrigger value="map" className="flex items-center gap-2">
                <MapIcon className="h-4 w-4" />
                Map
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <ListIcon className="h-4 w-4" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className={cn(
            'cursor-pointer transition-all',
            vulnerabilityFilter === 'HIGH' && 'ring-2 ring-red-500'
          )}
          onClick={() => setVulnerabilityFilter(vulnerabilityFilter === 'HIGH' ? 'all' : 'HIGH')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-500">High Risk</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{vulnerabilityStats.HIGH}</p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            'cursor-pointer transition-all',
            vulnerabilityFilter === 'MEDIUM' && 'ring-2 ring-amber-500'
          )}
          onClick={() =>
            setVulnerabilityFilter(vulnerabilityFilter === 'MEDIUM' ? 'all' : 'MEDIUM')
          }
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-sm text-gray-500">Medium Risk</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{vulnerabilityStats.MEDIUM}</p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            'cursor-pointer transition-all',
            vulnerabilityFilter === 'LOW' && 'ring-2 ring-green-500'
          )}
          onClick={() => setVulnerabilityFilter(vulnerabilityFilter === 'LOW' ? 'all' : 'LOW')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-500">Low Risk</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{vulnerabilityStats.LOW}</p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            'cursor-pointer transition-all',
            vulnerabilityFilter === 'NORMAL' && 'ring-2 ring-gray-500'
          )}
          onClick={() =>
            setVulnerabilityFilter(vulnerabilityFilter === 'NORMAL' ? 'all' : 'NORMAL')
          }
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-500" />
              <span className="text-sm text-gray-500">Normal</span>
            </div>
            <p className="text-2xl font-bold text-gray-600">{vulnerabilityStats.NORMAL}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search parts by name, number, or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={mapType}
              onValueChange={(v) => setMapType(v as 'street' | 'satellite')}
            >
              <SelectTrigger className="w-[180px]">
                <LayersIcon className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Map Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="street">Street View</SelectItem>
                <SelectItem value="satellite">Satellite View</SelectItem>
              </SelectContent>
            </Select>
            {vulnerabilityFilter !== 'all' && (
              <Button variant="outline" onClick={() => setVulnerabilityFilter('all')}>
                Clear Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {isLoading ? (
        <Skeleton className="h-[600px] w-full rounded-lg" />
      ) : viewMode === 'map' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Map Container */}
          <Card className="lg:col-span-3 overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[600px] relative">
                <MapContainer
                  center={mapCenter}
                  zoom={10}
                  className="h-full w-full"
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url={
                      mapType === 'satellite'
                        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    }
                  />
                  <MapControls />
                  <FlyToLocation position={flyToPosition} />

                  {partsWithCoordinates.map((part) => (
                    <Marker
                      key={part.id}
                      position={[part.latitude!, part.longitude!]}
                      icon={
                        vulnerabilityIcons[
                          (part.vulnerability as keyof typeof vulnerabilityIcons) || 'NORMAL'
                        ]
                      }
                      eventHandlers={{
                        click: () => handlePartClick(part),
                      }}
                    >
                      <Popup>
                        <div className="min-w-[200px]">
                          <h3 className="font-semibold text-lg">Part {part.partNo}</h3>
                          <p className="text-gray-600">{part.partNameEn}</p>
                          {part.boothAddress && (
                            <p className="text-sm text-gray-500 mt-1">{part.boothAddress}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <UsersIcon className="h-4 w-4 text-gray-400" />
                            <span>{formatNumber(part.totalVoters || 0)} voters</span>
                          </div>
                          <div className="mt-2">{getVulnerabilityBadge(part.vulnerability)}</div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </CardContent>
          </Card>

          {/* Parts List Sidebar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Parts ({filteredParts.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[550px] overflow-y-auto">
                {filteredParts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No parts found</div>
                ) : (
                  <div className="divide-y">
                    {filteredParts.map((part) => (
                      <div
                        key={part.id}
                        className={cn(
                          'p-3 cursor-pointer hover:bg-gray-50 transition-colors',
                          selectedPart?.id === part.id && 'bg-orange-50'
                        )}
                        onClick={() => handlePartClick(part)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Part {part.partNo}</span>
                              {!part.latitude && (
                                <Badge variant="outline" className="text-xs">
                                  No GPS
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate">{part.partNameEn}</p>
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <UsersIcon className="h-3 w-3" />
                              {formatNumber(part.totalVoters || 0)}
                            </div>
                          </div>
                          <div
                            className={cn(
                              'h-3 w-3 rounded-full flex-shrink-0 mt-1',
                              part.vulnerability === 'HIGH' && 'bg-red-500',
                              part.vulnerability === 'MEDIUM' && 'bg-amber-500',
                              part.vulnerability === 'LOW' && 'bg-green-500',
                              (!part.vulnerability || part.vulnerability === 'NORMAL') &&
                                'bg-gray-400'
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Part No</th>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Address</th>
                    <th className="text-left p-3 font-medium">Voters</th>
                    <th className="text-left p-3 font-medium">Coordinates</th>
                    <th className="text-left p-3 font-medium">Vulnerability</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredParts.map((part) => (
                    <tr
                      key={part.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        handlePartClick(part);
                        setViewMode('map');
                      }}
                    >
                      <td className="p-3 font-medium">{part.partNo}</td>
                      <td className="p-3">
                        <div>{part.partNameEn}</div>
                        {part.partNameLocal && (
                          <div className="text-sm text-gray-500">{part.partNameLocal}</div>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-600 max-w-[200px] truncate">
                        {part.boothAddress || '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <UsersIcon className="h-4 w-4 text-gray-400" />
                          {formatNumber(part.totalVoters || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          M: {formatNumber(part.maleVoters || 0)} | F:{' '}
                          {formatNumber(part.femaleVoters || 0)}
                        </div>
                      </td>
                      <td className="p-3">
                        {part.latitude && part.longitude ? (
                          <span className="text-xs font-mono">
                            {part.latitude.toFixed(4)}, {part.longitude.toFixed(4)}
                          </span>
                        ) : (
                          <Badge variant="outline">No GPS</Badge>
                        )}
                      </td>
                      <td className="p-3">{getVulnerabilityBadge(part.vulnerability)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Part Details */}
      {selectedPart && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5" />
              Part {selectedPart.partNo} - {selectedPart.partNameEn}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Voters</p>
                <p className="text-lg font-semibold">
                  {formatNumber(selectedPart.totalVoters || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Male Voters</p>
                <p className="text-lg font-semibold">
                  {formatNumber(selectedPart.maleVoters || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Female Voters</p>
                <p className="text-lg font-semibold">
                  {formatNumber(selectedPart.femaleVoters || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vulnerability</p>
                <div className="mt-1">{getVulnerabilityBadge(selectedPart.vulnerability)}</div>
              </div>
            </div>
            {selectedPart.boothAddress && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Booth Address</p>
                <p className="text-sm">{selectedPart.boothAddress}</p>
              </div>
            )}
            {selectedPart.latitude && selectedPart.longitude && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Coordinates</p>
                <p className="text-sm font-mono">
                  {selectedPart.latitude}, {selectedPart.longitude}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
