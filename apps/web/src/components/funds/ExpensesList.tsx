import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { fundsAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'sonner';

export default function ExpensesList() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', page],
    queryFn: () => fundsAPI.getExpenses({ page, limit: 20 }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => fundsAPI.updateExpenseStatus(id, 'APPROVED'),
    onSuccess: () => {
      toast.success('Expense approved');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['funds-summary'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => fundsAPI.updateExpenseStatus(id, 'REJECTED', 'Rejected by admin'),
    onSuccess: () => {
      toast.success('Expense rejected');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-16 w-full" />))}</div>;
  }

  const expenses = data?.data?.data?.expenses || [];
  const total = data?.data?.data?.total || 0;

  if (expenses.length === 0) {
    return <div className="text-center py-12 text-gray-500"><p>No expenses found</p></div>;
  }

  return (
    <div className="space-y-4">
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
              <TableCell><Badge variant="secondary">{expense.expenseCategory}</Badge></TableCell>
              <TableCell className="font-bold">{formatCurrency(parseFloat(expense.amount))}</TableCell>
              <TableCell>{expense.vendorName || '-'}</TableCell>
              <TableCell>{formatDate(expense.expenseDate)}</TableCell>
              <TableCell>
                <Badge variant={
                  expense.status === 'APPROVED' ? 'default' :
                  expense.status === 'REJECTED' ? 'destructive' : 'secondary'
                }>
                  {expense.status}
                </Badge>
              </TableCell>
              <TableCell>
                {expense.status === 'PENDING' && (
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
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</Button>
          <Button variant="outline" onClick={() => setPage(page + 1)} disabled={page * 20 >= total}>Next</Button>
        </div>
      )}
    </div>
  );
}
