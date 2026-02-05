import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { votersAPI, partsAPI, electionsAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
// Tabs imports removed - not currently used
import { Checkbox } from '../components/ui/checkbox';
import { Skeleton } from '../components/ui/skeleton';
import {
  AlertTriangleIcon,
  SearchIcon,
  PrinterIcon,
  DownloadIcon,
  FileTextIcon,
  UsersIcon,
  MapPinIcon,
  LayoutTemplateIcon,
} from 'lucide-react';
import { formatNumber, cn } from '../lib/utils';

interface Voter {
  id: string;
  serialNo?: number;
  slNo?: number;
  slNumber?: number;
  voterNameEn?: string;
  voterName?: string;
  name?: string;
  voterNameLocal?: string;
  nameLocal?: string;
  epicNo?: string;
  epicNumber?: string;
  relativeName?: string;
  relationType?: string;
  age?: number;
  gender?: string;
  houseNo?: string;
  address?: string;
  mobile?: string;
  partId: string;
  part?: {
    partNo?: number;
    partNumber?: number;
    partNameEn?: string;
    partName?: string;
    boothAddress?: string;
  };
}

interface SlipTemplate {
  id: string;
  name: string;
  description: string;
  layout: 'standard' | 'compact' | 'detailed';
}

const SLIP_TEMPLATES: SlipTemplate[] = [
  {
    id: 'standard',
    name: 'Standard Slip',
    description: 'Standard voter slip with essential information',
    layout: 'standard',
  },
  {
    id: 'compact',
    name: 'Compact Slip',
    description: 'Smaller slip size, 4 per page',
    layout: 'compact',
  },
  {
    id: 'detailed',
    name: 'Detailed Slip',
    description: 'Full details with QR code and photo placeholder',
    layout: 'detailed',
  },
];

export function VoterSlipPage() {
  const { selectedElectionId } = useElectionStore();
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedPartId, setSelectedPartId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('standard');
  const [selectedVoters, setSelectedVoters] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [, setShowPreview] = useState(false);

  const { data: electionData } = useQuery({
    queryKey: ['election', selectedElectionId],
    queryFn: () => electionsAPI.getById(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: partsData } = useQuery({
    queryKey: ['parts-slip', selectedElectionId],
    queryFn: () => partsAPI.getAll(selectedElectionId!, { limit: 500 }),
    enabled: !!selectedElectionId,
  });

  const { data: votersData, isLoading: votersLoading } = useQuery({
    queryKey: ['voters-slip', selectedElectionId, selectedPartId],
    queryFn: () =>
      votersAPI.getAll(selectedElectionId!, {
        partId: selectedPartId !== 'all' ? selectedPartId : undefined,
        limit: 500,
      }),
    enabled: !!selectedElectionId,
  });

  const election = electionData?.data?.data;
  const parts = partsData?.data?.data || [];
  const voters: Voter[] = votersData?.data?.data || [];

  // Filter voters
  const filteredVoters = useMemo(() => {
    if (!search) return voters;
    const lowerSearch = search.toLowerCase();
    return voters.filter(
      (v) =>
        (v.name || v.voterName || v.voterNameEn)?.toLowerCase().includes(lowerSearch) ||
        (v.epicNumber || v.epicNo)?.toLowerCase().includes(lowerSearch) ||
        (v.slNumber || v.serialNo || v.slNo)?.toString().includes(search)
    );
  }, [voters, search]);

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedVoters(new Set(filteredVoters.map((v) => v.id)));
    } else {
      setSelectedVoters(new Set());
    }
  };

  // Handle individual selection
  const handleSelectVoter = (voterId: string, checked: boolean) => {
    const newSelected = new Set(selectedVoters);
    if (checked) {
      newSelected.add(voterId);
    } else {
      newSelected.delete(voterId);
    }
    setSelectedVoters(newSelected);
    setSelectAll(newSelected.size === filteredVoters.length);
  };

  // Get selected voters data
  const selectedVotersData = useMemo(() => {
    return filteredVoters.filter((v) => selectedVoters.has(v.id));
  }, [filteredVoters, selectedVoters]);

  // Print function
  const handlePrint = () => {
    if (selectedVotersData.length === 0) return;
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Export as CSV
  const handleExport = () => {
    const csvContent = [
      ['S.No', 'Name', 'EPIC No', 'Father/Husband', 'Age', 'Gender', 'Part No', 'Booth Address'].join(','),
      ...selectedVotersData.map((v) =>
        [
          v.serialNo,
          `"${v.voterNameEn}"`,
          v.epicNo || '',
          `"${v.relativeName || ''}"`,
          v.age || '',
          v.gender || '',
          v.part?.partNo || '',
          `"${v.part?.boothAddress || ''}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voter-slips.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const template = SLIP_TEMPLATES.find((t) => t.id === selectedTemplate) || SLIP_TEMPLATES[0];

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Election Selected</h2>
        <p className="text-gray-500 mt-2">Please select an election to generate voter slips.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileTextIcon className="h-6 w-6" />
            Voter Slips
          </h1>
          <p className="text-gray-500">Generate and print voter slips for poll day distribution</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={selectedVoters.size === 0}
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={handlePrint}
            disabled={selectedVoters.size === 0}
          >
            <PrinterIcon className="h-4 w-4 mr-2" />
            Print ({selectedVoters.size})
          </Button>
        </div>
      </div>

      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplateIcon className="h-5 w-5" />
            Select Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SLIP_TEMPLATES.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'p-4 border-2 rounded-lg cursor-pointer transition-all',
                  selectedTemplate === t.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => setSelectedTemplate(t.id)}
              >
                <div className="font-medium">{t.name}</div>
                <p className="text-sm text-gray-500 mt-1">{t.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm text-gray-500 mb-1 block">Part / Booth</Label>
              <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select part" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parts</SelectItem>
                  {parts.map((part: any) => (
                    <SelectItem key={part.id} value={part.id}>
                      Part {part.partNumber || part.partNo} - {part.partName || part.partNameEn || '-'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-sm text-gray-500 mb-1 block">Search Voter</Label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, EPIC, or S.No..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">Total Voters</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(filteredVoters.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileTextIcon className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-gray-500">Selected</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{selectedVoters.size}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">Parts</span>
            </div>
            <p className="text-2xl font-bold">{parts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PrinterIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">Template</span>
            </div>
            <p className="text-lg font-bold">{template.name}</p>
          </CardContent>
        </Card>
      </div>

      {/* Voters Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Voters</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                id="selectAll"
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="selectAll" className="text-sm">
                Select All ({filteredVoters.length})
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {votersLoading ? (
            <div className="p-4 space-y-4">
              {Array(10)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
          ) : filteredVoters.length === 0 ? (
            <div className="p-8 text-center">
              <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No voters found</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 w-[50px]"></th>
                    <th className="text-left p-3">S.No</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">EPIC No</th>
                    <th className="text-left p-3">Father/Husband</th>
                    <th className="text-left p-3">Age/Gender</th>
                    <th className="text-left p-3">Part</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredVoters.map((voter) => (
                    <tr
                      key={voter.id}
                      className={cn(
                        'hover:bg-gray-50',
                        selectedVoters.has(voter.id) && 'bg-orange-50'
                      )}
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={selectedVoters.has(voter.id)}
                          onCheckedChange={(checked) => handleSelectVoter(voter.id, !!checked)}
                        />
                      </td>
                      <td className="p-3 font-medium">{voter.slNumber || voter.serialNo || voter.slNo || '-'}</td>
                      <td className="p-3">
                        <div>{voter.name || voter.voterName || voter.voterNameEn || '-'}</div>
                        {(voter.nameLocal || voter.voterNameLocal) && (
                          <div className="text-sm text-gray-500">{voter.nameLocal || voter.voterNameLocal}</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-sm">{voter.epicNumber || voter.epicNo || '-'}</td>
                      <td className="p-3 text-sm">
                        {voter.relativeName && (
                          <span>
                            {voter.relationType === 'FATHER' ? 'S/O ' : 'W/O '}
                            {voter.relativeName}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span>{voter.age}</span>
                        <span className="text-gray-400"> / </span>
                        <span>{voter.gender}</span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">Part {voter.part?.partNumber || voter.part?.partNo || '-'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Preview (hidden, shown during print) */}
      <div className="hidden print:block" ref={printRef}>
        <style>
          {`
            @media print {
              body * { visibility: hidden; }
              .print-content, .print-content * { visibility: visible; }
              .print-content { position: absolute; left: 0; top: 0; width: 100%; }
              .voter-slip { page-break-inside: avoid; margin-bottom: 10mm; }
              .no-print { display: none !important; }
            }
          `}
        </style>
        <div className="print-content">
          {selectedVotersData.map((voter) => (
            <div
              key={voter.id}
              className={cn(
                'voter-slip border-2 border-black p-4 mb-4',
                template.layout === 'compact' && 'text-sm p-2',
                template.layout === 'detailed' && 'p-6'
              )}
            >
              <div className="text-center border-b pb-2 mb-2">
                <h2 className="font-bold text-lg">{election?.electionName}</h2>
                <p className="text-sm">{election?.constituency?.name}</p>
                <p className="text-xs text-gray-600">
                  Poll Date: {election?.pollDate ? new Date(election.pollDate).toLocaleDateString() : '-'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold text-sm text-gray-600">Serial No</div>
                  <div className="text-2xl font-bold">{voter.serialNo || voter.slNo || '-'}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-600">Part No</div>
                  <div className="text-2xl font-bold">{voter.part?.partNumber || voter.part?.partNo || '-'}</div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div>
                  <span className="font-semibold">Name: </span>
                  <span className="text-lg">{voter.voterName || voter.voterNameEn || '-'}</span>
                  {voter.voterNameLocal && <span className="ml-2">({voter.voterNameLocal})</span>}
                </div>
                <div>
                  <span className="font-semibold">
                    {voter.relationType === 'FATHER' ? "Father's Name: " : "Husband's Name: "}
                  </span>
                  <span>{voter.relativeName || '-'}</span>
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="font-semibold">Age: </span>
                    <span>{voter.age}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Gender: </span>
                    <span>{voter.gender}</span>
                  </div>
                </div>
                <div>
                  <span className="font-semibold">EPIC No: </span>
                  <span className="font-mono">{voter.epicNo || voter.epicNumber || '-'}</span>
                </div>
                {template.layout === 'detailed' && (
                  <>
                    <div>
                      <span className="font-semibold">House No: </span>
                      <span>{voter.houseNo || '-'}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Address: </span>
                      <span>{voter.address || '-'}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 pt-2 border-t">
                <div className="font-semibold text-sm text-gray-600">Polling Booth</div>
                <div>{voter.part?.partName || voter.part?.partNameEn || '-'}</div>
                <div className="text-sm text-gray-600">{voter.part?.boothAddress || '-'}</div>
              </div>

              {template.layout === 'detailed' && (
                <div className="mt-4 flex justify-between items-end">
                  <div className="text-xs text-gray-500">
                    Generated on: {new Date().toLocaleDateString()}
                  </div>
                  <div className="w-16 h-16 border-2 border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-400">
                    QR Code
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
