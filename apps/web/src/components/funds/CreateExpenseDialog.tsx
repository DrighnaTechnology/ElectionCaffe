import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { fundsAPI } from '../../services/api';
import { toast } from 'sonner';

interface CreateExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateExpenseDialog({ open, onOpenChange }: CreateExpenseDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    accountId: '',
    expenseCategory: 'CAMPAIGN_MATERIAL',
    description: '',
    amount: '',
    vendorName: '',
    vendorContact: '',
    invoiceNumber: '',
    paymentMethod: '',
    remarks: '',
  });

  const { data: accountsData } = useQuery({
    queryKey: ['fund-accounts-active'],
    queryFn: () => fundsAPI.getAccounts({ isActive: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => fundsAPI.createExpense(data),
    onSuccess: () => {
      toast.success('Expense submitted for approval');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['funds-summary'] });
      onOpenChange(false);
      setFormData({
        accountId: '',
        expenseCategory: 'CAMPAIGN_MATERIAL',
        description: '',
        amount: '',
        vendorName: '',
        vendorContact: '',
        invoiceNumber: '',
        paymentMethod: '',
        remarks: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit expense');
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
          <DialogTitle>Submit Expense Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="accountId">Fund Account *</Label>
                <Select value={formData.accountId} onValueChange={(value) => setFormData({ ...formData, accountId: value })} required>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>{account.accountName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseCategory">Category *</Label>
                <Select value={formData.expenseCategory} onValueChange={(value) => setFormData({ ...formData, expenseCategory: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAMPAIGN_MATERIAL">Campaign Material</SelectItem>
                    <SelectItem value="TRAVEL">Travel</SelectItem>
                    <SelectItem value="VENUE">Venue</SelectItem>
                    <SelectItem value="ADVERTISING">Advertising</SelectItem>
                    <SelectItem value="SALARY">Salary</SelectItem>
                    <SelectItem value="PRINTING">Printing</SelectItem>
                    <SelectItem value="TECHNOLOGY">Technology</SelectItem>
                    <SelectItem value="REFRESHMENTS">Refreshments</SelectItem>
                    <SelectItem value="OFFICE_SUPPLIES">Office Supplies</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={3} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendorName">Vendor Name</Label>
                <Input id="vendorName" value={formData.vendorName} onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendorContact">Vendor Contact</Label>
                <Input id="vendorContact" value={formData.vendorContact} onChange={(e) => setFormData({ ...formData, vendorContact: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input id="invoiceNumber" value={formData.invoiceNumber} onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
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
              {createMutation.isPending ? 'Submitting...' : 'Submit Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
