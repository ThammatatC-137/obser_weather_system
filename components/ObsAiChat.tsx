'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { COLORS, OBS_TIMEZONE } from '@/constants/observatories'
import { Observatory } from '@/types'
import { CloudForecastChart } from '@/components/CloudForecastChart'

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

type SkyFrame = {
  time: string
  imageUrl: string | null
  clearScore: number
  cloudPercent: number
  label: string
  hasData: boolean
}

type Props = { obs: Observatory }

function IconCloud({ color = '#8AAAC8' }: { color?: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6.5 18C4.51 18 2.9 16.39 2.9 14.4C2.9 12.63 4.17 11.17 5.88 10.87C6.46 7.55 9.35 5 12.8 5C16.83 5 20.15 8.13 20.3 12.12C21.82 12.55 22.9 13.95 22.9 15.6C22.9 17.59 21.29 19 19.3 19H6.5V18Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
}
function IconHumid() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3C12 3 5 10 5 15C5 18.87 8.13 22 12 22C15.87 22 19 18.87 19 15C19 10 12 3 12 3Z" stroke="#06D6A0" strokeWidth="1.5" fill="none"/></svg>
}
function IconWind() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 8H17C18.66 8 20 6.66 20 5C20 3.34 18.66 2 17 2C15.34 2 14 3.34 14 5" stroke="#06D6A0" strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M3 12H20C21.66 12 23 13.34 23 15C23 16.66 21.66 18 20 18C18.34 18 17 16.66 17 15" stroke="#06D6A0" strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M3 16H13C14.66 16 16 17.34 16 19C16 20.66 14.66 22 13 22C11.34 22 10 20.66 10 19" stroke="#06D6A0" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
}
function IconRain() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 16L4 20M10 16L8 20M14 16L12 20M18 16L16 20" stroke="#8AAAC8" strokeWidth="1.5" strokeLinecap="round"/><path d="M5 14C3.34 14 2 12.66 2 11C2 9.34 3.34 8 5 8C5.26 8 5.5 8.04 5.74 8.1C6.35 5.76 8.48 4 11 4C13.76 4 16 6.24 16 9H17C18.66 9 20 10.34 20 12C20 13.66 18.66 15 17 15H5V14Z" stroke="#8AAAC8" strokeWidth="1.5" fill="none"/></svg>
}
function IconTemp() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 14.76V3.5C14 2.12 12.88 1 11.5 1C10.12 1 9 2.12 9 3.5V14.76C7.24 15.98 6.5 18.09 7.07 20.22C7.79 22.89 10.43 24.36 13 23.55C15.08 22.9 16.36 21 16.48 18.9C16.6 17.22 15.61 15.72 14 14.76Z" stroke="#fff" strokeWidth="1.5" fill="none"/></svg>
}
function IconPressure() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#8AAAC8" strokeWidth="1.5" fill="none"/><path d="M12 8V12L15 14" stroke="#8AAAC8" strokeWidth="1.5" strokeLinecap="round"/></svg>
}

function getCloudLabel(pct: number): string {
  if (pct < 30) return 'CLEAR'
  if (pct < 60) return 'PARTLY CLOUDY'
  if (pct < 80) return 'CLOUDY'
  return 'OVERCAST'
}

function getNaritLabel(narit: string | undefined, pct: number | undefined): string {
  if (narit === 'Clear')   return 'CLEAR'
  if (narit === 'Partly')  return 'PARTLY CLOUDY'
  if (narit === 'Cloudy')  return 'CLOUDY'
  if (narit === 'Rainy')   return 'RAIN'
  if (narit === 'Overcast')return 'OVERCAST'
  return pct != null ? getCloudLabel(pct) : '--'
}

