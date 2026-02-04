import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  WalletIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  PlusIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { fundsAPI } from '../services/api';
import { formatNumber, formatCurrency } from '../lib/utils';
import FundAccountsList from '../components/funds/FundAccountsList';
import DonationsList from '../components/funds/DonationsList';
import ExpensesList from '../components/funds/ExpensesList';
import TransactionsList from '../components/funds/TransactionsList';
import CreateFundAccountDialog from '../components/funds/CreateFundAccountDialog';
import CreateDonationDialog from '../components/funds/CreateDonationDialog';
import CreateExpenseDialog from '../components/funds/CreateExpenseDialog';

export default function FundsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [createDonationOpen, setCreateDonationOpen] = useState(false);
  const [createExpenseOpen, setCreateExpenseOpen] = useState(false);

  const { data: summary, isLoading: summaryLoading, refetch } = useQuery({
    queryKey: ['funds-summary'],
    queryFn: () => fundsAPI.getSummary(),
  });

  const summaryData = summary?.data?.data;

  if (summaryLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Balance',
      value: summaryData?.totalBalance || 0,
      icon: WalletIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      isCurrency: true,
    },
    {
      title: 'Donations (30 days)',
      value: summaryData?.donations?.last30Days || 0,
      icon: TrendingUpIcon,
      color: 'text-green-600',
      bg: 'bg-green-100',
      isCurrency: true,
      subtitle: `${summaryData?.donations?.count || 0} donations`,
    },
    {
      title: 'Expenses (Pending)',
      value: summaryData?.expenses?.pending?.amount || 0,
      icon: DollarSignIcon,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      isCurrency: true,
      subtitle: `${summaryData?.expenses?.pending?.count || 0} pending`,
    },
    {
      title: 'Expenses (Approved)',
      value: summaryData?.expenses?.approved?.amount || 0,
      icon: TrendingDownIcon,
      color: 'text-red-600',
      bg: 'bg-red-100',
      isCurrency: true,
      subtitle: `${summaryData?.expenses?.approved?.count || 0} approved`,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fund Management</h1>
          <p className="text-gray-500 mt-1">
            Manage accounts, donations, and expenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold">
                    {stat.isCurrency
                      ? formatCurrency(stat.value)
                      : formatNumber(stat.value)}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`p-3 rounded-full ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Account Summary */}
      {summaryData?.accounts && summaryData.accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Account Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summaryData.accounts.map((account: any) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-medium">{account.accountName}</p>
                      <p className="text-xs text-gray-500">
                        {account.accountType.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {formatCurrency(account.currentBalance)}
                    </p>
                    {account.isDefault && (
                      <Badge variant="outline" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      {summaryData?.recentTransactions &&
        summaryData.recentTransactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {summaryData.recentTransactions.map((txn: any) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-3 border-b last:border-b-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{txn.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(txn.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          txn.transactionType === 'DONATION'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {txn.transactionType === 'DONATION' ? '+' : '-'}
                        {formatCurrency(txn.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Balance: {formatCurrency(txn.balanceAfter)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="text-center py-8 text-gray-500">
            <p>Select a tab above to view detailed information</p>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setCreateAccountOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Account
            </Button>
          </div>
          <FundAccountsList />
        </TabsContent>

        <TabsContent value="donations" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setCreateDonationOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Record Donation
            </Button>
          </div>
          <DonationsList />
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setCreateExpenseOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Submit Expense
            </Button>
          </div>
          <ExpensesList />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <TransactionsList />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateFundAccountDialog
        open={createAccountOpen}
        onOpenChange={setCreateAccountOpen}
      />
      <CreateDonationDialog
        open={createDonationOpen}
        onOpenChange={setCreateDonationOpen}
      />
      <CreateExpenseDialog
        open={createExpenseOpen}
        onOpenChange={setCreateExpenseOpen}
      />
    </div>
  );
}
