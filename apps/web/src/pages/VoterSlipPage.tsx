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
  slNumber?: number;
  name?: string;
  nameLocal?: string;
  epicNumber?: string;
  fatherName?: string;
  motherName?: string;
  husbandName?: string;
  relationType?: string;
  age?: number;
  gender?: string;
  houseNumber?: string;
  address?: string;
  mobile?: string;
  partId: string;
  part?: {
    partNumber: number;
    boothName: string;
    address?: string;
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
        limit: selectedPartId !== 'all' ? 2000 : 500,
      }),
    enabled: !!selectedElectionId,
  });

  const election = electionData?.data?.data;
  const parts = partsData?.data?.data || [];
  const voters: Voter[] = votersData?.data?.data || [];
  const totalVoterCount: number = votersData?.data?.meta?.total || voters.length;

  // Filter voters
  const filteredVoters = useMemo(() => {
    if (!search) return voters;
    const lowerSearch = search.toLowerCase();
    return voters.filter(
      (v) =>
        v.name?.toLowerCase().includes(lowerSearch) ||
        v.nameLocal?.toLowerCase().includes(lowerSearch) ||
        v.epicNumber?.toLowerCase().includes(lowerSearch) ||
        v.slNumber?.toString().includes(search)
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
    const getRelativeName = (v: Voter) => {
      if (v.relationType === 'HUSBAND' || v.relationType === 'WIFE') return v.husbandName || '';
      return v.fatherName || v.motherName || '';
    };

    const csvContent = [
      ['S.No', 'Name', 'EPIC No', 'Father/Husband', 'Age', 'Gender', 'Part No', 'Booth Name'].join(','),
      ...selectedVotersData.map((v) =>
        [
          v.slNumber || '',
          `"${v.name || ''}"`,
          v.epicNumber || '',
          `"${getRelativeName(v)}"`,
          v.age || '',
          v.gender || '',
          v.part?.partNumber || '',
          `"${v.part?.boothName || ''}"`,
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
        <AlertTriangleIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground">No Election Selected</h2>
        <p className="text-muted-foreground mt-2">Please select an election to generate voter slips.</p>
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
          <p className="text-muted-foreground">Generate and print voter slips for poll day distribution</p>
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
      <Card className="hover:shadow-sm hover:translate-y-0">
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
                  'p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 bg-card',
                  selectedTemplate === t.id
                    ? 'border-brand bg-brand-muted shadow-md ring-1 ring-brand/20'
                    : 'border-border hover:border-brand/40 hover:shadow-md hover:-translate-y-0.5'
                )}
                onClick={() => setSelectedTemplate(t.id)}
              >
                <div className="font-medium">{t.name}</div>
                <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
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
              <Label className="text-sm text-muted-foreground mb-1 block">Part / Booth</Label>
              <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select part" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parts</SelectItem>
                  {parts.map((part: any) => (
                    <SelectItem key={part.id} value={part.id}>
                      Part {part.partNumber} - {part.boothName || '-'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-1 block">Search Voter</Label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
              <UsersIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Voters</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(totalVoterCount)}</p>
            {voters.length < totalVoterCount && (
              <p className="text-xs text-muted-foreground">Showing {formatNumber(voters.length)} of {formatNumber(totalVoterCount)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileTextIcon className="h-5 w-5 text-brand" />
              <span className="text-sm text-muted-foreground">Selected</span>
            </div>
            <p className="text-2xl font-bold text-brand">{selectedVoters.size}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Parts</span>
            </div>
            <p className="text-2xl font-bold">{parts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PrinterIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Template</span>
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
              <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No voters found</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
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
                        'hover:bg-muted/50',
                        selectedVoters.has(voter.id) && 'bg-brand-muted'
                      )}
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={selectedVoters.has(voter.id)}
                          onCheckedChange={(checked) => handleSelectVoter(voter.id, !!checked)}
                        />
                      </td>
                      <td className="p-3 font-medium">{voter.slNumber || '-'}</td>
                      <td className="p-3">
                        <div>{voter.name || '-'}</div>
                        {voter.nameLocal && (
                          <div className="text-sm text-muted-foreground">{voter.nameLocal}</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-sm">{voter.epicNumber || '-'}</td>
                      <td className="p-3 text-sm">
                        {(voter.fatherName || voter.husbandName) && (
                          <span>
                            {voter.relationType === 'HUSBAND' || voter.relationType === 'WIFE' ? 'W/O ' :
                             voter.relationType === 'MOTHER' ? 'D/O ' : 'S/O '}
                            {voter.fatherName || voter.husbandName || voter.motherName}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span>{voter.age}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span>{voter.gender}</span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">Part {voter.part?.partNumber || '-'}</Badge>
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
                <p className="text-xs text-muted-foreground">
                  Poll Date: {election?.pollDate ? new Date(election.pollDate).toLocaleDateString() : '-'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">Serial No</div>
                  <div className="text-2xl font-bold">{voter.slNumber || '-'}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">Part No</div>
                  <div className="text-2xl font-bold">{voter.part?.partNumber || '-'}</div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div>
                  <span className="font-semibold">Name: </span>
                  <span className="text-lg">{voter.name || '-'}</span>
                  {voter.nameLocal && <span className="ml-2">({voter.nameLocal})</span>}
                </div>
                <div>
                  <span className="font-semibold">
                    {voter.relationType === 'HUSBAND' || voter.relationType === 'WIFE' ? "Husband's Name: " : "Father's Name: "}
                  </span>
                  <span>{voter.fatherName || voter.husbandName || voter.motherName || '-'}</span>
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
                  <span className="font-mono">{voter.epicNumber || '-'}</span>
                </div>
                {template.layout === 'detailed' && (
                  <>
                    <div>
                      <span className="font-semibold">House No: </span>
                      <span>{voter.houseNumber || '-'}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Address: </span>
                      <span>{voter.address || '-'}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 pt-2 border-t">
                <div className="font-semibold text-sm text-muted-foreground">Polling Booth</div>
                <div>{voter.part?.boothName || '-'}</div>
                <div className="text-sm text-muted-foreground">{voter.part?.address || voter.address || '-'}</div>
              </div>

              {template.layout === 'detailed' && (
                <div className="mt-4 flex justify-between items-end">
                  <div className="text-xs text-muted-foreground">
                    Generated on: {new Date().toLocaleDateString()}
                  </div>
                  <div className="w-16 h-16 border-2 border-dashed border-gray-400 flex items-center justify-center text-xs text-muted-foreground">
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
