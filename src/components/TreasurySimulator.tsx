"use client";
import React, { useState } from 'react';
import { ArrowRightLeft, Calendar, DollarSign, TrendingUp, Eye, EyeOff } from 'lucide-react';

// Type definitions
type Currency = 'KES' | 'USD' | 'NGN';

interface Account {
  id: string;
  name: string;
  currency: Currency;
  balance: number;
}

interface Transaction {
  id: string;
  timestamp: string;
  fromAccount: string;
  toAccount: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  amount: number;
  convertedAmount: number;
  fxRate: number;
  note: string;
  scheduledDate: string | null;
  status: 'Completed' | 'Scheduled';
}

interface TransferForm {
  fromAccount: string;
  toAccount: string;
  amount: string;
  note: string;
  scheduledDate: string;
}

interface Filters {
  account: string;
  currency: string;
  dateFrom: string;
  dateTo: string;
}

interface FXRates {
  [key: string]: number;
}

type CurrencyTotals = {
  [key in Currency]?: number;
};

const TreasurySimulator: React.FC = () => {
  // Static FX rates for conversions
  const FX_RATES: FXRates = {
    'KES-USD': 0.0067,
    'USD-KES': 149.25,
    'KES-NGN': 0.27,
    'NGN-KES': 3.70,
    'USD-NGN': 1580.00,
    'NGN-USD': 0.00063
  };

  // Initial accounts setup
  const initialAccounts: Account[] = [
    { id: 'mpesa_kes_1', name: 'Mpesa_KES_1', currency: 'KES', balance: 2500000 },
    { id: 'mpesa_kes_2', name: 'Mpesa_KES_2', currency: 'KES', balance: 1800000 },
    { id: 'bank_kes_1', name: 'Bank_KES_1', currency: 'KES', balance: 5200000 },
    { id: 'bank_usd_1', name: 'Bank_USD_1', currency: 'USD', balance: 45000 },
    { id: 'bank_usd_2', name: 'Bank_USD_2', currency: 'USD', balance: 78000 },
    { id: 'bank_usd_3', name: 'Bank_USD_3', currency: 'USD', balance: 32000 },
    { id: 'flutterwave_ngn_1', name: 'Flutterwave_NGN_1', currency: 'NGN', balance: 15000000 },
    { id: 'flutterwave_ngn_2', name: 'Flutterwave_NGN_2', currency: 'NGN', balance: 8500000 },
    { id: 'paystack_ngn_1', name: 'Paystack_NGN_1', currency: 'NGN', balance: 12000000 },
    { id: 'wise_usd_1', name: 'Wise_USD_1', currency: 'USD', balance: 95000 }
  ];

  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transferForm, setTransferForm] = useState<TransferForm>({
    fromAccount: '',
    toAccount: '',
    amount: '',
    note: '',
    scheduledDate: ''
  });
  const [filters, setFilters] = useState<Filters>({
    account: '',
    currency: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const formatCurrency = (amount: number, currency: Currency): string => {
    const formatters: Record<Currency, Intl.NumberFormat> = {
      KES: new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }),
      USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
      NGN: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' })
    };
    return formatters[currency]?.format(amount) || `${currency} ${amount.toLocaleString()}`;
  };

  const calculateFXConversion = (amount: number, fromCurrency: Currency, toCurrency: Currency): number | null => {
    if (fromCurrency === toCurrency) return amount;
    const rateKey = `${fromCurrency}-${toCurrency}`;
    const rate = FX_RATES[rateKey];
    if (!rate) return null;
    return amount * rate;
  };

  const handleTransfer = (): void => {
    setError('');
    setSuccess('');

    if (!transferForm.fromAccount || !transferForm.toAccount || !transferForm.amount) {
      setError('Please fill in all required fields');
      return;
    }

    if (transferForm.fromAccount === transferForm.toAccount) {
      setError('Source and destination accounts must be different');
      return;
    }

    const amount = parseFloat(transferForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const fromAccount = accounts.find(acc => acc.id === transferForm.fromAccount);
    const toAccount = accounts.find(acc => acc.id === transferForm.toAccount);

    if (!fromAccount || !toAccount) {
      setError('Invalid account selection');
      return;
    }

    if (fromAccount.balance < amount) {
      setError('Insufficient balance in source account');
      return;
    }

    // Calculate conversion if currencies differ
    let convertedAmount = amount;
    let fxRate = 1;
    if (fromAccount.currency !== toAccount.currency) {
      const converted = calculateFXConversion(amount, fromAccount.currency, toAccount.currency);
      if (!converted) {
        setError('Currency conversion not supported for this pair');
        return;
      }
      convertedAmount = converted;
      fxRate = convertedAmount / amount;
    }

    // Update accounts
    const updatedAccounts = accounts.map(acc => {
      if (acc.id === transferForm.fromAccount) {
        return { ...acc, balance: acc.balance - amount };
      }
      if (acc.id === transferForm.toAccount) {
        return { ...acc, balance: acc.balance + convertedAmount };
      }
      return acc;
    });

    setAccounts(updatedAccounts);

    // Add transaction
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      fromAccount: fromAccount.name,
      toAccount: toAccount.name,
      fromCurrency: fromAccount.currency,
      toCurrency: toAccount.currency,
      amount: amount,
      convertedAmount: convertedAmount,
      fxRate: fxRate,
      note: transferForm.note,
      scheduledDate: transferForm.scheduledDate || null,
      status: transferForm.scheduledDate ? 'Scheduled' : 'Completed'
    };

    setTransactions([newTransaction, ...transactions]);
    
    // Reset form
    setTransferForm({
      fromAccount: '',
      toAccount: '',
      amount: '',
      note: '',
      scheduledDate: ''
    });

    setSuccess(`Transfer ${newTransaction.status.toLowerCase()} successfully!`);
  };

  const filteredTransactions = transactions.filter((tx: Transaction) => {
    let matches = true;
    
    if (filters.account) {
      matches = matches && (tx.fromAccount.includes(filters.account) || tx.toAccount.includes(filters.account));
    }
    
    if (filters.currency) {
      matches = matches && (tx.fromCurrency === filters.currency || tx.toCurrency === filters.currency);
    }
    
    if (filters.dateFrom) {
      matches = matches && new Date(tx.timestamp) >= new Date(filters.dateFrom);
    }
    
    if (filters.dateTo) {
      matches = matches && new Date(tx.timestamp) <= new Date(filters.dateTo + 'T23:59:59');
    }
    
    return matches;
  });

  const getCurrencyIcon = (currency: Currency): string => {
    const icons: Record<Currency, string> = {
      KES: '🇰🇪',
      USD: '🇺🇸',
      NGN: '🇳🇬'
    };
    return icons[currency] || '💰';
  };

  const getTotalByCurrency = (): CurrencyTotals => {
    const totals: CurrencyTotals = {};
    accounts.forEach(acc => {
      totals[acc.currency] = (totals[acc.currency] || 0) + acc.balance;
    });
    return totals;
  };

  const currencyTotals = getTotalByCurrency();

  const handleFormChange = (field: keyof TransferForm, value: string): void => {
    setTransferForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFilterChange = (field: keyof Filters, value: string): void => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Treasury Movement Simulator</h1>
          <p className="text-gray-600">Manage multi-currency treasury operations across 10 virtual accounts</p>
        </div>

        {/* Currency Totals Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Object.entries(currencyTotals).map(([currency, total]) => (
            <div key={currency} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total {currency}</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(total!, currency as Currency)}</p>
                </div>
                <div className="text-3xl">{getCurrencyIcon(currency as Currency)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Accounts Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <DollarSign className="mr-2 text-green-600" />
              Account Balances
            </h2>
            <div className="space-y-3">
              {accounts.map((account: Account) => (
                <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getCurrencyIcon(account.currency)}</span>
                    <div>
                      <p className="font-semibold text-gray-800">{account.name}</p>
                      <p className="text-sm text-gray-600">{account.currency}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(account.balance, account.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transfer Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <ArrowRightLeft className="mr-2 text-blue-600" />
              Transfer Funds
            </h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                {success}
              </div>
            )}

            <div className="space-y-4">
              {/* From Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Account</label>
                <select
                  value={transferForm.fromAccount}
                  onChange={(e) => handleFormChange('fromAccount', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select source account</option>
                  {accounts.map((account: Account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.balance, account.currency)}
                    </option>
                  ))}
                </select>
              </div>

              {/* To Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Account</label>
                <select
                  value={transferForm.toAccount}
                  onChange={(e) => handleFormChange('toAccount', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select destination account</option>
                  {accounts.map((account: Account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {account.currency}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  value={transferForm.amount}
                  onChange={(e) => handleFormChange('amount', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* FX Preview */}
              {transferForm.fromAccount && transferForm.toAccount && transferForm.amount && (() => {
                const fromAccount = accounts.find(acc => acc.id === transferForm.fromAccount);
                const toAccount = accounts.find(acc => acc.id === transferForm.toAccount);
                const amount = parseFloat(transferForm.amount);
                
                if (fromAccount && toAccount && !isNaN(amount) && fromAccount.currency !== toAccount.currency) {
                  const converted = calculateFXConversion(amount, fromAccount.currency, toAccount.currency);
                  if (converted) {
                    const rate = converted / amount;
                    return (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>FX Conversion:</strong><br/>
                          {formatCurrency(amount, fromAccount.currency)} → {formatCurrency(converted, toAccount.currency)}<br/>
                          <em>Rate: 1 {fromAccount.currency} = {rate.toFixed(4)} {toAccount.currency}</em>
                        </p>
                      </div>
                    );
                  }
                }
                return null;
              })()}

              {/* Scheduled Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline mr-1" size={16} />
                  Scheduled Date (Optional)
                </label>
                <input
                  type="date"
                  value={transferForm.scheduledDate}
                  onChange={(e) => handleFormChange('scheduledDate', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Note (Optional)</label>
                <textarea
                  value={transferForm.note}
                  onChange={(e) => handleFormChange('note', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add a note for this transfer"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleTransfer}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold"
              >
                {transferForm.scheduledDate ? 'Schedule Transfer' : 'Execute Transfer'}
              </button>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <TrendingUp className="mr-2 text-purple-600" />
              Transaction History
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-200"
            >
              {showFilters ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="ml-2">{showFilters ? 'Hide' : 'Show'} Filters</span>
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account</label>
                <input
                  type="text"
                  value={filters.account}
                  onChange={(e) => handleFilterChange('account', e.target.value)}
                  placeholder="Filter by account name"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={filters.currency}
                  onChange={(e) => handleFilterChange('currency', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All currencies</option>
                  <option value="KES">KES</option>
                  <option value="USD">USD</option>
                  <option value="NGN">NGN</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Transaction Table */}
          <div className="overflow-x-auto">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No transactions found. Start by making a transfer above.
              </div>
            ) : (
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Timestamp</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">From</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">To</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Note</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((tx: Transaction) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(tx.timestamp).toLocaleString()}
                        {tx.scheduledDate && (
                          <div className="text-xs text-gray-500">
                            Scheduled: {new Date(tx.scheduledDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">{tx.fromAccount}</div>
                        <div className="text-gray-500">{tx.fromCurrency}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">{tx.toAccount}</div>
                        <div className="text-gray-500">{tx.toCurrency}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(tx.amount, tx.fromCurrency)}
                        </div>
                        {tx.fromCurrency !== tx.toCurrency && (
                          <div className="text-gray-500 text-xs">
                            → {formatCurrency(tx.convertedAmount, tx.toCurrency)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          tx.status === 'Completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{tx.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreasurySimulator;