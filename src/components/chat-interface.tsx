'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChatMessage } from '@/types'
import { Send, Bot, User, Zap, TrendingUp, Pause, Play } from 'lucide-react'

interface ChatInterfaceProps {
  className?: string
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'agent',
      content: 'Hello! I\'m your ArbitrageAI assistant. I can help you monitor opportunities, adjust settings, and control your agents. Try asking me "Show me current opportunities" or "What\'s my profit today?"',
      timestamp: new Date(),
      agentName: 'ArbitrageAI'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate agent response
    setTimeout(() => {
      const response = generateAgentResponse(input)
      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: response.content,
        timestamp: new Date(),
        agentName: response.agentName
      }

      setMessages(prev => [...prev, agentMessage])
      setIsLoading(false)
    }, 1000 + Math.random() * 2000)
  }

  const handleQuickAction = (action: string) => {
    setInput(action)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          ASI:One Chat Interface
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction('Show me current opportunities')}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Opportunities
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction('What is my profit today?')}
          >
            <Zap className="h-4 w-4 mr-1" />
            P&L
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction('Pause all trading')}
          >
            <Pause className="h-4 w-4 mr-1" />
            Pause
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction('Resume trading')}
          >
            <Play className="h-4 w-4 mr-1" />
            Resume
          </Button>
        </div>

        {/* Messages */}
        <div className="h-96 overflow-y-auto space-y-4 border rounded-lg p-4 bg-gray-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    {message.role === 'user' ? 'You' : message.agentName}
                  </span>
                  <span className="text-xs opacity-60">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border rounded-lg p-3 max-w-[80%]">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="h-4 w-4" />
                  <span className="text-sm font-medium">ArbitrageAI</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about opportunities, settings, or agent status..."
            className="flex-1 min-h-[40px] max-h-32 p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function generateAgentResponse(userInput: string): { content: string; agentName: string } {
  const input = userInput.toLowerCase()

  // Pattern matching for different query types
  if (input.includes('opportunities') || input.includes('opportunity')) {
    return {
      content: `I found 2 active arbitrage opportunities:

🚀 **BTC > $100k by Dec 31**
• Oracle Price: $98,500
• Market Odds: 75%
• Profit Margin: 6.2%
• Confidence: 85%
• Status: Ready to execute

📈 **ETH > $5k by Dec 31**
• Oracle Price: $3,800
• Market Odds: 60%
• Profit Margin: 4.8%
• Confidence: 72%
• Status: Monitoring

Would you like me to execute the BTC opportunity?`,
      agentName: 'Scanner Agent'
    }
  }

  if (input.includes('profit') || input.includes('p&l') || input.includes('pnl')) {
    return {
      content: `📊 **Today's Performance**

• Total Profit: +$456.78
• Trades Executed: 3
• Success Rate: 100%
• Best Trade: BTC opportunity (+$289.45)
• ROI: +8.2%

Your arbitrage strategy is performing well! The agents have maintained high accuracy while staying within your risk parameters.`,
      agentName: 'Analyzer Agent'
    }
  }

  if (input.includes('pause') || input.includes('stop')) {
    return {
      content: `🛑 **Trading Paused**

All agents have been instructed to pause trading:
• Scanner Agent: Continuing to monitor (read-only)
• Analyzer Agent: Analysis paused
• Executor Agent: All executions halted

Current positions will be monitored for settlement. To resume trading, just say "resume trading".`,
      agentName: 'Executor Agent'
    }
  }

  if (input.includes('resume') || input.includes('start')) {
    return {
      content: `▶️ **Trading Resumed**

All agents are now active:
• Scanner Agent: Monitoring markets every 30s
• Analyzer Agent: MeTTa reasoning enabled
• Executor Agent: Ready to execute via Vincent

Current settings:
• Min Profit: 5%
• Max Bet Size: $200
• Risk Level: Medium`,
      agentName: 'Executor Agent'
    }
  }

  if (input.includes('agent') || input.includes('status')) {
    return {
      content: `🤖 **Agent Status Report**

**Scanner Agent**: ✅ Active
• Last scan: 23 seconds ago
• Markets monitored: 3
• Opportunities found: 12 (today)

**Analyzer Agent**: ✅ Active  
• MeTTa reasoning: Enabled
• Analysis queue: Empty
• Recommendations: 8 (today)

**Executor Agent**: ✅ Active
• Vincent connection: Healthy
• Pending trades: 0
• Executions: 3 (today)

All systems operating normally!`,
      agentName: 'ArbitrageAI'
    }
  }

  if (input.includes('settings') || input.includes('policy') || input.includes('config')) {
    return {
      content: `⚙️ **Current Settings**

**Trading Policy**:
• Min Profit Margin: 5%
• Max Bet Size: $200
• Risk Tolerance: Medium
• Approved Markets: BTC, ETH predictions

**Agent Configuration**:
• Scan Interval: 30 seconds
• Confidence Threshold: 70%
• Auto-execution: Enabled

Would you like to modify any settings? I can help you adjust profit thresholds, bet sizes, or risk parameters.`,
      agentName: 'ArbitrageAI'
    }
  }

  if (input.includes('how') || input.includes('explain') || input.includes('what')) {
    return {
      content: `🧠 **How ArbitrageAI Works**

1. **Scanner Agent** monitors Pyth Network for real-time crypto prices and Polymarket for prediction market odds
2. **Analyzer Agent** uses MeTTa reasoning to identify profitable arbitrage opportunities 
3. **Executor Agent** automatically executes trades via Lit Protocol Vincent

The system finds discrepancies between oracle prices and market-implied prices, then executes trades when profit margins exceed your thresholds.

For example, if Polymarket says 75% chance BTC hits $100k but it's already at $98.5k, that's likely mispriced!`,
      agentName: 'ArbitrageAI'
    }
  }

  // Default response
  return {
    content: `I understand you're asking about "${userInput}". 

I can help you with:
• 📊 Current arbitrage opportunities
• 💰 Profit and loss tracking  
• ⚙️ Settings and policy changes
• 🤖 Agent status and controls
• 🛑 Pausing/resuming trading
• 📚 Explanations of how the system works

What would you like to know more about?`,
    agentName: 'ArbitrageAI'
  }
}