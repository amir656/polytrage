'use client'

import React from 'react'
import { useAccount } from 'wagmi'
import { WalletConnect } from '@/components/wallet-connect'
import { ChatInterface } from '@/components/chat-interface'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ChatPage() {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Bot className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">ASI:One Chat</CardTitle>
            <p className="text-muted-foreground">
              Connect your wallet to chat with ArbitrageAI agents
            </p>
          </CardHeader>
          <CardContent>
            <WalletConnect />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>
              <div className="flex items-center gap-2">
                <Bot className="h-8 w-8 text-blue-600" />
                <h1 className="text-xl font-bold">ASI:One Chat</h1>
              </div>
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <ChatInterface />
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Agent Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Scanner</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Analyzer</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Executor</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Commands</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="p-2 bg-gray-50 rounded text-gray-600">
                  "Show me current opportunities"
                </div>
                <div className="p-2 bg-gray-50 rounded text-gray-600">
                  "What's my profit today?"
                </div>
                <div className="p-2 bg-gray-50 rounded text-gray-600">
                  "Increase profit threshold to 7%"
                </div>
                <div className="p-2 bg-gray-50 rounded text-gray-600">
                  "Pause all trading"
                </div>
                <div className="p-2 bg-gray-50 rounded text-gray-600">
                  "How does arbitrage work?"
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Opportunities Today</span>
                  <span>12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trades Executed</span>
                  <span>3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="text-green-600">100%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Uptime</span>
                  <span>2h 45m</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}