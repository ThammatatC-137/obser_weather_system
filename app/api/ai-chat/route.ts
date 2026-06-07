import { NextResponse } from 'next/server'
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"
import { calcScore, scoreToLabel } from "@/lib/obsScore"

export async function POST(request: Request) {
  try {
    const { question, observatories, mode } = await request.json()
    if (!observatories || observatories.length === 0) {
      return NextResponse.json({ answer: 'ยังไม่มีข้อมูลครับ', filter: [] })
    }

    await connectDB()
    const db = mongoose.connection.db!

    // ดึง Forecast
    const todayKey = new Date().toISOString().split('T')[0]
    const forecasts = await db.collection('weather_forecast')
      .find({ date: { $gte: todayKey } })
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

    // Realtime + CNN + Star Count
    const realtimeInfo = observatories.map((o: any) => {
      const score = calcScore(o)
      const label = scoreToLabel(score)

      const cnnInfo = o.cnn_prediction
        ? `CNN วิเคราะห์รูปกล้อง: ${o.cnn_prediction.replace(/_/g, ' ')} (มั่นใจ ${Math.round((o.cnn_confidence ?? 0) * 100)}%)`
        : 'ยังไม่มีข้อมูล CNN'

      const skyStatus = o.narit_sky_status ? `NARIT: ${o.narit_sky_status}` : `สภาพ: ${o.condition}`
      return `- ${o.name} (${o.observatory_id})
   สถานะ: ${label} (${score}/100)
   ${skyStatus} | ความชื้น: ${o.humidity}% | ลม: ${o.wind_speed} m/s | ฝน: ${o.rain_rate} mm
   ${cnnInfo}`
    }).join('\n\n')

    const forecastInfo = observatories.map((o: any) => {
      const days = (forecastMap[o.observatory_id] || []).slice(0, 7)
      return `- ${o.name} (${o.observatory_id}):\n${days.join('\n')}`
    }).join('\n\n')

    // ปรับ prompt ตาม mode
    const isObservatoryMode = mode === 'observatory'
    const todayStr = new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const todayISO = new Date().toISOString().split('T')[0]

    const prompt = isObservatoryMode
      ? `คุณเป็น AI ผู้ช่วยเฝ้าหอดูดาว NARIT ครับ ช่วยวิเคราะห์สภาพท้องฟ้าและแนะนำการเปิด/ปิดโดมกล้องดูดาว

วันนี้คือ: ${todayStr} (${todayISO})

===== ข้อมูล Realtime + AI Vision =====
${realtimeInfo}

===== พยากรณ์อากาศ =====
${forecastInfo}

คำถาม: ${question}

กฎการตอบ:
- ตอบภาษาไทย เหมือนผู้ช่วยคุยกับคนเฝ้าหอดูดาว
- ใช้ NARIT sky status และ CNN เป็นหลักในการประเมิน ห้ามอ้าง % เมฆโดยตรง
- ถ้า NARIT บอก Cloudy/Rainy → ไม่แนะนำเปิดโดม แม้ sensor อื่นจะดูดี
- ถ้า NARIT บอก Clear และ CNN ยืนยัน → แนะนำเปิดโดมได้
- อ้างอิงวันที่เป็นภาษาไทยเช่น "พรุ่งนี้ (29 พ.ค.)" ไม่ใช่ตัวเลขดิบ
- สั้น กระชับ ไม่เกิน 4 ประโยค ลงท้ายด้วย "ครับ"
- ห้ามใช้ ** หรือ ### หรือหัวข้อลำดับ`
      : `คุณเป็น AI ช่วยวิเคราะห์สภาพอากาศสำหรับดูดาวที่หอดูดาว NARIT ครับ ตอบแบบเพื่อนคุยกัน สั้น กระชับ เข้าใจง่าย

วันนี้คือ: ${todayStr} (${todayISO})
สัปดาห์หน้าคือ: วันที่ ${new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]} ถึง ${new Date(Date.now() + 13*24*60*60*1000).toISOString().split('T')[0]}

===== ข้อมูล Realtime ตอนนี้ =====
${realtimeInfo}

===== พยากรณ์อากาศ วันข้างหน้า =====
${forecastInfo}

===== ข้อมูลย้อนหลัง =====
${historicalInfo}

คำถาม: ${question}

กฎการตอบ:
- ตอบภาษาไทย สั้นๆ เหมือนเพื่อนคุยกัน ไม่เกิน 5 ประโยค
- วันที่ในอดีต (ก่อน ${todayISO}) ห้ามแนะนำ เอาเฉพาะวันนี้และอนาคต
- หอที่ "พร้อม" คือ score >= 70, "พอใช้" คือ 40-69, "ไม่พร้อม" คือ < 40
- ใช้ NARIT sky status และ condition เป็นหลัก ห้ามอ้าง % เมฆโดยตรง ยังไม่น่าเชื่อถือ
- โฟกัสแค่หอที่ดีที่สุด หรือที่ถามถึง ไม่ต้องรายงานทุกหอ
- อ้างอิงวันที่เป็นภาษาไทยเช่น "พรุ่งนี้ (29 พ.ค.)" ไม่ใช่ตัวเลขดิบ
- ห้ามใช้ ** หรือ ### หรือหัวข้อลำดับ 1. 2. 3.
- ลงท้ายด้วย "ครับ" เป็นธรรมชาติ

แล้วต่อท้ายด้วย FILTER_IDS: คั่นด้วยคอมมา เช่น FILTER_IDS: TNO,SRO
ถ้าไม่ต้องกรองให้ใส่ FILTER_IDS: none`

    const callLLM = (url: string, key: string, model: string, content: string) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages:    [{ role: 'user', content }],
          max_tokens:  8000,
          temperature: 0.5,
        }),
      })

    // ลอง Gemini ก่อน ถ้าเจอ 503/429 (คนใช้เยอะ) ค่อยลองใหม่อีกรอบ
    let res!: Response
    for (let attempt = 1; attempt <= 2; attempt++) {
      res = await callLLM('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        process.env.GEMINI_API_KEY!, 'gemini-2.5-flash', prompt)
      if (res.ok || !(res.status === 429 || res.status >= 500)) break
      if (attempt < 2) await new Promise(r => setTimeout(r, 1200))
    }

    // ถ้า Gemini ยังไม่ได้ เปลี่ยนไปใช้ Groq แทน ตัดข้อมูลย้อนหลังออกให้ prompt สั้นลง
    if (!res.ok) {
      console.error('Gemini failed → fallback Groq:', res.status)
      const promptLite = prompt.replace(historicalInfo, '(เน้นข้อมูลปัจจุบันและพยากรณ์เป็นหลัก)')
      res = await callLLM('https://api.groq.com/openai/v1/chat/completions',
        process.env.GROQ_API_KEY!, 'llama-3.3-70b-versatile', promptLite)
    }

    if (!res.ok) {
      const errText = await res.text()
      console.error('AI providers failed:', res.status, errText)
      return NextResponse.json({ answer: 'ตอนนี้ระบบ AI ใช้งานไม่ได้ชั่วคราวครับ รบกวนลองใหม่อีกครั้งในอีกสักครู่', filter: [] })
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