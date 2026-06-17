import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'opportunities.json')

interface Opportunity {
  id: string
  market: string
  marketUrl: string
  conditionId: string
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

interface DataFile {
  lastScanAt: string | null
  opportunities: Opportunity[]
}

function readData(): DataFile {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { lastScanAt: null, opportunities: [] }
  }
}

function writeData(data: DataFile) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

export async function GET() {
  const data = readData()
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, status } = body

  if (!id || !['placed', 'dismissed', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const data = readData()
  const opp = data.opportunities.find(o => o.id === id)
  if (!opp) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  opp.status = status
  opp.updatedAt = new Date().toISOString()
  writeData(data)

  return NextResponse.json({ success: true, opportunity: opp })
}
