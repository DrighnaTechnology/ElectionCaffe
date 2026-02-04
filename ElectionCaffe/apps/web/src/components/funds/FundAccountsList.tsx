import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MoreVerticalIcon,
  EditIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { fundsAPI } from '../../services/api';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

export default function FundAccountsList() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['fund-accounts', page],
    queryFn: () => fundsAPI.getAccounts({ page, limit: 20 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fundsAPI.deleteAccount(id),
    onSuccess: () => {
      toast.success('Account deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['fund-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['funds-summary'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete account');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const accounts = data?.data?.data?.accounts || [];
  const total = data?.data?.data?.total || 0;

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No fund accounts found</p>
        <p className="text-sm mt-1">Create your first fund account to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Bank Details</TableHead>
            <TableHead>Current Balance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account: any) => (
            <TableRow key={account.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{account.accountName}</p>
                  {account.accountNameLocal && (
                    <p className="text-sm text-gray-500">{account.accountNameLocal}</p>
                  )}
                  {account.isDefault && (
                    <Badge variant="outline" className="mt-1">
                      Default
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {account.accountType.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                {account.bankName ? (
                  <div className="text-sm">
                    <p>{account.bankName}</p>
                    {account.accountNumber && (
                      <p className="text-gray-500">
                        {account.accountNumber.slice(-4).padStart(
                          account.accountNumber.length,
                          '*'
                        )}
                      </p>
                    )}
                    {account.upiId && (
                      <p className="text-gray-500">{account.upiId}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell>
                <span className="font-bold text-lg">
                  {formatCurrency(parseFloat(account.currentBalance))}
                </span>
              </TableCell>
              <TableCell>
                {account.isActive ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircleIcon className="h-3 w-3 mr-1" />
                    Inactive
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVerticalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <EditIcon className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate(account.id)}
                      className="text-red-600"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page * 20 >= total}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
