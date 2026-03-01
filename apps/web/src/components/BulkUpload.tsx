import { useState, useRef, useMemo } from 'react';
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
  enum?: string[];
  pattern?: RegExp;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

interface FailedRow {
  rowNumber: number;
  data: Record<string, unknown>;
  reason: string;
}

interface UploadStats {
  totalRows: number;
  validRows: number;
  skippedRows: number;
  createdRows: number;
  backendFailedRows: number;
}

export interface BulkUploadProps {
  entityName: string;
  templateColumns: TemplateColumn[];
  onUpload: (data: Record<string, unknown>[]) => Promise<{
    success: number;
    failed: number;
    errors?: Array<string | { row: number; field?: string; error: string }>;
  }>;
  disabled?: boolean;
}

function validateRow(row: Record<string, unknown>, columns: TemplateColumn[]): string[] {
  const errors: string[] = [];

  for (const col of columns) {
    const value = row[col.key];
    const isEmpty = value === undefined || value === null || value === '';

    if (col.required && isEmpty) {
      errors.push(`"${col.label}" is required`);
      continue;
    }

    if (isEmpty) continue;

    if (col.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push(`"${col.label}" must be a number`);
        continue;
      }
      if (col.min !== undefined && num < col.min) {
        errors.push(`"${col.label}" must be >= ${col.min}`);
      }
      if (col.max !== undefined && num > col.max) {
        errors.push(`"${col.label}" must be <= ${col.max}`);
      }
    }

    const strValue = String(value);

    if (col.minLength !== undefined && strValue.length < col.minLength) {
      errors.push(`"${col.label}" must be at least ${col.minLength} characters`);
    }
    if (col.maxLength !== undefined && strValue.length > col.maxLength) {
      errors.push(`"${col.label}" must be at most ${col.maxLength} characters`);
    }

    if (col.enum) {
      const upper = strValue.toUpperCase().trim();
      if (!col.enum.map(e => e.toUpperCase()).includes(upper)) {
        errors.push(`"${col.label}" must be one of: ${col.enum.join(', ')}`);
      }
    }

    if (col.pattern && !col.pattern.test(strValue)) {
      errors.push(`"${col.label}" format is invalid`);
    }
  }

  return errors;
}

