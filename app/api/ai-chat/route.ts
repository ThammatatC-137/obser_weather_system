import { NextResponse } from 'next/server'
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"
import { calcScore, scoreToLabel } from "@/lib/obsScore"

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


    const realtimeInfo = observatories.map((o: any) => {
      const score = calcScore(o)
      const label = scoreToLabel(score)
      return `- ${o.name} (${o.observatory_id})
   สถานะ: ${label} (${score}/100)
   เมฆ: ${o.cloud_cover}% | ความชื้น: ${o.humidity}% | ฝน: ${o.rain_rate} mm | สภาพ: ${o.condition}`
    }).join('\n\n')

    const forecastInfo = observatories.map((o: any) => {
      const days = (forecastMap[o.observatory_id] || []).slice(0, 7)
      return `- ${o.name} (${o.observatory_id}):\n${days.join('\n')}`
    }).join('\n\n')

    const prompt = `คุณเป็น AI ช่วยวิเคราะห์สภาพอากาศสำหรับดูดาวที่หอดูดาว NARIT ครับ ตอบแบบเพื่อนคุยกัน สั้น กระชับ เข้าใจง่าย

===== ข้อมูล Realtime ตอนนี้ =====
${realtimeInfo}

===== พยากรณ์อากาศ วันข้างหน้า =====
${forecastInfo}

===== ข้อมูลย้อนหลัง =====
${historicalInfo}

คำถาม: ${question}

กฎการตอบ:
- ตอบภาษาไทย สั้นๆ เหมือนเพื่อนคุยกัน ไม่เกิน 5 ประโยค
- หอที่ "พร้อม" คือ score >= 70, "พอใช้" คือ 40-69, "ไม่พร้อม" คือ < 40
- โฟกัสแค่หอที่ดีที่สุด หรือที่ถามถึง ไม่ต้องรายงานทุกหอ
- ใช้ตัวเลขแค่ที่จำเป็น เช่น เมฆ 0% หรือ ฝน 0 mm
- ห้ามใช้ ** หรือ ### หรือหัวข้อลำดับ 1. 2. 3.
- ลงท้ายด้วย "ครับ" เป็นธรรมชาติ

แล้วต่อท้ายด้วย FILTER_IDS: คั่นด้วยคอมมา เช่น FILTER_IDS: TNO,SRO
ถ้าไม่ต้องกรองให้ใส่ FILTER_IDS: none`

    const res = await fetch('https://lllm.narit.or.th/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.LITELLM_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'deepseek-v4-flash-think',
        messages:    [{ role: 'user', content: prompt }],
        max_tokens:  8000,
        temperature: 0.5,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('LiteLLM error:', res.status, errText)
      return NextResponse.json({ answer: `Error ${res.status}: ${errText}`, filter: [] })
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