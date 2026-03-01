import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { fundsAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { SearchIcon, XIcon } from 'lucide-react';

const PAYMENT_MODES = ['CASH', 'UPI', 'NEFT', 'CHEQUE', 'CARD'];

export default function DonationsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const activeFilters = [search, accountId, paymentMode, startDate, endDate].filter(Boolean).length;

  const { data: accountsData } = useQuery({
    queryKey: ['fund-accounts-active'],
    queryFn: () => fundsAPI.getAccounts({ isActive: true }),
  });
  const accounts = accountsData?.data?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ['donations', page, search, accountId, paymentMode, startDate, endDate],
    queryFn: () => fundsAPI.getDonations({
      page, limit: 20,
      ...(search && { search }),
      ...(accountId && { accountId }),
      ...(paymentMode && { paymentMode }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    }),
  });

  const clearFilters = () => {
    setSearch('');
    setAccountId('');
    setPaymentMode('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const donations = data?.data?.data?.donations || [];
  const total = data?.data?.data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-muted/30 rounded-lg border">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Search</label>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Donor name, phone, receipt..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="min-w-[160px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Account</label>
          <Select value={accountId} onValueChange={(v) => { setAccountId(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>{a.accountName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[130px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment Mode</label>
          <Select value={paymentMode} onValueChange={(v) => { setPaymentMode(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Modes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              {PAYMENT_MODES.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">From Date</label>
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="h-9" />
        </div>

        <div className="min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">To Date</label>
          <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="h-9" />
        </div>

        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
            <XIcon className="h-4 w-4 mr-1" />
            Clear ({activeFilters})
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} donation{total !== 1 ? 's' : ''} found</span>
        {totalPages > 1 && <span>Page {page} of {totalPages}</span>}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-16 w-full" />))}</div>
      ) : donations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No donations found</p>
          {activeFilters > 0 && <p className="text-sm mt-1">Try adjusting your filters</p>}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((donation: any) => (
                <TableRow key={donation.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{donation.isAnonymous ? 'Anonymous' : donation.donorName}</p>
                      {!donation.isAnonymous && donation.donorContact && (
                        <p className="text-sm text-gray-500">{donation.donorContact}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">{formatCurrency(parseFloat(donation.amount))}</TableCell>
                  <TableCell><Badge variant="secondary">{donation.purpose || '-'}</Badge></TableCell>
                  <TableCell>{donation.paymentMode || '-'}</TableCell>
                  <TableCell>{formatDate(donation.donationDate)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{donation.receiptNo || '-'}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
