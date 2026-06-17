'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Clock, ExternalLink, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface Opportunity {
  id: string
  market: string
  marketUrl: string
  asset: string
  side: 'YES' | 'NO'
  marketOdds: number
  oraclePrice: number
  targetPrice: number
  profitMargin: number
  confidence: number
  status: 'pending' | 'placed' | 'dismissed'
  detectedAt: string
  updatedAt: string
}

interface DashboardData {
  lastScanAt: string | null
  opportunities: Opportunity[]
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function OpportunityCard({
  opp,
  onAction,
}: {
  opp: Opportunity
  onAction: (id: string, status: 'placed' | 'dismissed') => Promise<void>
}) {
  const [loading, setLoading] = useState<'placed' | 'dismissed' | null>(null)
  const isBuy = opp.side === 'YES'

  async function handleAction(status: 'placed' | 'dismissed') {
    setLoading(status)
    await onAction(opp.id, status)
    setLoading(null)
  }

  const borderColor = opp.status === 'placed'
    ? 'border-green-400'
    : opp.status === 'dismissed'
    ? 'border-gray-300'
    : 'border-blue-400'

  return (
    <div className={`rounded-xl border-2 ${borderColor} bg-white shadow-sm p-5 space-y-4`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-full ${
            isBuy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {isBuy ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            Buy {opp.side}
          </span>
          <span className="text-sm text-gray-500">{opp.asset}</span>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-green-600">+{opp.profitMargin.toFixed(1)}%</div>
          <div className="text-xs text-gray-400">{opp.confidence.toFixed(0)}% confidence</div>
        </div>
      </div>

      {/* Market question */}
      <p className="text-sm text-gray-800 leading-snug">{opp.market}</p>

      {/* Price grid */}
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-500 mb-0.5">Oracle Price</div>
          <div className="font-semibold">${opp.oraclePrice.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-500 mb-0.5">Target Price</div>
          <div className="font-semibold">${opp.targetPrice.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-500 mb-0.5">{opp.side} Price</div>
          <div className="font-semibold">{(opp.marketOdds * 100).toFixed(1)}¢</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          {timeAgo(opp.detectedAt)}
        </div>

        {opp.status === 'pending' ? (
          <div className="flex items-center gap-2">
            <a
              href={opp.marketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              Polymarket <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={() => handleAction('dismissed')}
              disabled={!!loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Dismiss
            </button>
            <button
              onClick={() => handleAction('placed')}
              disabled={!!loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {loading === 'placed' ? 'Saving…' : 'Mark Placed'}
            </button>
          </div>
        ) : (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            opp.status === 'placed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {opp.status === 'placed' ? '✓ Placed' : 'Dismissed'}
          </span>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({ lastScanAt: null, opportunities: [] })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'placed' | 'dismissed' | 'all'>('pending')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/opportunities')
      if (res.ok) setData(await res.json())
    } catch (e) {
      console.error('Failed to fetch opportunities', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  async function handleAction(id: string, status: 'placed' | 'dismissed') {
    await fetch('/api/opportunities', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    await fetchData()
  }

  const all = data.opportunities
  const pending = all.filter(o => o.status === 'pending')
  const placed = all.filter(o => o.status === 'placed')
  const dismissed = all.filter(o => o.status === 'dismissed')

  const displayed = filter === 'all' ? all : all.filter(o => o.status === filter)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-lg">Polytrage</span>
            <span className="text-xs text-gray-400 ml-1">manual verification</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {data.lastScanAt && (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3.5 w-3.5" />
                Last scan {timeAgo(data.lastScanAt)}
              </span>
            )}
            <button
              onClick={fetchData}
              className="px-3 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending', count: pending.length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Placed', count: placed.length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Dismissed', count: dismissed.length, color: 'text-gray-500', bg: 'bg-gray-100' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-sm text-gray-600 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 border-b pb-3">
          {(['pending', 'placed', 'dismissed', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-md capitalize transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Opportunity list */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin" />
            Loading…
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-gray-400 space-y-2">
            <TrendingUp className="h-10 w-10 mx-auto opacity-30" />
            <p className="font-medium">
              {filter === 'pending' ? 'No pending opportunities' : `No ${filter} trades yet`}
            </p>
            {filter === 'pending' && (
              <p className="text-sm">
                Start <code className="bg-gray-100 px-1 rounded">python poller.py</code> to begin scanning
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {displayed.map(opp => (
              <OpportunityCard key={opp.id} opp={opp} onAction={handleAction} />
            ))}
          </div>
        )}

        {/* How-to footer */}
        {!loading && all.length === 0 && (
          <div className="mt-8 rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 space-y-2">
            <p className="font-medium text-gray-700">Getting started</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Copy <code className="bg-gray-100 px-1 rounded">.env.example</code> → <code className="bg-gray-100 px-1 rounded">.env.local</code> and add your Telegram credentials</li>
              <li>Run <code className="bg-gray-100 px-1 rounded">pip install -r requirements.txt</code></li>
              <li>Run <code className="bg-gray-100 px-1 rounded">python poller.py</code> — it scans every 60 seconds</li>
              <li>Opportunities appear here and arrive via Telegram. Place them manually on Polymarket, then mark as placed.</li>
            </ol>
          </div>
        )}
      </main>
    </div>
  )
}
