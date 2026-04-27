
// คำนวณ Observation Score 0-100 บอกว่าหอดูดาวพร้อมดูดาวแค่ไหน



import { Observatory } from '@/types'

export function calcScore(obs: Observatory): number {
  // คะแนนเมฆ — สำคัญที่สุด 40%
  // เมฆน้อย = คะแนนสูง
  const cloudScore = (100 - obs.cloud_cover) * 0.4

  // คะแนนความชื้น — 25%
  // ความชื้นต่ำ = คะแนนสูง
  const humidScore = (100 - obs.humidity) * 0.25

  // คะแนนลม — 20%
  // ลมแรงไม่เกิน 10 m/s = คะแนนสูง
  const windScore = Math.max(0, (10 - obs.wind_speed) / 10 * 100) * 0.2

  // คะแนนฝน — 15%
  // ถ้าไม่มีฝน = เต็ม 15 คะแนน
  const rainScore = obs.rain_rate === 0 ? 15 : 0

  const total = cloudScore + humidScore + windScore + rainScore
  return Math.round(Math.min(100, Math.max(0, total)))
}

// แปลง Score เป็นสีครับ
export function scoreToColor(score: number): string {
  if (score >= 70) return '#4ade80'  // เขียว = พร้อม
  if (score >= 40) return '#fbbf24'  // เหลือง = พอใช้
  return '#f87171'                    // แดง = ไม่พร้อม
}

// แปลง Score เป็นข้อความครับ
export function scoreToLabel(score: number): string {
  if (score >= 70) return 'พร้อม'
  if (score >= 40) return 'พอใช้'
  return 'ไม่พร้อม'
}