export function BulkUpload({ entityName, templateColumns, onUpload, disabled }: BulkUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [validRows, setValidRows] = useState<Record<string, unknown>[]>([]);
  const [validRowIndices, setValidRowIndices] = useState<number[]>([]);
  const [failedRows, setFailedRows] = useState<FailedRow[]>([]);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [allFailedRows, setAllFailedRows] = useState<FailedRow[]>([]);
  const [columnError, setColumnError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const failedIndices = useMemo(
    () => new Set(failedRows.map(fr => fr.rowNumber - 2)),
    [failedRows]
  );

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    const headers = templateColumns.map(col => col.label);
    const exampleRow = templateColumns.map(col => {
      if (col.example !== undefined) return col.example;
      if (col.type === 'number') return 0;
      if (col.type === 'date') return new Date().toISOString().split('T')[0];
      if (col.type === 'boolean') return 'Yes';
      return '';
    });

    const wsData = [headers, exampleRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = templateColumns.map(col => ({ wch: Math.max(col.label.length, 15) }));

    const instructionsData = [
      ['Bulk Upload Instructions'],
      [''],
      ['Column', 'Required', 'Type', 'Allowed Values', 'Description'],
      ...templateColumns.map(col => [
        col.label,
        col.required ? 'Yes' : 'No',
        col.type || 'string',
        col.enum
          ? col.enum.join(', ')
          : col.min !== undefined || col.max !== undefined
            ? `${col.min ?? ''}–${col.max ?? ''}`
            : col.pattern
              ? 'See description'
              : '',
        col.description || '',
      ]),
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 50 }];

    XLSX.utils.book_append_sheet(wb, ws, entityName);
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

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

      // Build case-insensitive header lookup
      const fileHeaders = Object.keys(jsonData[0]);
      const headerLookup = new Map<string, string>();
      fileHeaders.forEach(h => headerLookup.set(h.toLowerCase().trim(), h));

      // Validate required columns exist
      const requiredCols = templateColumns.filter(c => c.required);
      const missingCols = requiredCols.filter(
        c => !headerLookup.has(c.label.toLowerCase().trim())
      );

      if (missingCols.length > 0) {
        setColumnError(
          `Missing required columns: ${missingCols.map(c => c.label).join(', ')}. Please use the provided template.`
        );
        setPreviewData([]);
        setValidRows([]);
        setFailedRows([]);
        return;
      }

      setColumnError(null);

      // Map column labels to keys (case-insensitive)
      const mappedData = jsonData.map(row => {
        const mappedRow: Record<string, unknown> = {};
        templateColumns.forEach(col => {
          const originalHeader = headerLookup.get(col.label.toLowerCase().trim());
          const value = originalHeader ? row[originalHeader] : undefined;
          if (value !== undefined && value !== '') {
            if (col.type === 'number') {
              mappedRow[col.key] =
                typeof value === 'string' ? parseFloat(value) || 0 : Number(value);
            } else if (col.type === 'boolean') {
              mappedRow[col.key] =
                value === 'Yes' || value === 'true' || value === true || value === 1;
            } else {
              // Ensure string type for non-numeric columns
              mappedRow[col.key] = String(value);
            }
          }
        });
        return mappedRow;
      });

      // Validate each row
      const valid: Record<string, unknown>[] = [];
      const indices: number[] = [];
      const failed: FailedRow[] = [];

      mappedData.forEach((row, index) => {
        const errors = validateRow(row, templateColumns);
        if (errors.length > 0) {
          failed.push({
            rowNumber: index + 2, // +2: row 1 is header, data starts at row 2
            data: row,
            reason: errors.join('; '),
          });
        } else {
          valid.push(row);
          indices.push(index);
        }
      });

      setPreviewData(mappedData);
      setValidRows(valid);
      setValidRowIndices(indices);
      setFailedRows(failed);
      setUploadStats(null);
      setAllFailedRows([]);

      if (failed.length > 0 && valid.length > 0) {
        toast.warning(
          `${failed.length} of ${mappedData.length} rows have validation errors and will be skipped`
        );
      } else if (failed.length > 0 && valid.length === 0) {
        toast.error('All rows have validation errors. Please fix and re-upload.');
      }
    } catch {
      toast.error('Failed to read file. Please ensure it is a valid Excel file.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (validRows.length === 0) {
      toast.error('No valid rows to upload');
      return;
    }

    setUploading(true);
    try {
      const result = await onUpload(validRows);

      // Map backend errors to FailedRow entries
      const backendFailed: FailedRow[] = [];
      if (result.errors && result.errors.length > 0) {
        for (const err of result.errors) {
          if (typeof err === 'string') {
            backendFailed.push({ rowNumber: 0, data: {}, reason: err });
          } else {
            const dataIdx = err.row - 1;
            const previewIdx = validRowIndices[dataIdx];
            backendFailed.push({
              rowNumber: previewIdx !== undefined ? previewIdx + 2 : 0,
              data: previewIdx !== undefined ? previewData[previewIdx] : {},
              reason: `${err.field ? err.field + ': ' : ''}${err.error}`,
            });
          }
        }
      }

      const combined = [...failedRows, ...backendFailed];
      setAllFailedRows(combined);

      setUploadStats({
        totalRows: previewData.length,
        validRows: validRows.length,
        skippedRows: failedRows.length,
        createdRows: result.success,
        backendFailedRows: result.failed,
      });

      if (result.success > 0) {
        toast.success(`Successfully created ${result.success} ${entityName.toLowerCase()}(s)`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} row(s) rejected by server`);
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Upload failed';
      // All valid rows treated as failed when upload throws
      const backendFailed: FailedRow[] = validRows.map((_, i) => ({
        rowNumber: validRowIndices[i] + 2,
        data: previewData[validRowIndices[i]],
        reason: `Server error: ${errorMsg}`,
      }));
      const combined = [...failedRows, ...backendFailed];
      setAllFailedRows(combined);

      setUploadStats({
        totalRows: previewData.length,
        validRows: validRows.length,
        skippedRows: failedRows.length,
        createdRows: 0,
        backendFailedRows: validRows.length,
      });

      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const downloadFailureReport = () => {
    if (allFailedRows.length === 0) return;

    const wb = XLSX.utils.book_new();
    const headers = ['Row #', ...templateColumns.map(c => c.label), 'Reason'];
    const rows = allFailedRows.map(fr => [
      fr.rowNumber || '-',
      ...templateColumns.map(c => fr.data[c.key] ?? ''),
      fr.reason,
    ]);

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(String(h).length, 15) }));

    XLSX.utils.book_append_sheet(wb, ws, 'Failed Rows');
    XLSX.writeFile(wb, `${entityName.toLowerCase().replace(/\s+/g, '-')}-upload-failures.xlsx`);
    toast.success('Failure report downloaded');
  };

  const resetDialog = () => {
    setPreviewData([]);
    setValidRows([]);
    setValidRowIndices([]);
    setFailedRows([]);
    setUploadStats(null);
    setAllFailedRows([]);
    setColumnError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetDialog();
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
            <Button variant="outline" onClick={downloadTemplate} className="bg-card">
              <DownloadIcon className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Step 2: Upload File */}
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <h3 className="font-medium text-foreground mb-2">Step 2: Upload Filled File</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Select your filled Excel file (.xlsx or .xls)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
          </div>

          {/* Column Mismatch Error */}
          {columnError && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="h-4 w-4 text-red-600 shrink-0" />
                <span className="text-sm text-red-700">{columnError}</span>
              </div>
            </div>
          )}

          {/* Preview Data with Validation */}
          {previewData.length > 0 && !uploadStats && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Preview ({previewData.length} rows)</h3>
                <div className="flex gap-2">
                  {validRows.length > 0 && (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      {validRows.length} valid
                    </Badge>
                  )}
                  {failedRows.length > 0 && (
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                      <XCircleIcon className="h-3 w-3 mr-1" />
                      {failedRows.length} invalid
                    </Badge>
                  )}
                </div>
              </div>

              {/* Validation Errors List */}
              {failedRows.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200 max-h-[150px] overflow-y-auto">
                  <p className="text-sm font-medium text-red-700 mb-1">
                    Validation Errors (these rows will be skipped):
                  </p>
                  <ul className="text-xs text-red-600 space-y-0.5">
                    {failedRows.slice(0, 15).map((fr, i) => (
                      <li key={i}>
                        Row {fr.rowNumber}: {fr.reason}
                      </li>
                    ))}
                    {failedRows.length > 15 && (
                      <li className="text-red-500 font-medium">
                        ... and {failedRows.length - 15} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div className="border rounded-lg overflow-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead className="w-[60px]">Status</TableHead>
                      {templateColumns.slice(0, 4).map(col => (
                        <TableHead key={col.key}>
                          {col.label}
                          {col.required && <span className="text-red-500 ml-0.5">*</span>}
                        </TableHead>
                      ))}
                      {templateColumns.length > 4 && (
                        <TableHead>+{templateColumns.length - 4} more</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 10).map((row, index) => {
                      const isFailed = failedIndices.has(index);
                      return (
                        <TableRow key={index} className={isFailed ? 'bg-red-50/50' : ''}>
                          <TableCell className="font-medium text-xs">{index + 2}</TableCell>
                          <TableCell>
                            {isFailed ? (
                              <XCircleIcon className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            )}
                          </TableCell>
                          {templateColumns.slice(0, 4).map(col => (
                            <TableCell key={col.key} className="max-w-[150px] truncate text-xs">
                              {String(row[col.key] ?? '-')}
                            </TableCell>
                          ))}
                          {templateColumns.length > 4 && (
                            <TableCell className="text-muted-foreground text-xs">...</TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {previewData.length > 10 && (
                      <TableRow>
                        <TableCell
                          colSpan={templateColumns.slice(0, 4).length + 3}
                          className="text-center text-muted-foreground text-xs"
                        >
                          ... and {previewData.length - 10} more rows
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Upload Stats Result */}
          {uploadStats && (
            <div className="space-y-4">
              <h3 className="font-medium">Upload Summary</h3>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center border">
                  <div className="text-2xl font-bold text-foreground">
                    {uploadStats.totalRows}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Rows</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center border border-green-200">
                  <div className="text-2xl font-bold text-green-700">
                    {uploadStats.createdRows}
                  </div>
                  <div className="text-xs text-green-600">Created</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg text-center border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-700">
                    {uploadStats.skippedRows}
                  </div>
                  <div className="text-xs text-yellow-600">Validation Skipped</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center border border-red-200">
                  <div className="text-2xl font-bold text-red-700">
                    {uploadStats.backendFailedRows}
                  </div>
                  <div className="text-xs text-red-600">Server Rejected</div>
                </div>
              </div>

              {/* Success message */}
              {uploadStats.createdRows === uploadStats.totalRows && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <p className="text-green-700 font-medium">All rows uploaded successfully!</p>
                </div>
              )}

              {/* Failure Report Download */}
              {allFailedRows.length > 0 && (
                <div className="p-4 bg-brand-muted rounded-lg border border-brand/30">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-brand">
                        {allFailedRows.length} row(s) failed
                      </p>
                      <p className="text-sm text-brand mt-0.5">
                        Download the failure report to review errors and re-upload corrected data
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadFailureReport}
                      className="shrink-0"
                    >
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Download Failure Report
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {uploadStats ? 'Close' : 'Cancel'}
          </Button>
          {!uploadStats && previewData.length > 0 && (
            <Button onClick={handleUpload} disabled={uploading || validRows.length === 0}>
              {uploading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Upload {validRows.length} Valid {entityName}(s)
                </>
              )}
            </Button>
          )}
          {uploadStats && allFailedRows.length > 0 && (
            <Button onClick={resetDialog}>Try Again</Button>
          )}
          {uploadStats && uploadStats.createdRows === uploadStats.totalRows && (
            <Button onClick={() => handleOpenChange(false)}>
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
