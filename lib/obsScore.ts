// คำนวณคะแนนความพร้อมดูดาว 0-100 จากสภาพอากาศ

import { Observatory } from '@/types'

export function calcScore(obs: Observatory): number {

  if (obs.rain_rate > 0)     return 0  // ฝนตกให้ 0
  if (obs.cloud_cover >= 95) return 0  // เมฆเกือบเต็มท้องฟ้าให้ 0
  const cloudScore = (100 - obs.cloud_cover) * 0.60
  const humidRaw = obs.humidity <= 70
    ? 100
    : Math.max(0, 100 - (obs.humidity - 70) * 3.33)
  const humidScore = humidRaw * 0.25

  const rainScore = obs.rain_rate === 0 ? 15 : 0

  const total = cloudScore + humidScore + rainScore
  return Math.round(Math.min(100, Math.max(0, total)))
}

export function scoreToColor(score: number): string {
  if (score >= 70) return '#4ade80' 
  if (score >= 40) return '#fbbf24'  
  return '#f87171'                    
}


export function scoreToLabel(score: number): string {
  if (score >= 70) return 'พร้อม'
  if (score >= 40) return 'พอใช้'
  return 'ไม่พร้อม'
}