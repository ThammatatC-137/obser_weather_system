import { NextResponse } from 'next/server'
import { connectDB }    from '@/lib/mongodb'
import mongoose         from 'mongoose'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false })

    await connectDB()
    const db = mongoose.connection.db!
    const records = await db
      .collection('weather_forecast')
      .find({ observatory_id: id })
      .sort({ date: 1 })
      .limit(60)
      .toArray()

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    return NextResponse.json({ success: false, error })
  }
}