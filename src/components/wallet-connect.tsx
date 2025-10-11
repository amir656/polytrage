'use client'

import React from 'react'
import { useConnect, useDisconnect, useAccount } from 'wagmi'
import { formatAddress } from '@/lib/utils'

export function WalletConnect() {
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { address, isConnected } = useAccount()

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          {formatAddress(address)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Connect Wallet</h3>
      <div className="grid gap-2">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={status === 'pending'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {connector.name}
            {status === 'pending' && ' (connecting...)'}
          </button>
        ))}
      </div>
      {error && (
        <div className="text-red-600 text-sm">
          {error.message}
        </div>
      )}
    </div>
  )
}