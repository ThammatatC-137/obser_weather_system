import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

async function connect() {
  if (mongoose.connection.readyState >= 1) return
  await mongoose.connect(MONGODB_URI)
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ success: false }, { status: 400 })

  await connect()
  const db = mongoose.connection.db!

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [historyRaw, predDoc] = await Promise.all([
    db.collection('weather_history')
      .find({ observatory_id: id, timestamp: { $gte: since }, pixel_cloud_percent: { $ne: null } },
            { projection: { timestamp: 1, pixel_cloud_percent: 1, _id: 0 } })
      .sort({ timestamp: 1 })
      .toArray(),
    db.collection('weather_cloud_predictions')
      .findOne({ observatory_id: id }, { projection: { predictions: 1, predicted_at: 1, _id: 0 } }),
  ])

  const history = historyRaw.map(r => ({
    time: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
    pct:  Number(r.pixel_cloud_percent),
  }))

  const predictions = (predDoc?.predictions ?? []).map((p: any) => ({
    time: p.time instanceof Date ? p.time.toISOString() : p.time,
    pct:  Number(p.pct),
  }))

  return NextResponse.json({
    success: true,
    history,
    predictions,
    predicted_at: predDoc?.predicted_at ?? null,
  })
}
