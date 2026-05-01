import { NextResponse } from 'next/server'
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"

export async function POST(request: Request) {
  try {
    const { question, observatories } = await request.json()
    if (!observatories || observatories.length === 0) {
      return NextResponse.json({ answer: 'ยังไม่มีข้อมูลครับ', filter: [] })
    }

    await connectDB()
    const db = mongoose.connection.db!

    // ดึง Forecast
    const forecasts = await db.collection('weather_forecast')
      .find({})
      .sort({ observatory_id: 1, date: 1 })
      .toArray()

    // ดึง Historical (weather_history ถ้ามี หรือใช้ realtime เก่า)
    let historicalInfo = 'ไม่มีข้อมูลย้อนหลังในระบบครับ'
    try {
      const history = await db.collection('weather_history')
        .find({})
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray()
      if (history.length > 0) {
        historicalInfo = history.map((h: any) =>
          `- ${h.name} (${h.observatory_id}) เวลา ${new Date(h.timestamp).toLocaleString('th-TH')}: เมฆ ${h.cloud_cover}%, ความชื้น ${h.humidity}%, ลม ${h.wind_speed} m/s, ฝน ${h.rain_rate} mm, ${h.condition}`
        ).join('\n')
      }
    } catch {}

    const forecastMap: Record<string, any[]> = {}
    forecasts.forEach((f: any) => {
      if (!forecastMap[f.observatory_id]) forecastMap[f.observatory_id] = []
      forecastMap[f.observatory_id].push(
        `  ${f.date}: เมฆ ${f.cloud_cover}%, ความชื้น ${f.humidity}%, ลม ${f.wind_max} m/s, ฝน ${f.rain} mm, ${f.condition}`
      )
    })

    const realtimeInfo = observatories.map((o: any) =>
      `- ${o.name} (${o.observatory_id})
   Score: ${o.score}/100
   อุณหภูมิ: ${o.temperature}°C | เมฆ: ${o.cloud_cover}% | ความชื้น: ${o.humidity}%
   ลม: ${o.wind_speed} m/s | ฝน: ${o.rain_rate} mm | สภาพ: ${o.condition}`
    ).join('\n\n')

    const forecastInfo = observatories.map((o: any) => {
     const days = (forecastMap[o.observatory_id] || []).slice(0, 7)
      return `- ${o.name} (${o.observatory_id}):\n${days.join('\n')}`
    }).join('\n\n')

    const prompt = `คุณเป็น AI ผู้เชี่ยวชาญวิเคราะห์สภาพอากาศสำหรับการดูดาวที่หอดูดาว NARIT ครับ

===== แหล่งข้อมูลที่มีอยู่ =====
1. Realtime (ปัจจุบัน) — ดึงจาก MongoDB collection: weather_realtime อัปเดตทุก 1 นาที
2. Forecast (อนาคต 15 วัน) — ดึงจาก MongoDB collection: weather_forecast อัปเดตทุก 1 ชั่วโมง
3. Historical (อดีต) — ดึงจาก MongoDB collection: weather_history

===== ข้อมูล Realtime ตอนนี้ =====
${realtimeInfo}

===== พยากรณ์อากาศ 15 วันข้างหน้า =====
${forecastInfo}

===== ข้อมูลย้อนหลัง =====
${historicalInfo}

คำถาม: ${question}

กรุณาตอบเป็นภาษาไทย โดย:
1. บอกว่าดึงข้อมูลมาจากแหล่งไหน (Realtime / Forecast / Historical)
2. รายงานค่าตัวเลขจริงๆ เช่น เมฆ XX%, ความชื้น XX%, ลม XX m/s, ฝน XX mm, Score XX/100
3. อธิบายเหตุผลที่วิเคราะห์ว่าพร้อม/ไม่พร้อมเพราะอะไร
4. สรุปผลชัดเจนว่าหอไหนแนะนำ

แล้วต่อท้ายด้วย FILTER_IDS: คั่นด้วยคอมมา เช่น FILTER_IDS: TNO,SRO
ถ้าไม่ต้องกรองให้ใส่ FILTER_IDS: none`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages:    [{ role: 'user', content: prompt }],
        max_tokens:  800,
        temperature: 0.5,
      }),
    })

    if (!res.ok) {
     const errText = await res.text()
      console.error('Groq error:', res.status, errText)
      return NextResponse.json({ answer: `Groq error ${res.status}: ${errText}`, filter: [] })
    }

    const data    = await res.json()
    const content = data.choices?.[0]?.message?.content || ''

    const filterMatch = content.match(/FILTER_IDS:\s*([^\n]+)/)
    let filter: string[] = []
    if (filterMatch && filterMatch[1].trim() !== 'none') {
      filter = filterMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean)
    }

    const answer = content.replace(/FILTER_IDS:.*$/m, '').trim()
    return NextResponse.json({ answer, filter })

  } catch (error) {
    console.error('AI Chat error:', error)
    return NextResponse.json({ answer: 'เกิดข้อผิดพลาดครับ', filter: [] })
  }
}
