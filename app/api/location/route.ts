import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { connectDB } from '@/lib/mongodb'
import mongoose from 'mongoose'
import path from 'path'

const execAsync = promisify(exec)

// สร้าง location_id จาก lat/lon
function makeLocationId(lat: number, lon: number): string {
  return `${lat.toFixed(4)}_${lon.toFixed(4)}`
}

// POST /api/location — รับ lat, lon, name → รัน Python → เก็บ MongoDB
export async function POST(req: NextRequest) {
  try {
    const { lat, lon, name } = await req.json()

    if (!lat || !lon) {
      return NextResponse.json({ success: false, error: 'lat/lon required' }, { status: 400 })
    }

    const location_id = makeLocationId(lat, lon)
    const scriptPath  = path.join(process.cwd(), 'scripts', 'collect_location.py')
    const safeName    = (name || `Location ${location_id}`).replace(/['"]/g, '')

    // รัน Python script
    const { stdout, stderr } = await execAsync(
      `python3 "${scriptPath}" ${lat} ${lon} "${location_id}" "${safeName}"`,
      { timeout: 30000 }
    )

    if (stderr && !stderr.includes('UserWarning')) {
      console.error('collect_location stderr:', stderr)
    }
    console.log('collect_location:', stdout)

    return NextResponse.json({ success: true, location_id })

  } catch (e: any) {
    console.error('POST /api/location error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// GET /api/location?id=xxx&type=current|forecast|hourly
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const location_id = searchParams.get('id')
    const type        = searchParams.get('type') || 'current'

    if (!location_id) {
      return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    }

    await connectDB()
    const db = mongoose.connection.db!

    if (type === 'forecast') {
      const today = new Date().toISOString().split('T')[0]
      const data  = await db.collection('location_forecast')
        .find({ location_id, date: { $gte: today } })
        .sort({ date: 1 })
        .limit(15)
        .toArray()
      return NextResponse.json({ success: true, data })
    }

    if (type === 'hourly') {
      const today = new Date().toISOString().split('T')[0]
      const data  = await db.collection('location_hourly')
        .find({ location_id, date: today })
        .sort({ timestamp: 1 })
        .toArray()
      return NextResponse.json({ success: true, data })
    }

    // current weather
    const data = await db.collection('location_weather')
      .findOne({ location_id })

    if (!data) {
      return NextResponse.json({ success: false, error: 'not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })

  } catch (e: any) {
    console.error('GET /api/location error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}