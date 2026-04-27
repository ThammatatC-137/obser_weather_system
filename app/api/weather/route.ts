
// API Route — GET /api/weather
// ดึงข้อมูลทุกหอจาก MongoDB
// ส่งกลับเป็น JSON


import { NextResponse } from 'next/server'
import { connectDB }    from '@/lib/mongodb'
import mongoose         from 'mongoose'

// กำหนด Schema ตรงกับที่ Python บันทึกไว้
const WeatherSchema = new mongoose.Schema({
  observatory_id: String,
  name:           String,
  timestamp:      Date,
  temperature:    Number,
  humidity:       Number,
  wind_speed:     Number,
  wind_direction: String,
  pressure:       Number,
  rain_rate:      Number,
  cloud_cover:    Number,
  uv_index:       Number,
  condition:      String,
  seeing_dimm:    Number,
  source:         String,
}, { collection: 'weather_realtime' })

// ป้องกัน Model ซ้ำ
const Weather = mongoose.models.Weather ||
                mongoose.model('Weather', WeatherSchema)

export async function GET() {
  try {
    // เชื่อม MongoDB
    await connectDB()

    // ดึงข้อมูลทุกหอ
    const data = await Weather.find({}).lean()

    // ส่งกลับเป็น JSON
    return NextResponse.json({
      success: true,
      count:   data.length,
      data:    data,
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}