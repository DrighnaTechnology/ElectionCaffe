import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from './ui/button';
import { Spinner } from './ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import {
  UploadIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import { toast } from 'sonner';

export interface TemplateColumn {
  key: string;
  label: string;
  required?: boolean;
  type?: 'string' | 'number' | 'date' | 'boolean';
  description?: string;
  example?: string | number;
}

export interface BulkUploadProps {
  entityName: string;
  templateColumns: TemplateColumn[];
  onUpload: (data: Record<string, unknown>[]) => Promise<{ success: number; failed: number; errors?: string[] }>;
  disabled?: boolean;
}

export function BulkUpload({ entityName, templateColumns, onUpload, disabled }: BulkUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Create header row with column labels
    const headers = templateColumns.map(col => col.label);

    // Create example row
    const exampleRow = templateColumns.map(col => {
      if (col.example !== undefined) return col.example;
      if (col.type === 'number') return 0;
      if (col.type === 'date') return new Date().toISOString().split('T')[0];
      if (col.type === 'boolean') return 'Yes';
      return '';
    });

    // Create data with headers and example
    const wsData = [headers, exampleRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = templateColumns.map(col => ({ wch: Math.max(col.label.length, 15) }));
    ws['!cols'] = colWidths;

    // Add instructions sheet
    const instructionsData = [
      ['Bulk Upload Instructions'],
      [''],
      ['Column', 'Required', 'Type', 'Description'],
      ...templateColumns.map(col => [
        col.label,
        col.required ? 'Yes' : 'No',
        col.type || 'string',
        col.description || ''
      ])
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 50 }];

    XLSX.utils.book_append_sheet(wb, ws, entityName);
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Download the file
    XLSX.writeFile(wb, `${entityName.toLowerCase().replace(/\s+/g, '-')}-template.xlsx`);
    toast.success('Template downloaded successfully');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      if (jsonData.length === 0) {
        toast.error('No data found in the file');
        return;
      }

      // Map column labels back to keys
      const mappedData = jsonData.map(row => {
        const mappedRow: Record<string, unknown> = {};
        templateColumns.forEach(col => {
          const value = row[col.label];
          if (value !== undefined && value !== '') {
            // Convert types
            if (col.type === 'number' && typeof value === 'string') {
              mappedRow[col.key] = parseFloat(value) || 0;
            } else if (col.type === 'boolean') {
              mappedRow[col.key] = value === 'Yes' || value === 'true' || value === true || value === 1;
            } else {
              mappedRow[col.key] = value;
            }
          }
        });
        return mappedRow;
      });

      setPreviewData(mappedData);
      setUploadResult(null);
    } catch (error) {
      toast.error('Failed to read file. Please ensure it is a valid Excel file.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (previewData.length === 0) {
      toast.error('No data to upload');
      return;
    }

    // Validate required fields
    const missingRequired = previewData.some((row, index) => {
      return templateColumns.some(col => {
        if (col.required && (row[col.key] === undefined || row[col.key] === '')) {
          toast.error(`Row ${index + 1}: Missing required field "${col.label}"`);
          return true;
        }
        return false;
      });
    });

    if (missingRequired) return;

    setUploading(true);
    try {
      const result = await onUpload(previewData);
      setUploadResult(result);

      if (result.success > 0) {
        toast.success(`Successfully uploaded ${result.success} ${entityName.toLowerCase()}(s)`);
      }
      if (result.failed > 0) {
        toast.error(`Failed to upload ${result.failed} ${entityName.toLowerCase()}(s)`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
      setUploadResult({ success: 0, failed: previewData.length, errors: [error.message] });
    } finally {
      setUploading(false);
    }
  };

  const resetDialog = () => {
    setPreviewData([]);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetDialog();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <UploadIcon className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheetIcon className="h-5 w-5" />
            Bulk Upload {entityName}
          </DialogTitle>
          <DialogDescription>
            Upload multiple {entityName.toLowerCase()}s at once using an Excel file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Download Template */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Step 1: Download Template</h3>
            <p className="text-sm text-blue-700 mb-3">
              Download the Excel template, fill in your data, and upload it back.
            </p>
            <Button variant="outline" onClick={downloadTemplate} className="bg-white">
              <DownloadIcon className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Step 2: Upload File */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">Step 2: Upload Filled File</h3>
            <p className="text-sm text-gray-600 mb-3">
              Select your filled Excel file (.xlsx or .xls)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
          </div>

          {/* Preview Data */}
          {previewData.length > 0 && !uploadResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  Preview ({previewData.length} rows)
                </h3>
                <Badge variant="secondary">Ready to upload</Badge>
              </div>
              <div className="border rounded-lg overflow-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      {templateColumns.slice(0, 5).map(col => (
                        <TableHead key={col.key}>
                          {col.label}
                          {col.required && <span className="text-red-500">*</span>}
                        </TableHead>
                      ))}
                      {templateColumns.length > 5 && (
                        <TableHead>+{templateColumns.length - 5} more</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        {templateColumns.slice(0, 5).map(col => (
                          <TableCell key={col.key} className="max-w-[150px] truncate">
                            {String(row[col.key] ?? '-')}
                          </TableCell>
                        ))}
                        {templateColumns.length > 5 && (
                          <TableCell className="text-gray-400">...</TableCell>
                        )}
                      </TableRow>
                    ))}
                    {previewData.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={Math.min(templateColumns.length, 5) + 2} className="text-center text-gray-500">
                          ... and {previewData.length - 10} more rows
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className="space-y-3">
              <h3 className="font-medium">Upload Result</h3>
              <div className="flex gap-4">
                {uploadResult.success > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <span className="text-green-700 font-medium">
                      {uploadResult.success} successful
                    </span>
                  </div>
                )}
                {uploadResult.failed > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <XCircleIcon className="h-5 w-5 text-red-600" />
                    <span className="text-red-700 font-medium">
                      {uploadResult.failed} failed
                    </span>
                  </div>
                )}
              </div>
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangleIcon className="h-4 w-4 text-yellow-600" />
                    <span className="text-yellow-700 font-medium">Errors:</span>
                  </div>
                  <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                    {uploadResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <li>... and {uploadResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {uploadResult ? 'Close' : 'Cancel'}
          </Button>
          {!uploadResult && previewData.length > 0 && (
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Upload {previewData.length} {entityName}(s)
                </>
              )}
            </Button>
          )}
          {uploadResult && uploadResult.success === previewData.length && (
            <Button onClick={() => handleOpenChange(false)}>
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Done
            </Button>
          )}
          {uploadResult && uploadResult.success < previewData.length && (
            <Button onClick={resetDialog}>
              Try Again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
