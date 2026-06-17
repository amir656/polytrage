import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { Opportunity, DashboardData } from '@/types'

const DATA_FILE = path.join(process.cwd(), 'data', 'opportunities.json')

function readData(): DashboardData {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { lastScanAt: null, opportunities: [] }
  }
}

function writeData(data: DashboardData) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

export async function GET() {
  return NextResponse.json(readData())
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, status } = body

  if (!id || !['placed', 'dismissed', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const data = readData()
  const opp = data.opportunities.find((o: Opportunity) => o.id === id)
  if (!opp) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  opp.status = status
  opp.updatedAt = new Date().toISOString()
  writeData(data)

  return NextResponse.json({ success: true, opportunity: opp })
}
