import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { fundsAPI } from '../../services/api';
import { toast } from 'sonner';

interface CreateFundAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateFundAccountDialog({ open, onOpenChange }: CreateFundAccountDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    accountName: '',
    accountNameLocal: '',
    accountType: 'main',
    description: '',
    currentBalance: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    isDefault: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => fundsAPI.createAccount(data),
    onSuccess: () => {
      toast.success('Fund account created successfully');
      queryClient.invalidateQueries({ queryKey: ['fund-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['funds-summary'] });
      onOpenChange(false);
      setFormData({
        accountName: '',
        accountNameLocal: '',
        accountType: 'main',
        description: '',
        currentBalance: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        upiId: '',
        isDefault: false,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create account');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      currentBalance: formData.currentBalance ? parseFloat(formData.currentBalance) : 0,
    };
    createMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Fund Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name *</Label>
                <Input
                  id="accountName"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  required
                  placeholder="Main Campaign Fund"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNameLocal">Account Name (Local)</Label>
                <Input
                  id="accountNameLocal"
                  value={formData.accountNameLocal}
                  onChange={(e) => setFormData({ ...formData, accountNameLocal: e.target.value })}
                  placeholder="मुख्य अभियान निधि"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type *</Label>
                <Select
                  value={formData.accountType}
                  onValueChange={(value) => setFormData({ ...formData, accountType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main</SelectItem>
                    <SelectItem value="campaign">Campaign</SelectItem>
                    <SelectItem value="constituency">Constituency</SelectItem>
                    <SelectItem value="election">Election</SelectItem>
                    <SelectItem value="petty_cash">Petty Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentBalance">Initial Balance</Label>
                <Input
                  id="currentBalance"
                  type="number"
                  step="0.01"
                  value={formData.currentBalance}
                  onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Account purpose and details"
                rows={3}
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">Bank Details (Optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="State Bank of India"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                    placeholder="SBIN0001234"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upiId">UPI ID</Label>
                  <Input
                    id="upiId"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    placeholder="account@bank"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <Checkbox
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked as boolean })}
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Set as default account
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
