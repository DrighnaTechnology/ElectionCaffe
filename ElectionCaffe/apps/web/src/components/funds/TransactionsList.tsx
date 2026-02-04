import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { fundsAPI } from '../../services/api';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

export default function TransactionsList() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page],
    queryFn: () => fundsAPI.getTransactions({ page, limit: 20 }),
  });

  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-16 w-full" />))}</div>;
  }

  const transactions = data?.data?.data?.transactions || [];
  const total = data?.data?.data?.total || 0;

  if (transactions.length === 0) {
    return <div className="text-center py-12 text-gray-500"><p>No transactions found</p></div>;
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Balance After</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((txn: any) => (
            <TableRow key={txn.id}>
              <TableCell>
                <Badge variant={txn.transactionType === 'DONATION' ? 'default' : 'secondary'}>
                  {txn.transactionType === 'DONATION' ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
                  {txn.transactionType}
                </Badge>
              </TableCell>
              <TableCell>{txn.description}</TableCell>
              <TableCell className={`font-bold ${txn.transactionType === 'DONATION' ? 'text-green-600' : 'text-red-600'}`}>
                {txn.transactionType === 'DONATION' ? '+' : '-'}{formatCurrency(parseFloat(txn.amount))}
              </TableCell>
              <TableCell className="font-medium">{formatCurrency(parseFloat(txn.balanceAfter))}</TableCell>
              <TableCell className="text-sm text-gray-500">{formatDateTime(txn.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</Button>
          <Button variant="outline" onClick={() => setPage(page + 1)} disabled={page * 20 >= total}>Next</Button>
        </div>
      )}
    </div>
  );
}