function getSkyStatus(obs: Observatory) {
  const rainRate = obs.rain_rate ?? 0
  const pct      = obs.pixel_cloud_percent
  const narit    = obs.narit_sky_status

  if (narit === 'Rainy' || rainRate > 0)
    return { label: 'DANGER',        sub: 'ฝนตกอยู่ครับ',              color: '#f87171', type: 'alert'   as const }
  if (narit === 'Cloudy')
    return { label: 'CLOUDY',        sub: 'เมฆปกคลุมท้องฟ้าครับ',      color: '#fbbf24', type: 'warning' as const }
  if (narit === 'Partly')
    return { label: 'PARTLY CLOUDY', sub: 'ท้องฟ้ามีเมฆบางส่วนครับ',   color: '#fbbf24', type: 'warning' as const }
  if (narit === 'Clear')
    return { label: 'CLEAR',         sub: 'ท้องฟ้าใสครับ',              color: '#4ade80', type: 'normal'  as const }

  const cnn = obs.cnn_prediction
  if (cnn === 'rain')          return { label: 'DANGER',        sub: 'ฝนตกอยู่ครับ',              color: '#f87171', type: 'alert'   as const }
  if (cnn === 'cloudy')        return { label: 'CLOUDY',         sub: 'เมฆปกคลุมท้องฟ้าครับ',      color: '#fbbf24', type: 'warning' as const }
  if (cnn === 'partly_cloudy') return { label: 'PARTLY CLOUDY', sub: 'ท้องฟ้ามีเมฆบางส่วนครับ',   color: '#fbbf24', type: 'warning' as const }
  if (cnn === 'clear')         return { label: 'CLEAR',          sub: 'ท้องฟ้าใสครับ',              color: '#4ade80', type: 'normal'  as const }

  if (pct != null) {
    if (pct >= 80) return { label: 'OVERCAST',      sub: 'เมฆปกคลุมทั้งหมดครับ',    color: '#f87171', type: 'alert'   as const }
    if (pct >= 60) return { label: 'CLOUDY',         sub: 'เมฆปกคลุมท้องฟ้าครับ',    color: '#fbbf24', type: 'warning' as const }
    if (pct >= 30) return { label: 'PARTLY CLOUDY',  sub: 'ท้องฟ้ามีเมฆบางส่วนครับ', color: '#fbbf24', type: 'warning' as const }
    return           { label: 'CLEAR',               sub: 'ท้องฟ้าใสครับ',            color: '#4ade80', type: 'normal'  as const }
  }

  return { label: 'CLEAR', sub: 'ท้องฟ้าใสครับ', color: '#4ade80', type: 'normal' as const }
}

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const h = () => setW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return w
}

