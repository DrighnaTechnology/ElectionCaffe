import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { partsAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Spinner } from '../components/ui/spinner';
import {
  AlertTriangleIcon,
  UploadIcon,
  FileSpreadsheetIcon,
  PlusIcon,
  CheckCircle2Icon,
  XCircleIcon,
  DownloadIcon,
  ArrowLeftIcon,
  MapPinIcon,
  TrashIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface PartFormData {
  partNumber: string;
  boothName: string;
  boothNameLocal: string;
  address: string;
  partType: string;
  landmark: string;
  pincode: string;
  latitude: string;
  longitude: string;
  vulnerability: string;
}

interface BulkPartRow {
  id: string;
  partNumber: string;
  boothName: string;
  boothNameLocal?: string;
  address?: string;
  partType?: string;
  landmark?: string;
  pincode?: string;
  latitude?: string;
  longitude?: string;
  vulnerability?: string;
  isValid: boolean;
  errors: string[];
}

const SAMPLE_CSV = `partNumber,boothName,boothNameLocal,address,partType,landmark,pincode,latitude,longitude,vulnerability
1,Government High School,அரசு மேல்நிலைப் பள்ளி,123 Main Street,URBAN,Near Bus Stand,600001,11.0168,76.9558,NORMAL
2,Community Hall,சமூக கூடம்,45 Gandhi Road,URBAN,Near Temple,600002,11.0172,76.9562,LOW
3,Primary School,தொடக்கப் பள்ளி,78 Nehru Nagar,RURAL,Near Market,600003,11.0185,76.9545,MEDIUM`;

export function AddPartPage() {
  const { selectedElectionId } = useElectionStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'manual' | 'bulk'>('manual');
  const [formData, setFormData] = useState<PartFormData>({
    partNumber: '',
    boothName: '',
    boothNameLocal: '',
    address: '',
    partType: 'URBAN',
    landmark: '',
    pincode: '',
    latitude: '',
    longitude: '',
    vulnerability: 'NOT_ASSIGNED',
  });
  const [bulkParts, setBulkParts] = useState<BulkPartRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Manual create mutation
  const createMutation = useMutation({
    mutationFn: () =>
      partsAPI.create(selectedElectionId!, {
        partNumber: parseInt(formData.partNumber),
        boothName: formData.boothName,
        boothNameLocal: formData.boothNameLocal || undefined,
        address: formData.address || undefined,
        partType: formData.partType || 'URBAN',
        landmark: formData.landmark || undefined,
        pincode: formData.pincode || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      }),
    onSuccess: () => {
      toast.success('Part created successfully');
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      navigate('/parts');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create part');
    },
  });

  // Bulk create mutation
  const bulkCreateMutation = useMutation({
    mutationFn: (parts: any[]) =>
      partsAPI.bulkCreate(selectedElectionId!, parts),
    onSuccess: (data) => {
      const result = data?.data?.data;
      toast.success(`Successfully created ${result?.created || bulkParts.length} parts`);
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      navigate('/parts');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create parts');
    },
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partNumber || !formData.boothName) {
      toast.error('Part number and booth name are required');
      return;
    }
    createMutation.mutate();
  };

  const validateRow = (row: any, index: number): BulkPartRow => {
    const errors: string[] = [];

    if (!row.partNumber) errors.push('Part number is required');
    if (!row.boothName) errors.push('Booth name is required');
    if (row.partNumber && isNaN(parseInt(row.partNumber))) errors.push('Part number must be numeric');
    if (row.boothName && row.boothName.length < 3) errors.push('Booth name must be at least 3 characters');
    if (row.latitude && isNaN(parseFloat(row.latitude))) errors.push('Latitude must be numeric');
    if (row.longitude && isNaN(parseFloat(row.longitude))) errors.push('Longitude must be numeric');
    if (row.pincode && !/^\d{6}$/.test(row.pincode)) errors.push('Pincode must be 6 digits');
    if (row.partType && !['URBAN', 'RURAL'].includes(row.partType.toUpperCase())) errors.push('Part type must be URBAN or RURAL');

    return {
      id: `row-${index}`,
      partNumber: row.partNumber || '',
      boothName: row.boothName || '',
      boothNameLocal: row.boothNameLocal,
      address: row.address,
      partType: row.partType || 'URBAN',
      landmark: row.landmark,
      pincode: row.pincode,
      latitude: row.latitude,
      longitude: row.longitude,
      vulnerability: row.vulnerability || 'NOT_ASSIGNED',
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          toast.error('CSV file must have at least a header row and one data row');
          setIsUploading(false);
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          return validateRow(row, index);
        });

        setBulkParts(rows);
        toast.success(`Loaded ${rows.length} rows from CSV`);
      } catch (error) {
        toast.error('Failed to parse CSV file');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  const handleBulkSubmit = () => {
    const validParts = bulkParts.filter(p => p.isValid);
    if (validParts.length === 0) {
      toast.error('No valid parts to upload');
      return;
    }

    const partsToCreate = validParts.map(p => ({
      partNumber: parseInt(p.partNumber),
      boothName: p.boothName,
      boothNameLocal: p.boothNameLocal || undefined,
      address: p.address || undefined,
      partType: (p.partType || 'URBAN').toUpperCase(),
      landmark: p.landmark || undefined,
      pincode: p.pincode || undefined,
      latitude: p.latitude ? parseFloat(p.latitude) : undefined,
      longitude: p.longitude ? parseFloat(p.longitude) : undefined,
    }));

    bulkCreateMutation.mutate(partsToCreate);
  };

  const removeRow = (id: string) => {
    setBulkParts(prev => prev.filter(p => p.id !== id));
  };

  const downloadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-parts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground">No Election Selected</h2>
        <p className="text-muted-foreground mt-2">Please select an election to add parts.</p>
      </div>
    );
  }

  const validCount = bulkParts.filter(p => p.isValid).length;
  const invalidCount = bulkParts.filter(p => !p.isValid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/parts')}>
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPinIcon className="h-6 w-6" />
            Add Part / Booth
          </h1>
          <p className="text-muted-foreground">Add new polling parts manually or via bulk upload</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'bulk')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <UploadIcon className="h-4 w-4" />
            Bulk Upload
          </TabsTrigger>
        </TabsList>

        {/* Manual Entry Tab */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Add Single Part</CardTitle>
              <CardDescription>Fill in the details to create a new polling part</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partNumber">Part Number *</Label>
                    <Input
                      id="partNumber"
                      type="number"
                      min={1}
                      value={formData.partNumber}
                      onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                      placeholder="e.g., 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partType">Part Type</Label>
                    <Select
                      value={formData.partType}
                      onValueChange={(v) => setFormData({ ...formData, partType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="URBAN">Urban</SelectItem>
                        <SelectItem value="RURAL">Rural</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="e.g., 600001"
                      maxLength={6}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="boothName">Booth Name (English) *</Label>
                    <Input
                      id="boothName"
                      value={formData.boothName}
                      onChange={(e) => setFormData({ ...formData, boothName: e.target.value })}
                      placeholder="e.g., Government High School"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="boothNameLocal">Booth Name (Local Language)</Label>
                    <Input
                      id="boothNameLocal"
                      value={formData.boothNameLocal}
                      onChange={(e) => setFormData({ ...formData, boothNameLocal: e.target.value })}
                      placeholder="e.g., அரசு மேல்நிலைப் பள்ளி"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full address of the polling booth"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="landmark">Landmark</Label>
                  <Input
                    id="landmark"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    placeholder="e.g., Near Bus Stand"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="text"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="e.g., 11.0168"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="text"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="e.g., 76.9558"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate('/parts')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Spinner size="sm" className="mr-2" />}
                    Create Part
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Upload Tab */}
        <TabsContent value="bulk">
          <div className="space-y-4">
            {/* Upload Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Bulk Upload Parts</CardTitle>
                    <CardDescription>Upload a CSV file with multiple parts</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadSampleCSV}>
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Download Sample CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                    'hover:border-brand hover:bg-brand-muted/50'
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Spinner size="lg" />
                      <p className="text-muted-foreground">Processing file...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheetIcon className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground font-medium">Click to upload CSV file</p>
                      <p className="text-sm text-muted-foreground">or drag and drop</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview Table */}
            {bulkParts.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Preview ({bulkParts.length} rows)</CardTitle>
                      <div className="flex gap-4 mt-2">
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2Icon className="h-3 w-3" />
                          {validCount} Valid
                        </Badge>
                        {invalidCount > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircleIcon className="h-3 w-3" />
                            {invalidCount} Invalid
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setBulkParts([])}
                      >
                        Clear All
                      </Button>
                      <Button
                        onClick={handleBulkSubmit}
                        disabled={validCount === 0 || bulkCreateMutation.isPending}
                      >
                        {bulkCreateMutation.isPending && <Spinner size="sm" className="mr-2" />}
                        Upload {validCount} Parts
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[60px]">Status</TableHead>
                          <TableHead>Part No</TableHead>
                          <TableHead>Booth Name</TableHead>
                          <TableHead>Name (Local)</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Errors</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkParts.map((row) => (
                          <TableRow
                            key={row.id}
                            className={cn(!row.isValid && 'bg-red-50')}
                          >
                            <TableCell>
                              {row.isValid ? (
                                <CheckCircle2Icon className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircleIcon className="h-5 w-5 text-red-600" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{row.partNumber}</TableCell>
                            <TableCell>{row.boothName}</TableCell>
                            <TableCell>{row.boothNameLocal || '-'}</TableCell>
                            <TableCell>{row.partType || 'URBAN'}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{row.address || '-'}</TableCell>
                            <TableCell>
                              {row.errors.length > 0 && (
                                <span className="text-xs text-red-600">
                                  {row.errors.join(', ')}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeRow(row.id)}
                              >
                                <TrashIcon className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
