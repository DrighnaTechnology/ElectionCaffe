import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth';
import { aiAPI } from '../../../services/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { Spinner } from '../../../components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { formatNumber } from '../../../lib/utils';
import { toast } from 'sonner';
import {
  SparklesIcon,
  CreditCardIcon,
  GiftIcon,
  TrendingUpIcon,
  ClockIcon,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function PurchaseCreditsModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { user } = useAuthStore();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ['credit-packages'],
    queryFn: () => aiAPI.getCreditPackages(),
    enabled: open,
  });

  const packages = packagesData?.data?.data || [];

  const createOrderMutation = useMutation({
    mutationFn: (packageId: string) => aiAPI.createPurchaseOrder(packageId),
  });

  const verifyMutation = useMutation({
    mutationFn: (data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      packageId: string;
    }) => aiAPI.verifyPurchase(data),
  });

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePurchase = async (pkg: any) => {
    setPurchasing(pkg.id);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load payment gateway. Please try again.');
        setPurchasing(null);
        return;
      }

      const orderRes = await createOrderMutation.mutateAsync(pkg.id);
      const order = orderRes.data?.data;

      if (!order?.orderId || !order?.keyId) {
        toast.error('Failed to create payment order. Payment gateway may not be configured.');
        setPurchasing(null);
        return;
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'ElectionCaffe',
        description: `${order.packageName} — ${order.credits} credits${order.bonusCredits ? ` + ${order.bonusCredits} bonus` : ''}`,
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            await verifyMutation.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              packageId: pkg.id,
            });
            toast.success('Credits purchased successfully!');
            onSuccess();
            onOpenChange(false);
          } catch {
            toast.error('Payment verification failed. Please contact support.');
          }
          setPurchasing(null);
        },
        modal: {
          ondismiss: () => {
            setPurchasing(null);
          },
        },
        prefill: {
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: user?.email || '',
          contact: user?.mobile || '',
        },
        theme: {
          color: '#d97706',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to initiate payment');
      setPurchasing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-amber-600" />
            Purchase AI Credits
          </DialogTitle>
          <DialogDescription>
            Choose a credit package to power your CaffeAI features
          </DialogDescription>
        </DialogHeader>

        {packagesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full rounded-xl" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCardIcon className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No credit packages available at the moment</p>
            <p className="text-xs text-muted-foreground mt-1">Please contact your administrator</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {packages.map((pkg: any) => (
              <Card
                key={pkg.id}
                className={`relative overflow-hidden transition-all hover:shadow-lg ${
                  pkg.isPopular ? 'border-amber-400 border-2 shadow-amber-100' : ''
                }`}
              >
                {pkg.isPopular && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    POPULAR
                  </div>
                )}

                <CardContent className="p-5">
                  <h3 className="font-bold text-lg">{pkg.displayName || pkg.packageName}</h3>
                  {pkg.description && (
                    <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-semibold">{formatNumber(pkg.credits)} credits</span>
                    </div>

                    {pkg.bonusCredits > 0 && (
                      <div className="flex items-center gap-2">
                        <GiftIcon className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-emerald-600 font-medium">+{formatNumber(pkg.bonusCredits)} bonus</span>
                      </div>
                    )}

                    {pkg.discountPercent > 0 && (
                      <div className="flex items-center gap-2">
                        <TrendingUpIcon className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-blue-600 font-medium">{pkg.discountPercent}% off</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Valid for {pkg.validityDays} days</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-black">
                        {pkg.currency === 'INR' ? '\u20B9' : '$'}{Number(pkg.price).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      className="w-full gap-2"
                      variant={pkg.isPopular ? 'default' : 'outline'}
                      disabled={purchasing !== null}
                      onClick={() => handlePurchase(pkg)}
                    >
                      {purchasing === pkg.id ? (
                        <>
                          <Spinner size="sm" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCardIcon className="h-4 w-4" />
                          Buy Now
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
