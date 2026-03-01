import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { fundsAPI } from '../../services/api';
import { formatCurrency } from '../../lib/utils';
import {
  WalletIcon, TrendingUpIcon, TrendingDownIcon, ArrowUpIcon,
  ArrowDownIcon, CrownIcon, UsersIcon, TagIcon, BarChart3Icon,
} from 'lucide-react';

const PERIODS = [
  { value: 'monthly', label: 'This Month' },
  { value: 'quarterly', label: 'This Quarter' },
  { value: 'half-yearly', label: 'Half Year' },
  { value: 'yearly', label: 'This Year' },
] as const;

export default function FundOverview() {
  const [period, setPeriod] = useState('monthly');

  const { data, isLoading } = useQuery({
    queryKey: ['funds-overview', period],
    queryFn: () => fundsAPI.getOverview({ period }),
  });

  const d = data?.data?.data;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (!d) {
    return <p className="text-center py-8 text-muted-foreground">No data available</p>;
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Period:</span>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(d.totalBalance)}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-100">
                <WalletIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Period Donations */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Donations</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(d.periodDonations)}</p>
                <p className="text-xs text-muted-foreground mt-1">{d.periodDonationCount} donations</p>
              </div>
              <div className="p-2 rounded-full bg-green-100">
                <TrendingUpIcon className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Period Expenses */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Expenses (Approved)</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{formatCurrency(d.periodExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">{d.periodExpenseCount} expenses</p>
              </div>
              <div className="p-2 rounded-full bg-red-100">
                <TrendingDownIcon className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net (Donation - Expense) */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Net (In - Out)</p>
                <p className={`text-2xl font-bold mt-1 ${d.periodNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {d.periodNet >= 0 ? '+' : ''}{formatCurrency(d.periodNet)}
                </p>
              </div>
              <div className={`p-2 rounded-full ${d.periodNet >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {d.periodNet >= 0
                  ? <ArrowUpIcon className="h-5 w-5 text-green-600" />
                  : <ArrowDownIcon className="h-5 w-5 text-red-600" />
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* All-Time Donations */}
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">All-Time Donations</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(d.totalDonationsAllTime)}</p>
          </CardContent>
        </Card>

        {/* All-Time Expenses */}
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">All-Time Expenses</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(d.totalExpensesAllTime)}</p>
          </CardContent>
        </Card>

        {/* Highest Donation */}
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Highest Donation</p>
            {d.highestDonation ? (
              <>
                <p className="text-lg font-bold mt-1">{formatCurrency(d.highestDonation.amount)}</p>
                <p className="text-xs text-muted-foreground mt-1">by {d.highestDonation.donor}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No donations yet</p>
            )}
          </CardContent>
        </Card>

        {/* Average Donation */}
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Average Donation</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(d.averageDonation)}</p>
            {d.periodPendingCount > 0 && (
              <p className="text-xs text-orange-600 mt-1">{d.periodPendingCount} pending ({formatCurrency(d.periodPendingExpenses)})</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Top Donors + Top Categories + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Donors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CrownIcon className="h-4 w-4 text-yellow-500" />
              Top Donors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.topDonors && d.topDonors.length > 0 ? (
              <div className="space-y-3">
                {d.topDonors.map((donor: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-100 text-gray-700' :
                        'bg-orange-50 text-orange-700'
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{donor.name}</p>
                        <p className="text-[10px] text-muted-foreground">{donor.count} donations</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(donor.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No donors in this period</p>
            )}
          </CardContent>
        </Card>

        {/* Top Expense Categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TagIcon className="h-4 w-4 text-blue-500" />
              Top Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.topExpenseCategories && d.topExpenseCategories.length > 0 ? (
              <div className="space-y-3">
                {d.topExpenseCategories.map((cat: any, i: number) => {
                  const maxTotal = d.topExpenseCategories[0]?.total || 1;
                  const pct = (cat.total / maxTotal) * 100;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{cat.category}</span>
                        <span className="text-sm font-bold text-red-600">{formatCurrency(cat.total)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{cat.count} expenses</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No expenses in this period</p>
            )}
          </CardContent>
        </Card>

        {/* 6-Month Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3Icon className="h-4 w-4 text-purple-500" />
              6-Month Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.monthlyTrend && d.monthlyTrend.length > 0 ? (
              <div className="space-y-2">
                {d.monthlyTrend.map((m: any, i: number) => {
                  const maxVal = Math.max(
                    ...d.monthlyTrend.map((t: any) => Math.max(t.donations, t.expenses)),
                    1
                  );
                  const donPct = (m.donations / maxVal) * 100;
                  const expPct = (m.expenses / maxVal) * 100;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium w-16">{m.month}</span>
                        <div className="flex gap-3 text-[10px]">
                          <span className="text-green-600">+{formatCurrency(m.donations)}</span>
                          <span className="text-red-600">-{formatCurrency(m.expenses)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div className="flex-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-400 rounded-full" style={{ width: `${donPct}%` }} />
                        </div>
                        <div className="flex-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: `${expPct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Donations</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Expenses</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No trend data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
