import { NextResponse } from 'next/server'
import { connectDB }    from '@/lib/mongodb'
import mongoose         from 'mongoose'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id   = searchParams.get('id')
    const date = searchParams.get('date')
    const mode = searchParams.get('mode') // 'avg' | 'chart'

    if (!id) return NextResponse.json({ success: false })

    await connectDB()
    const db = mongoose.connection.db!

    if (date) {
      const today = new Date().toISOString().split('T')[0]
      const isPast = date < today

      // ── กราฟ วันอดีต → ดึงจาก weather_hourly (Open-Meteo ที่ collector เก็บไว้) ──
      if (mode === 'chart' && isPast) {
        const hourly = await db
          .collection('weather_hourly')
          .find({ observatory_id: id, date })
          .sort({ timestamp: 1 })
          .toArray()

        // ถ้าไม่มีใน weather_hourly ลองดึงจาก weather_history แทน
        if (hourly.length > 0) {
          return NextResponse.json({ success: true, data: hourly })
        }

        // fallback: ดึงจาก weather_history ถ้ามี
        const start = new Date(`${date}T00:00:00.000Z`)
        const end   = new Date(`${date}T23:59:59.999Z`)
        const history = await db
          .collection('weather_history')
          .find({ observatory_id: id, timestamp: { $gte: start, $lte: end } })
          .sort({ timestamp: 1 })
          .toArray()

        return NextResponse.json({ success: true, data: history.length > 0 ? history : [] })
      }

      // ── Stats เฉลี่ย วันอดีต → ดึงจาก weather_history ──
      const start = new Date(`${date}T00:00:00.000Z`)
      const end   = new Date(`${date}T23:59:59.999Z`)

      // ลองดึงจาก weather_history ก่อน (NARIT realtime ที่เก็บไว้)
      let records = await db
        .collection('weather_history')
        .find({ observatory_id: id, timestamp: { $gte: start, $lte: end } })
        .sort({ timestamp: 1 })
        .toArray()

      // ถ้าไม่มีใน weather_history ลองดึงจาก weather_hourly แทน
      if (records.length === 0 && isPast) {
        records = await db
          .collection('weather_hourly')
          .find({ observatory_id: id, date })
          .sort({ timestamp: 1 })
          .toArray()
      }

      if (records.length === 0)
        return NextResponse.json({ success: true, data: null })

      // mode=chart → ส่ง records ทั้งหมดสำหรับกราฟ
      if (mode === 'chart') {
        return NextResponse.json({ success: true, data: records })
      }

      // mode=avg (default) → ส่งค่าเฉลี่ย
      const avg = (key: string) => {
        const vals = records.map((r: any) => r[key]).filter((v: any) => v != null)
        return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null
      }
      const directions    = records.map((r: any) => r.wind_direction).filter(Boolean)
      const mostCommonDir = directions.sort((a: string, b: string) =>
        directions.filter((v: string) => v === a).length - directions.filter((v: string) => v === b).length
      ).pop() || '--'

      return NextResponse.json({
        success: true,
        data: {
          temperature:    avg('temperature'),
          humidity:       avg('humidity'),
          wind_speed:     avg('wind_speed'),
          wind_direction: mostCommonDir,
          pressure:       avg('pressure'),
          rain_rate:      avg('rain_rate'),
          dew_point:      avg('dew_point'),
          uv_index:       avg('uv_index'),
          seeing_dimm:    avg('seeing_dimm'),
          record_count:   records.length,
        }
      })
    }

    // ── ไม่มี date → ดึง 24hr ล่าสุด (Realtime) ──
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const records = await db
      .collection('weather_history')
      .find({ observatory_id: id, timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .toArray()

    return NextResponse.json({ success: true, data: records })

  } catch (error) {
    return NextResponse.json({ success: false, error })
  }
}