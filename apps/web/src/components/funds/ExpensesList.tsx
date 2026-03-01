import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { fundsAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'sonner';
import { SearchIcon, XIcon } from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'ADVERTISEMENT', 'RALLY', 'TRAVEL', 'FOOD', 'PRINTING',
  'OFFICE', 'TRANSPORT', 'EQUIPMENT', 'WAGES', 'MISC',
  'FUEL', 'RENT', 'TELECOM',
];
const STATUSES = ['pending', 'approved', 'rejected'];

export default function ExpensesList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const queryClient = useQueryClient();
  const activeFilters = [search, accountId, category, status, startDate, endDate].filter(Boolean).length;

  const { data: accountsData } = useQuery({
    queryKey: ['fund-accounts-active'],
    queryFn: () => fundsAPI.getAccounts({ isActive: true }),
  });
  const accounts = accountsData?.data?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', page, search, accountId, category, status, startDate, endDate],
    queryFn: () => fundsAPI.getExpenses({
      page, limit: 20,
      ...(search && { search }),
      ...(accountId && { accountId }),
      ...(category && { category }),
      ...(status && { status }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => fundsAPI.updateExpenseStatus(id, 'approved'),
    onSuccess: () => {
      toast.success('Expense approved');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['funds-summary'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => fundsAPI.updateExpenseStatus(id, 'rejected', 'Rejected by admin'),
    onSuccess: () => {
      toast.success('Expense rejected');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  const clearFilters = () => {
    setSearch('');
    setAccountId('');
    setCategory('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const expenses = data?.data?.data?.expenses || [];
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
              placeholder="Description, vendor, invoice..."
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

        <div className="min-w-[150px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
          <Select value={category} onValueChange={(v) => { setCategory(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[120px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
          <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
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
        <span>{total} expense{total !== 1 ? 's' : ''} found</span>
        {totalPages > 1 && <span>Page {page} of {totalPages}</span>}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-16 w-full" />))}</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No expenses found</p>
          {activeFilters > 0 && <p className="text-sm mt-1">Try adjusting your filters</p>}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense: any) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell><Badge variant="secondary">{expense.category}</Badge></TableCell>
                  <TableCell className="font-bold">{formatCurrency(parseFloat(expense.amount))}</TableCell>
                  <TableCell>{expense.vendorName || '-'}</TableCell>
                  <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      expense.status?.toLowerCase() === 'approved' ? 'default' :
                      expense.status?.toLowerCase() === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {expense.status?.toUpperCase() || 'PENDING'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {expense.status?.toLowerCase() === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveMutation.mutate(expense.id)}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(expense.id)}>Reject</Button>
                      </div>
                    )}
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
