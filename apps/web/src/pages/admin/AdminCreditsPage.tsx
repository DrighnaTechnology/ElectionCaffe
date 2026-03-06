import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { aiAPI } from '../../services/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { formatNumber } from '../../lib/utils';
import {
  SparklesIcon,
  CreditCardIcon,
} from 'lucide-react';

import { PurchaseCreditsModal } from './shared/PurchaseCreditsModal';

// Animated circular progress component using theme colors
function CreditCircle({
  percentage,
  remaining,
  total,
}: {
  percentage: number;
  remaining: number;
  total: number;
}) {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPercent(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const size = 200;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const remainingPercent = 100 - animatedPercent;
  const offset = circumference - (remainingPercent / 100) * circumference;

  // Color based on remaining percentage
  const getColor = () => {
    if (remainingPercent > 60) return { stroke: 'hsl(var(--brand-primary))', bg: 'hsl(var(--brand-primary) / 0.12)' };
    if (remainingPercent > 30) return { stroke: 'hsl(36 95% 50%)', bg: 'hsl(36 95% 50% / 0.12)' };
    return { stroke: 'hsl(var(--destructive))', bg: 'hsl(var(--destructive) / 0.12)' };
  };

  const colors = getColor();

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.bg}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color: colors.stroke }}>
          {Math.round(remainingPercent)}%
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">remaining</span>
      </div>
    </div>
  );
}

export function AdminCreditsPage() {
  const queryClient = useQueryClient();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Fetch AI credits
  const { data: creditsData } = useQuery({
    queryKey: ['admin-ai-credits'],
    queryFn: () => aiAPI.getCredits(),
    refetchInterval: 30000,
  });

  const credits = creditsData?.data?.data;
  const creditBalance = credits?.balance ?? 0;
  const totalCredits = credits?.totalCredits ?? 0;
  const usedCredits = credits?.usedCredits ?? 0;
  const bonusCredits = credits?.bonusCredits ?? 0;
  const totalPool = totalCredits + bonusCredits;
  const usedPercent = totalPool > 0 ? Math.round((usedCredits / totalPool) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">AI Credits</h1>
          <p className="text-muted-foreground">
            Manage your CaffeAI credit balance and purchases
          </p>
        </div>
        <Button
          onClick={() => setShowPurchaseModal(true)}
          className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
        >
          <CreditCardIcon className="h-4 w-4" />
          Buy Credits
        </Button>
      </div>

      {/* Main Credits Card with Circle */}
      <Card className="overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Animated Circle */}
            <div className="flex-shrink-0">
              <CreditCircle
                percentage={usedPercent}
                remaining={creditBalance}
                total={totalPool}
              />
            </div>

            {/* Credit Details */}
            <div className="flex-1 w-full space-y-5">
              {/* Available Balance */}
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[hsl(var(--brand-primary)/0.1)]">
                  <SparklesIcon className="h-7 w-7 text-[hsl(var(--brand-primary))]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Available Balance</p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-4xl font-black text-foreground">{formatNumber(creditBalance)}</span>
                    <span className="text-sm text-muted-foreground">credits</span>
                  </div>
                </div>
              </div>

              {/* Usage bar */}
              {totalPool > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{usedPercent}% used</span>
                    <span>{formatNumber(creditBalance)} remaining</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-[hsl(var(--brand-primary))] transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(usedPercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Purchased</p>
            <p className="text-2xl font-black mt-1">{formatNumber(totalCredits)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Used</p>
            <p className="text-2xl font-black mt-1 text-destructive">{formatNumber(usedCredits)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Bonus Credits</p>
            <p className="text-2xl font-black mt-1 text-emerald-600">{formatNumber(bonusCredits)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Credits Modal */}
      <PurchaseCreditsModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-ai-credits'] });
          queryClient.invalidateQueries({ queryKey: ['ai-credits-header'] });
        }}
      />
    </div>
  );
}
