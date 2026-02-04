import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { fundsAPI } from '../../services/api';
import { toast } from 'sonner';

interface CreateDonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateDonationDialog({ open, onOpenChange }: CreateDonationDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    accountId: '',
    donorName: '',
    donorEmail: '',
    donorPhone: '',
    donorAddress: '',
    donorPanNumber: '',
    isAnonymous: false,
    donationType: 'INDIVIDUAL',
    amount: '',
    paymentMethod: 'cash',
    transactionRef: '',
    purpose: '',
    remarks: '',
  });

  const { data: accountsData } = useQuery({
    queryKey: ['fund-accounts-active'],
    queryFn: () => fundsAPI.getAccounts({ isActive: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => fundsAPI.createDonation(data),
    onSuccess: () => {
      toast.success('Donation recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      queryClient.invalidateQueries({ queryKey: ['funds-summary'] });
      onOpenChange(false);
      setFormData({
        accountId: '',
        donorName: '',
        donorEmail: '',
        donorPhone: '',
        donorAddress: '',
        donorPanNumber: '',
        isAnonymous: false,
        donationType: 'INDIVIDUAL',
        amount: '',
        paymentMethod: 'cash',
        transactionRef: '',
        purpose: '',
        remarks: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to record donation');
    },
  });

  const accounts = accountsData?.data?.data?.accounts || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
    };
    createMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Donation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="accountId">Fund Account *</Label>
                <Select value={formData.accountId} onValueChange={(value) => setFormData({ ...formData, accountId: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>{account.accountName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="isAnonymous" checked={formData.isAnonymous} onCheckedChange={(checked) => setFormData({ ...formData, isAnonymous: checked as boolean })} />
                  <Label htmlFor="isAnonymous" className="cursor-pointer">Anonymous Donation</Label>
                </div>
              </div>

              {!formData.isAnonymous && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="donorName">Donor Name *</Label>
                    <Input id="donorName" value={formData.donorName} onChange={(e) => setFormData({ ...formData, donorName: e.target.value })} required={!formData.isAnonymous} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="donorPhone">Phone</Label>
                    <Input id="donorPhone" value={formData.donorPhone} onChange={(e) => setFormData({ ...formData, donorPhone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="donorEmail">Email</Label>
                    <Input id="donorEmail" type="email" value={formData.donorEmail} onChange={(e) => setFormData({ ...formData, donorEmail: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="donorPanNumber">PAN Number</Label>
                    <Input id="donorPanNumber" value={formData.donorPanNumber} onChange={(e) => setFormData({ ...formData, donorPanNumber: e.target.value })} />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="donationType">Donation Type *</Label>
                <Select value={formData.donationType} onValueChange={(value) => setFormData({ ...formData, donationType: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="CORPORATE">Corporate</SelectItem>
                    <SelectItem value="ANONYMOUS">Anonymous</SelectItem>
                    <SelectItem value="IN_KIND">In-Kind</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transactionRef">Transaction Reference</Label>
                <Input id="transactionRef" value={formData.transactionRef} onChange={(e) => setFormData({ ...formData, transactionRef: e.target.value })} placeholder="UTR/Cheque No." />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Input id="purpose" value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} placeholder="Campaign support" />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} rows={2} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Recording...' : 'Record Donation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
