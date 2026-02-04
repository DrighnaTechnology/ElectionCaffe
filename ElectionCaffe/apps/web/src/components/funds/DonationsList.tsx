import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { fundsAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../lib/utils';

export default function DonationsList() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['donations', page],
    queryFn: () => fundsAPI.getDonations({ page, limit: 20 }),
  });

  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-16 w-full" />))}</div>;
  }

  const donations = data?.data?.data?.donations || [];
  const total = data?.data?.data?.total || 0;

  if (donations.length === 0) {
    return <div className="text-center py-12 text-gray-500"><p>No donations found</p></div>;
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Donor</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {donations.map((donation: any) => (
            <TableRow key={donation.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{donation.isAnonymous ? 'Anonymous' : donation.donorName}</p>
                  {!donation.isAnonymous && donation.donorPhone && (
                    <p className="text-sm text-gray-500">{donation.donorPhone}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-bold">{formatCurrency(parseFloat(donation.amount))}</TableCell>
              <TableCell><Badge variant="secondary">{donation.donationType}</Badge></TableCell>
              <TableCell>{donation.paymentMethod || '-'}</TableCell>
              <TableCell>{formatDate(donation.donatedAt)}</TableCell>
              <TableCell>
                <Badge variant={donation.status === 'APPROVED' ? 'default' : 'secondary'}>
                  {donation.status}
                </Badge>
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
