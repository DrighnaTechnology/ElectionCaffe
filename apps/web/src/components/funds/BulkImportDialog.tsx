import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { fundsAPI } from '../../services/api';
import { toast } from 'sonner';
import { DownloadIcon, UploadIcon, FileSpreadsheetIcon, AlertCircleIcon, CheckCircle2Icon } from 'lucide-react';
import * as XLSX from 'xlsx';

type ImportType = 'donations' | 'expenses';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ImportType;
}

const DONATION_COLUMNS = [
  'donorName', 'amount', 'donorContact', 'donorEmail', 'donorAddress',
  'donorPan', 'paymentMode', 'paymentRef', 'donationDate', 'purpose',
  'remarks', 'isAnonymous',
];

const EXPENSE_COLUMNS = [
  'category', 'description', 'amount', 'vendorName', 'vendorContact',
  'paymentMode', 'paymentRef', 'expenseDate', 'invoiceNo',
];

function parseFile(buffer: ArrayBuffer): Record<string, string>[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows;
}

export default function BulkImportDialog({ open, onOpenChange, type }: BulkImportDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accountId, setAccountId] = useState('');
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; errors: { row: number; message: string }[] } | null>(null);

  const columns = type === 'donations' ? DONATION_COLUMNS : EXPENSE_COLUMNS;

  const { data: accountsData } = useQuery({
    queryKey: ['fund-accounts-active'],
    queryFn: () => fundsAPI.getAccounts({ isActive: true }),
  });

  const accounts = accountsData?.data?.data || [];

  const importMutation = useMutation({
    mutationFn: (data: { accountId: string; rows: any[] }) => {
      if (type === 'donations') {
        return fundsAPI.bulkImportDonations({ accountId: data.accountId, donations: data.rows });
      }
      return fundsAPI.bulkImportExpenses({ accountId: data.accountId, expenses: data.rows });
    },
    onSuccess: (res) => {
      const result = res?.data?.data;
      setImportResult(result);
      toast.success(result?.message || 'Import successful');
      queryClient.invalidateQueries({ queryKey: [type] });
      queryClient.invalidateQueries({ queryKey: ['funds-summary'] });
    },
    onError: (error: any) => {
      const errData = error.response?.data?.data;
      if (errData?.errors) {
        setImportResult({ imported: 0, errors: errData.errors });
      }
      toast.error(error.response?.data?.error || 'Import failed');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer;
        const rows = parseFile(buffer);
        setParsedRows(rows);
        if (rows.length === 0) {
          toast.error('No data rows found in file');
        }
      } catch {
        toast.error('Failed to parse file. Please use the XLSX template.');
        setParsedRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = () => {
    if (!accountId) {
      toast.error('Please select a fund account');
      return;
    }
    if (parsedRows.length === 0) {
      toast.error('No data to import');
      return;
    }
    importMutation.mutate({ accountId, rows: parsedRows });
  };

  const handleClose = () => {
    setParsedRows([]);
    setFileName('');
    setAccountId('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onOpenChange(false);
  };

  const templateUrl = type === 'donations'
    ? fundsAPI.getDonationTemplate()
    : fundsAPI.getExpenseTemplate();

  const displayColumns = columns.slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheetIcon className="h-5 w-5" />
            Bulk Import {type === 'donations' ? 'Donations' : 'Expenses'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1: Download template */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Step 1: Download Excel Template</p>
              <p className="text-xs text-muted-foreground">
                Fill in the template with your {type} data. Required: {type === 'donations' ? 'donorName, amount' : 'category, description, amount'}
              </p>
            </div>
            <a href={templateUrl} download>
              <Button variant="outline" size="sm">
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download .xlsx
              </Button>
            </a>
          </div>

          {/* Step 2: Select account */}
          <div className="space-y-2">
            <Label>Step 2: Select Fund Account *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account for this import" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account: any) => (
                  <SelectItem key={account.id} value={account.id}>{account.accountName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 3: Upload file */}
          <div className="space-y-2">
            <Label>Step 3: Upload Excel / CSV File</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <UploadIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              {fileName ? (
                <p className="text-sm font-medium">{fileName} — {parsedRows.length} rows</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click to select an Excel (.xlsx) or CSV file</p>
              )}
            </div>
          </div>

          {/* Preview table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Preview ({parsedRows.length} rows)</Label>
                {parsedRows.length > 10 && (
                  <span className="text-xs text-muted-foreground">Showing first 10 of {parsedRows.length}</span>
                )}
              </div>
              <div className="border rounded-lg overflow-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      {displayColumns.map((col) => (
                        <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                      ))}
                      {columns.length > 6 && <TableHead className="text-xs">...</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        {displayColumns.map((col) => (
                          <TableCell key={col} className="text-xs max-w-[150px] truncate">
                            {row[col] != null && row[col] !== '' ? String(row[col]) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        ))}
                        {columns.length > 6 && <TableCell className="text-xs text-muted-foreground">...</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className="space-y-2">
              {importResult.imported > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <CheckCircle2Icon className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-green-800">{importResult.imported} {type} imported successfully</span>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-sm text-red-800">
                    <AlertCircleIcon className="h-4 w-4 text-red-600 flex-shrink-0" />
                    {importResult.errors.length} rows skipped
                  </div>
                  <div className="max-h-[120px] overflow-auto">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-700">Row {err.row}: {err.message}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {importResult?.imported ? 'Close' : 'Cancel'}
          </Button>
          {!importResult?.imported && (
            <Button
              onClick={handleImport}
              disabled={!accountId || parsedRows.length === 0 || importMutation.isPending}
            >
              {importMutation.isPending ? 'Importing...' : `Import ${parsedRows.length} ${type}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
