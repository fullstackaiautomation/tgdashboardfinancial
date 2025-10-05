import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Wallet, CreditCard, PiggyBank } from 'lucide-react'

const FinanceDashboard = () => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Financial Dashboard</h2>
        <p className="text-gray-600 mt-1">Track your net worth, income, and spending</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="w-8 h-8" />
            <div>
              <p className="text-sm opacity-90">Net Worth</p>
              <h3 className="text-3xl font-bold">{formatCurrency(45000)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-8 h-8" />
            <div>
              <p className="text-sm opacity-90">Total Income (YTD)</p>
              <h3 className="text-3xl font-bold">{formatCurrency(150000)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-8 h-8" />
            <div>
              <p className="text-sm opacity-90">Total Spending (YTD)</p>
              <h3 className="text-3xl font-bold">{formatCurrency(105000)}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <PiggyBank className="w-8 h-8 text-orange-500" />
          <div>
            <p className="text-sm text-gray-600">Savings Rate</p>
            <h3 className="text-3xl font-bold text-gray-900">30%</h3>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-4 rounded-full" style={{ width: '30%' }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            Income Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-gray-700">Salary</span>
              <span className="font-semibold">{formatCurrency(120000)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-gray-700">Side Projects</span>
              <span className="font-semibold">{formatCurrency(25000)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-gray-700">Investments</span>
              <span className="font-semibold">{formatCurrency(5000)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            Spending Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-gray-700">Housing</span>
              <span className="font-semibold">{formatCurrency(36000)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-gray-700">Food</span>
              <span className="font-semibold">{formatCurrency(18000)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-gray-700">Transportation</span>
              <span className="font-semibold">{formatCurrency(12000)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-gray-700">Other</span>
              <span className="font-semibold">{formatCurrency(39000)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FinanceDashboard