const SvgIcon = ({ d, d2 }: { d: string; d2?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={d} />{d2 && <path d={d2} />}
  </svg>
)

const OBS_SUGGESTIONS = [
  { icon: <SvgIcon d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" d2="M12 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />, text: 'ตอนนี้เปิดโดมได้ไหม?' },
  { icon: <SvgIcon d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />, text: 'คืนนี้เหมาะดูดาวไหม?' },
  { icon: <SvgIcon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />, text: 'พรุ่งนี้ดีกว่าวันนี้ไหม?' },
  { icon: <SvgIcon d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" d2="M8 19v2M12 21v-2M16 19v2" />, text: 'ฝนจะหยุดเมื่อไหร่?' },
]

export default function ObsAiChat({ obs }: Props) {
  const [messages,        setMessages]        = useState<Message[]>([])
  const [input,           setInput]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [frames,     setFrames]     = useState<SkyFrame[]>([])
  const [prediction, setPrediction] = useState<string | null>(null)
  const [animIdx,    setAnimIdx]    = useState(0)
  const [manualIdx,  setManualIdx]  = useState<number | null>(null)
  const [clock,      setClock]      = useState('')
  const [systemLogs, setSystemLogs] = useState<{time: string; level: string; msg: string}[]>([])
  const [hoveredBox, setHoveredBox] = useState<string | null>(null)
  const width = useWindowWidth()

  const chatEndRef = useRef<HTMLDivElement>(null)
  const prevKey    = useRef('')

  const isMobile = width < 640
  const isTablet = width >= 640 && width < 1024

  useEffect(() => {
    if (frames.length === 0) return
    if (manualIdx !== null) {
      const t = setTimeout(() => setManualIdx(null), 5000)
      return () => clearTimeout(t)
    }
    const t = setInterval(() => setAnimIdx(p => (p + 1) % frames.length), 1000)
    return () => clearInterval(t)
  }, [frames.length, manualIdx])

  const displayIdx   = manualIdx !== null ? manualIdx : animIdx
  const cloudPercent = obs.pixel_cloud_percent ?? 0

  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date()
      setClock(now.toLocaleTimeString('en-GB', { timeZone: OBS_TIMEZONE[obs.observatory_id] || 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const fetchFrames = useCallback(async () => {
    try {
      const res  = await fetch(`/api/history?id=${obs.observatory_id}`)
      const json = await res.json()

      const baseTime = new Date()
      const tz = OBS_TIMEZONE[obs.observatory_id] || 'UTC'
      const generatedFrames: SkyFrame[] = []

      for (let i = 4; i >= 0; i--) {
        const targetDate = new Date(baseTime.getTime() - i * 60000)
        const timeKey = targetDate.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' })

        if (i === 0) {
          const curCloud = obs.pixel_cloud_percent ?? 0
          generatedFrames.push({ time: timeKey, imageUrl: obs.narit_image_url ?? null, clearScore: 100 - curCloud, cloudPercent: curCloud, label: timeKey, hasData: true })
        } else {
          const nearest = Array.isArray(json.data)
            ? json.data
                .filter((r: any) => new Date(r.timestamp).getTime() <= targetDate.getTime())
                .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
            : null

          if (nearest) {
            const cloudVal = nearest.pixel_cloud_percent ?? 0
            generatedFrames.push({ time: timeKey, imageUrl: nearest.narit_image_url ?? null, clearScore: 100 - cloudVal, cloudPercent: cloudVal, label: timeKey, hasData: nearest.pixel_cloud_percent != null })
          } else {
            generatedFrames.push({ time: timeKey, imageUrl: null, clearScore: 0, cloudPercent: 0, label: timeKey, hasData: false })
          }
        }
      }

      setFrames(generatedFrames)
      setAnimIdx(generatedFrames.length - 1)

      const isRaining = obs.narit_sky_status === 'Rainy' || (obs.rain_rate ?? 0) > 0

      if (obs.ai_prediction) {
        // ถ้า AI prediction บอกว่าดีขึ้นแต่ฝนตกอยู่ → ไม่แสดง
        const predPositive = obs.ai_prediction.includes('ใส') || obs.ai_prediction.includes('โปร่ง') || obs.ai_prediction.includes('ลดลง')
        setPrediction(isRaining && predPositive ? null : obs.ai_prediction)
      } else {
        // ถ้าฝนตกอยู่ → ไม่ทำนายจาก pixel trend (ข้อมูล % เมฆไม่สะท้อนฝนจริง)
        if (isRaining) { setPrediction(null); return }

        const validFrames = generatedFrames.filter(f => f.hasData)
        if (validFrames.length >= 2) {
          const first     = validFrames[0].cloudPercent
          const last      = validFrames[validFrames.length - 1].cloudPercent
          const diff      = last - first
          const mins_span = validFrames.length
          if (diff > 15) {
            const rate      = diff / mins_span
            const remaining = 100 - last
            const mins      = rate > 0 ? Math.round(remaining / rate) : 0
            setPrediction(`เมฆเพิ่มขึ้น ${Math.round(diff)}% ใน ${mins_span} นาที — คาดอีก ~${mins} นาทีฟ้าจะมืดครับ`)
          } else if (diff < -15) {
            setPrediction(`เมฆลดลง ${Math.round(Math.abs(diff))}% ใน ${mins_span} นาที — ฟ้ากำลังใสขึ้นครับ`)
          } else {
            setPrediction(null)
          }
        }
      }
    } catch (e) { console.error('Error fetching frames:', e) }
  }, [obs.observatory_id, obs.pixel_cloud_percent, obs.narit_image_url, obs.ai_prediction])

  useEffect(() => {
    const status = getSkyStatus(obs)
    const key = `${status.type}-${obs.pixel_cloud_percent}-${obs.rain_rate}-${obs.narit_sky_status ?? ''}`
    if (prevKey.current === key) return
    prevKey.current = key

    const now       = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    const level     = status.type === 'alert' ? 'DANGER' : status.type === 'warning' ? 'WARN' : 'INFO'
    const trendText = obs.ai_trend ? ` | ${obs.ai_trend}` : ''
    const msg       = `${status.label} — ${status.sub} | เมฆ ${cloudPercent}% | ความชื้น ${obs.humidity ?? '--'}%${trendText}`

    setSystemLogs(prev => [{ time: now, level, msg }, ...prev].slice(0, 10))
  }, [obs, cloudPercent])

  useEffect(() => {
    fetchFrames()
    const t = setInterval(fetchFrames, 60000)
    return () => clearInterval(t)
  }, [fetchFrames])

  const send = async (q?: string) => {
    const question = (q ?? input).trim()
    if (!question || loading) return
    setInput('')
    setLoading(true)
    const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { role: 'user', content: question, timestamp: now }])
    try {
      const res  = await fetch('/api/ai-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, observatories: [obs], mode: 'observatory' }),
      })
      const data = await res.json()
      const now2 = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || 'ไม่สามารถตอบได้ครับ', timestamp: now2 }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'เกิดข้อผิดพลาดในการเชื่อมต่อครับ', timestamp: now }])
    } finally { setLoading(false) }
  }

  const status          = getSkyStatus(obs)
  const frameCloudColor = (cloud: number) => cloud >= 60 ? '#f87171' : cloud >= 30 ? '#fbbf24' : '#4ade80'
  const logColor        = (l: string) => l === 'DANGER' ? '#f87171' : l === 'WARN' ? '#fbbf24' : '#4ade80'
  const cardBg          = 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)'
  const boxTemplateBg   = 'linear-gradient(135deg, #16223f 0%, #0d1627 50%, #161c30 100%)'

  function SensorBox({ idKey, Icon, label, value, color = '#8AAAC8' }: { idKey: string; Icon: React.FC<{color?: string}>; label: string; value: string; color?: string }) {
    const isHov = hoveredBox === idKey
    return (
      <div
        onMouseEnter={() => setHoveredBox(idKey)}
        onMouseLeave={() => setHoveredBox(null)}
        style={{
          background: boxTemplateBg,
          border: `1px solid ${isHov ? `${color}60` : 'rgba(255,255,255,0.06)'}`,
          borderRadius: '12px',
          boxShadow: isHov ? `0 12px 28px rgba(0,0,0,0.55), 0 0 0 1px ${color}20` : '0 4px 20px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', padding: '16px 18px', gap: '12px', minWidth: 0,
          transform: isHov ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s, border-color 0.2s',
          cursor: 'default',
        }}
      >
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}><Icon color={color} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
          <div style={{ fontSize: '22px', fontWeight: 600, color, marginTop: '4px', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: cardBg, border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', overflow: 'hidden', fontFamily: 'var(--font-poppins)' }}>

      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7l4-2 10 5-4 2L3 7z"/><path d="M17 10l2 8"/><path d="M13 12l1 5"/><path d="M15 18H10"/><path d="M12 18v3"/>
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', letterSpacing: '0.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? '160px' : 'none' }}>{isMobile ? obs.name.toUpperCase() : `${obs.name.toUpperCase()} — COMMAND CENTER`}</span>
        </div>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>{clock}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* SKY CAMERA */}
        <div style={{ padding: '12px', borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)', borderBottom: isMobile ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
          <div style={{ fontSize: '12px', color: '#fff', letterSpacing: '0.12em', marginBottom: '8px', fontWeight: 600 }}>SKY CAMERA — REALTIME</div>

          <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', aspectRatio: '1', background: 'rgba(0,0,0,0.5)', marginBottom: '8px' }}>
            {frames.length > 0 && frames[displayIdx]?.imageUrl
              ? <img src={frames[displayIdx].imageUrl!} alt="allsky" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
              : obs.narit_image_url
                ? <img src={obs.narit_image_url} alt="allsky" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>NO SIGNAL</span></div>
            }

            {/* ป้าย: % เปลี่ยนตาม frame, label มาจาก NARIT */}
            <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.8)', borderRadius: '4px', padding: '2px 7px', fontSize: '10px', fontWeight: 600, color: status.color }}>
              {`CLOUD: ${frames.length > 0 && frames[displayIdx]?.hasData ? frames[displayIdx].cloudPercent : obs.pixel_cloud_percent ?? '--'}% — ${getNaritLabel(obs.narit_sky_status, obs.pixel_cloud_percent)}`}
            </div>

            <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.8)', borderRadius: '4px', padding: '2px 7px', fontSize: '9px', color: COLORS.teal, letterSpacing: '0.06em' }}>
              {frames.length > 0 ? frames[displayIdx]?.time : 'NOW'}
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#fff', letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 600 }}>HISTORY — 5 MIN</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
            {frames.length > 0
              ? frames.map((f, i) => (
                <div key={i} onClick={() => setManualIdx(i)} style={{ cursor: 'pointer', minWidth: 0 }}>
                  <div style={{ borderRadius: '4px', overflow: 'hidden', aspectRatio: '1', background: 'rgba(0,0,0,0.5)', border: i === displayIdx ? `2px solid ${COLORS.teal}` : '1px solid rgba(255,255,255,0.06)' }}>
                    {f.imageUrl
                      ? <img src={f.imageUrl} alt={f.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.15)' }}>-</span></div>
                    }
                  </div>
                  <div style={{ fontSize: '11px', color: i === displayIdx ? COLORS.teal : 'rgba(255,255,255,0.5)', marginTop: '4px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</div>
                  <div style={{ fontSize: '11px', color: f.hasData ? frameCloudColor(f.cloudPercent) : 'rgba(255,255,255,0.2)', fontWeight: 600, textAlign: 'center' }}>{f.hasData ? `${f.cloudPercent}%` : '--'}</div>
                </div>
              ))
              : Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ minWidth: 0 }}>
                  <div style={{ borderRadius: '4px', overflow: 'hidden', aspectRatio: '1', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }} />
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', textAlign: 'center' }}>--:--</div>
                </div>
              ))
            }
          </div>
        </div>

        {/* SENSOR DATA + CHAT */}
        <div style={{ padding: '12px', borderRight: (isTablet || (!isMobile && !isTablet)) ? '1px solid rgba(255,255,255,0.06)' : 'none', borderBottom: isMobile ? '1px solid rgba(255,255,255,0.06)' : 'none', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '12px', color: '#fff', letterSpacing: '0.12em', marginBottom: '12px', fontWeight: 600 }}>SENSOR DATA</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <SensorBox idKey="cloud"    Icon={IconCloud}    label="CLOUD"    value={`${cloudPercent}%`} color={status.color} />
            <SensorBox idKey="humid"    Icon={IconHumid}    label="HUMIDITY" value={obs.humidity != null ? `${obs.humidity}%` : '--'} color={(obs.humidity ?? 0) > 85 ? '#f87171' : (obs.humidity ?? 0) > 70 ? '#fbbf24' : '#06D6A0'} />
            <SensorBox idKey="wind"     Icon={IconWind}     label="WIND"     value={obs.wind_speed != null ? `${obs.wind_speed} m/s` : '--'} color="#06D6A0" />
            <SensorBox idKey="rain"     Icon={IconRain}     label="RAIN"     value={`${obs.rain_rate ?? 0} mm`} color={(obs.rain_rate ?? 0) > 0 ? '#f87171' : '#4ade80'} />
            <SensorBox idKey="temp"     Icon={IconTemp}     label="TEMP"     value={obs.temperature != null ? `${obs.temperature.toFixed(1)}°C` : '--'} color="#fff" />
            <SensorBox idKey="pressure" Icon={IconPressure} label="PRESSURE" value={obs.pressure != null ? `${obs.pressure.toFixed(1)} hPa` : '--'} color="#8AAAC8" />
          </div>

          <div
            onMouseEnter={() => setHoveredBox('chat_box')}
            onMouseLeave={() => setHoveredBox(null)}
            style={{
              background: boxTemplateBg,
              border: `1px solid ${hoveredBox === 'chat_box' ? `${status.color}60` : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '12px', padding: '16px 16px 12px 16px',
              boxShadow: hoveredBox === 'chat_box' ? `0 12px 28px rgba(0,0,0,0.55), 0 0 0 1px ${status.color}20` : '0 4px 20px rgba(0,0,0,0.4)',
              transform: hoveredBox === 'chat_box' ? 'translateY(-4px)' : 'translateY(0)',
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s, border-color 0.2s',
              flex: 1, display: 'flex', flexDirection: 'column', marginTop: '16px', minHeight: 0, cursor: 'default',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', fontWeight: 600 }}>AI INTERACTIVE CHAT</span>
              {messages.length > 0 && (
                <button onClick={() => setMessages([])}
                  style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '4px', color: '#f87171', padding: '2px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-poppins)', letterSpacing: '0.05em' }}>
                  CLEAR
                </button>
              )}
            </div>

            {/* Suggestion chips */}
            {!loading && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                {OBS_SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s.text)}
                    style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '16px', color: 'rgba(255,255,255,0.7)', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'var(--font-poppins)', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(167,139,250,0.16)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(167,139,250,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)' }}
                  >
                    {s.icon}<span>{s.text}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px', marginBottom: '12px' }}>
              {messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', background: m.role === 'user' ? 'rgba(6,214,160,0.1)' : 'rgba(255,255,255,0.03)', border: m.role === 'user' ? '1px solid rgba(6,214,160,0.2)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: m.role === 'user' ? COLORS.teal : '#a78bfa' }}>{m.role === 'user' ? 'YOU' : 'AI'}</span>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>{m.timestamp}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.4', whiteSpace: 'pre-line' }}>{m.content}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{'>'}</span>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="ถาม AI ได้เลยครับ..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '12px', fontFamily: 'var(--font-poppins)' }}
              />
              <button onClick={() => send()} disabled={loading} style={{ background: 'transparent', border: `1px solid ${loading ? 'rgba(255,255,255,0.1)' : 'rgba(6,214,160,0.3)'}`, borderRadius: '4px', color: loading ? 'rgba(255,255,255,0.3)' : COLORS.teal, padding: '3px 10px', fontSize: '11px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-poppins)' }}>
                {loading ? '...' : 'ถาม AI'}
              </button>
            </div>
          </div>
        </div>

        {/* AI ANALYSIS */}
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: '#fff', letterSpacing: '0.12em', fontWeight: 600 }}>AI ANALYSIS</div>

          <div onMouseEnter={() => setHoveredBox('status_box')} onMouseLeave={() => setHoveredBox(null)} style={{ background: boxTemplateBg, border: `1px solid ${hoveredBox === 'status_box' ? `${status.color}60` : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '16px', boxShadow: hoveredBox === 'status_box' ? `0 12px 28px rgba(0,0,0,0.55), 0 0 0 1px ${status.color}20` : '0 4px 20px rgba(0,0,0,0.4)', transform: hoveredBox === 'status_box' ? 'translateY(-4px)' : 'translateY(0)', transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s, border-color 0.2s', cursor: 'default' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', fontWeight: 600 }}>STATUS</div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: status.color, letterSpacing: '0.06em', marginTop: '4px' }}>{status.label}</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '6px', lineHeight: '1.4' }}>{status.sub}</div>
          </div>

          <div onMouseEnter={() => setHoveredBox('trend_box')} onMouseLeave={() => setHoveredBox(null)} style={{ background: boxTemplateBg, border: `1px solid ${hoveredBox === 'trend_box' ? `${status.color}60` : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '16px', boxShadow: hoveredBox === 'trend_box' ? `0 12px 28px rgba(0,0,0,0.55), 0 0 0 1px ${status.color}20` : '0 4px 20px rgba(0,0,0,0.4)', transform: hoveredBox === 'trend_box' ? 'translateY(-4px)' : 'translateY(0)', transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s, border-color 0.2s', cursor: 'default' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '10px' }}>
              CLOUD TREND
            </div>
            <CloudForecastChart obsId={obs.observatory_id} currentPct={cloudPercent} />
          </div>

          {prediction && (
            <div onMouseEnter={() => setHoveredBox('pred_box')} onMouseLeave={() => setHoveredBox(null)} style={{ background: boxTemplateBg, border: `1px solid ${hoveredBox === 'pred_box' ? `${status.color}60` : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '16px', boxShadow: hoveredBox === 'pred_box' ? `0 12px 28px rgba(0,0,0,0.55), 0 0 0 1px ${status.color}20` : '0 4px 20px rgba(0,0,0,0.4)', transform: hoveredBox === 'pred_box' ? 'translateY(-4px)' : 'translateY(0)', transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s, border-color 0.2s', cursor: 'default' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '6px' }}>PREDICTION</div>
              <div style={{ fontSize: '12.5px', color: '#fbbf24', lineHeight: '1.5' }}>{prediction}</div>
            </div>
          )}

          <div onMouseEnter={() => setHoveredBox('log_box')} onMouseLeave={() => setHoveredBox(null)} style={{ background: boxTemplateBg, border: `1px solid ${hoveredBox === 'log_box' ? `${status.color}60` : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '16px', boxShadow: hoveredBox === 'log_box' ? `0 12px 28px rgba(0,0,0,0.55), 0 0 0 1px ${status.color}20` : '0 4px 20px rgba(0,0,0,0.4)', transform: hoveredBox === 'log_box' ? 'translateY(-4px)' : 'translateY(0)', transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s, border-color 0.2s', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, cursor: 'default' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '12px' }}>EVENT LOG</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
              {(systemLogs.length > 0 ? systemLogs : [{ time: '--:--', level: 'INFO', msg: 'รอข้อมูลครับ...' }]).map((log, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>{log.time}</span>
                    <span style={{ fontSize: '11px', color: logColor(log.level), fontWeight: 700, letterSpacing: '0.05em' }}>[{log.level}]</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5', paddingLeft: '2px', wordBreak: 'break-word' }}>{log.msg}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}