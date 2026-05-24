'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { COLORS } from '@/constants/observatories'
import { Observatory } from '@/types'

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
function IconStar({ color = '#FFD166' }: { color?: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function getSkyStatus(obs: Observatory) {
  if (obs.cnn_prediction) {
    const rain = obs.narit_score_rain ?? 0
    const rainRate = obs.rain_rate ?? 0
    if (obs.cnn_prediction === 'rain' || rain > 0.3 || rainRate > 0)
      return { label: 'DANGER', sub: 'ฝนตก ไม่ควรเปิดโดมครับ', color: '#f87171', type: 'alert' as const }
    if (obs.cnn_prediction === 'cloudy')
      return { label: 'WARNING', sub: 'เมฆเยอะ รอก่อนนะครับ', color: '#fbbf24', type: 'warning' as const }
    if (obs.cnn_prediction === 'partly_cloudy')
      return { label: 'CAUTION', sub: 'ท้องฟ้าผสม ระวังเมฆเข้าครับ', color: '#fbbf24', type: 'warning' as const }
    if (obs.cnn_prediction === 'clear')
      return { label: 'CLEAR', sub: 'ฟ้าใส เหมาะดูดาวมากครับ', color: '#4ade80', type: 'normal' as const }
  }
  const clear = obs.narit_score_clear ?? 0
  const rain = obs.narit_score_rain ?? 0
  const rainRate = obs.rain_rate ?? 0
  if (rain > 0.3 || rainRate > 0)
    return { label: 'DANGER', sub: 'ฝนตก ไม่ควรเปิดโดมครับ', color: '#f87171', type: 'alert' as const }
  if (clear < 0.3)
    return { label: 'WARNING', sub: 'เมฆเยอะ รอก่อนนะครับ', color: '#fbbf24', type: 'warning' as const }
  if (clear < 0.7)
    return { label: 'CAUTION', sub: 'ท้องฟ้าผสม ระวังเมฆด้วยนะครับ', color: '#fbbf24', type: 'warning' as const }
  return { label: 'CLEAR', sub: 'ฟ้าใส เหมาะดูดาวมากครับ', color: '#4ade80', type: 'normal' as const }
}

export default function ObsAiChat({ obs }: Props) {
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [frames,     setFrames]     = useState<SkyFrame[]>([])
  const [prediction, setPrediction] = useState<string | null>(null)
  const [animIdx,    setAnimIdx]    = useState(0)
  const [clock,      setClock]      = useState('')
  const [systemLogs, setSystemLogs] = useState<{time: string; level: string; msg: string}[]>([])
  const [hoveredBox, setHoveredBox] = useState<string | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const prevKey    = useRef('')

  useEffect(() => {
    if (frames.length === 0) return
    const t = setInterval(() => setAnimIdx(p => (p + 1) % frames.length), 1000)
    return () => clearInterval(t)
  }, [frames.length])

  const cloudPercent = obs.cnn_prediction
    ? Math.round(((obs.cnn_score_cloudy ?? 0) + (obs.cnn_score_partly_cloudy ?? 0)) * 100)
    : Math.round(100 - (obs.narit_score_clear ?? 0) * 100)

  // สีดาว — เขียว ≥ 20, เหลือง 5-19, แดง < 5
  const starColor = obs.star_count == null
    ? '#8AAAC8'
    : obs.star_count >= 20 ? '#4ade80'
    : obs.star_count >= 5  ? '#fbbf24'
    : '#f87171'

  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date()
      setClock(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchFrames = useCallback(async () => {
    try {
      const res  = await fetch(`/api/history?id=${obs.observatory_id}`)
      const json = await res.json()

      const baseTime = new Date()
      const generatedFrames: SkyFrame[] = []

      for (let i = 4; i >= 0; i--) {
        const targetDate = new Date(baseTime.getTime() - i * 60000)
        const timeKey = targetDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

        if (i === 0) {
          const curClear = Math.round((obs.narit_score_clear ?? 0) * 100)
          generatedFrames.push({ time: timeKey, imageUrl: obs.narit_image_url ?? null, clearScore: curClear, cloudPercent: 100 - curClear, label: timeKey })
        } else {
          const match = Array.isArray(json.data) ? json.data.find((r: any) => {
            const rTimestamp = new Date(r.timestamp).getTime()
            return Math.abs(rTimestamp - targetDate.getTime()) <= 45000
          }) : null

          if (match) {
            const clearVal = Math.round((match.narit_score_clear ?? 0) * 100)
            generatedFrames.push({ time: timeKey, imageUrl: match.narit_image_url ?? null, clearScore: clearVal, cloudPercent: 100 - clearVal, label: timeKey })
          } else {
            generatedFrames.push({ time: timeKey, imageUrl: null, clearScore: 0, cloudPercent: 0, label: timeKey })
          }
        }
      }

      setFrames(generatedFrames)
      setAnimIdx(generatedFrames.length - 1)

      if (generatedFrames.length >= 2) {
        const diff = generatedFrames[generatedFrames.length - 1].clearScore - generatedFrames[0].clearScore
        if (diff < -15) {
          const rate = Math.abs(diff) / generatedFrames.length
          const mins = rate > 0 ? Math.round(generatedFrames[generatedFrames.length - 1].clearScore / rate) : 0
          setPrediction(`เมฆเพิ่มขึ้น ${Math.abs(diff)}% ใน 5 นาที — คาดอีก ~${mins} นาทีฟ้าจะมืดครับ`)
        } else if (diff > 15) {
          setPrediction(`เมฆลดลง ${diff}% ใน 5 นาที — ฟ้ากำลังใสขึ้นครับ`)
        } else {
          setPrediction(null)
        }
      }
    } catch (e) { console.error('Error fetching frames:', e) }
  }, [obs.observatory_id, obs.narit_score_clear, obs.narit_image_url])

  useEffect(() => {
    const status = getSkyStatus(obs)
    const key = `${status.type}-${obs.narit_score_clear}-${obs.rain_rate}-${obs.cnn_prediction ?? ''}-${obs.star_count ?? ''}`
    if (prevKey.current === key) return
    prevKey.current = key

    const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    const level = status.type === 'alert' ? 'DANGER' : status.type === 'warning' ? 'WARN' : 'INFO'
    const starMsg = obs.star_count != null ? ` | ดาว ${obs.star_count} ดวง` : ''
    const msg = `${status.sub} | เมฆ ${cloudPercent}% ความชื้น ${obs.humidity ?? '--'}%${starMsg}`

    setSystemLogs(prev => [{ time: now, level, msg }, ...prev].slice(0, 10))
  }, [obs, cloudPercent])

  useEffect(() => {
    fetchFrames()
    const t = setInterval(fetchFrames, 60000)
    return () => clearInterval(t)
  }, [fetchFrames])

  const send = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
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

  const status = getSkyStatus(obs)
  const frameCloudColor = (cloud: number) => cloud >= 60 ? '#f87171' : cloud >= 30 ? '#fbbf24' : '#4ade80'
  const logColor = (l: string) => l === 'DANGER' ? '#f87171' : l === 'WARN' ? '#fbbf24' : '#4ade80'

  const cardBg        = 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)'
  const boxTemplateBg = 'linear-gradient(135deg, #16223f 0%, #0d1627 50%, #161c30 100%)'

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
    <div style={{ background: cardBg, border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', overflow: 'hidden', fontFamily: 'monospace' }}>

      {/* Header */}
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7l4-2 10 5-4 2L3 7z"/><path d="M17 10l2 8"/><path d="M13 12l1 5"/><path d="M15 18H10"/><path d="M12 18v3"/>
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', letterSpacing: '0.1em' }}>{obs.name.toUpperCase()} — COMMAND CENTER</span>
        </div>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>{clock}</span>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* SKY CAMERA */}
        <div style={{ padding: '12px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#fff', letterSpacing: '0.12em', marginBottom: '8px', fontWeight: 600 }}>SKY CAMERA — REALTIME</div>

          <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', aspectRatio: '1', background: 'rgba(0,0,0,0.5)', marginBottom: '8px' }}>
            {frames.length > 0 && frames[animIdx]?.imageUrl
              ? <img src={frames[animIdx].imageUrl!} alt="allsky" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
              : obs.narit_image_url
                ? <img src={obs.narit_image_url} alt="allsky" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>NO SIGNAL</span></div>
            }
            <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.8)', borderRadius: '4px', padding: '2px 7px', fontSize: '10px', fontWeight: 600, color: status.color }}>
              {obs.cnn_prediction ? `CNN: ${obs.cnn_prediction.replace(/_/g, ' ').toUpperCase()} ${Math.round((obs.cnn_confidence ?? 0) * 100)}%` : `CLEAR ${Math.round((obs.narit_score_clear ?? 0) * 100)}%`}
            </div>
            {/* Star count badge */}
            {obs.star_count != null && (
              <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.8)', borderRadius: '4px', padding: '2px 7px', fontSize: '10px', fontWeight: 600, color: starColor }}>
                ★ {obs.star_count}
              </div>
            )}
            <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.8)', borderRadius: '4px', padding: '2px 7px', fontSize: '9px', color: COLORS.teal, letterSpacing: '0.06em' }}>
              {frames.length > 0 ? frames[animIdx]?.time : 'NOW'}
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#fff', letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 600 }}>HISTORY — 5 MIN</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
            {frames.length > 0
              ? frames.map((f, i) => (
                <div key={i} onClick={() => setAnimIdx(i)} style={{ cursor: 'pointer', minWidth: 0 }}>
                  <div style={{ borderRadius: '4px', overflow: 'hidden', aspectRatio: '1', background: 'rgba(0,0,0,0.5)', border: i === animIdx ? `2px solid ${COLORS.teal}` : '1px solid rgba(255,255,255,0.06)' }}>
                    {f.imageUrl
                      ? <img src={f.imageUrl} alt={f.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.15)' }}>-</span></div>
                    }
                  </div>
                  <div style={{ fontSize: '11px', color: i === animIdx ? COLORS.teal : 'rgba(255,255,255,0.5)', marginTop: '4px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</div>
                  <div style={{ fontSize: '11px', color: frameCloudColor(f.cloudPercent), fontWeight: 600, textAlign: 'center' }}>{f.cloudPercent}%</div>
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
        <div style={{ padding: '12px', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '12px', color: '#fff', letterSpacing: '0.12em', marginBottom: '12px', fontWeight: 600 }}>SENSOR DATA</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <SensorBox idKey="cloud"    Icon={IconCloud}    label="CLOUD"    value={obs.cnn_prediction ? obs.cnn_prediction.replace(/_/g, ' ').toUpperCase() : `${cloudPercent}%`} color={status.color} />
            <SensorBox idKey="humid"    Icon={IconHumid}    label="HUMIDITY" value={obs.humidity != null ? `${obs.humidity}%` : '--'} color={(obs.humidity ?? 0) > 85 ? '#f87171' : (obs.humidity ?? 0) > 70 ? '#fbbf24' : '#06D6A0'} />
            <SensorBox idKey="wind"     Icon={IconWind}     label="WIND"     value={obs.wind_speed != null ? `${obs.wind_speed} m/s` : '--'} color="#06D6A0" />
            <SensorBox idKey="rain"     Icon={IconRain}     label="RAIN"     value={`${obs.rain_rate ?? 0} mm`} color={(obs.rain_rate ?? 0) > 0 ? '#f87171' : '#4ade80'} />
            <SensorBox idKey="temp"     Icon={IconTemp}     label="TEMP"     value={obs.temperature != null ? `${obs.temperature.toFixed(1)}°C` : '--'} color="#fff" />
            <SensorBox idKey="pressure" Icon={IconPressure} label="PRESSURE" value={obs.pressure != null ? `${obs.pressure.toFixed(1)} hPa` : '--'} color="#8AAAC8" />
            <SensorBox idKey="stars"    Icon={IconStar}     label="STARS"    value={obs.star_count != null ? `${obs.star_count} ดวง` : '--'} color={starColor} />
          </div>

          {/* AI CHAT */}
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
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '12px' }}>AI INTERACTIVE CHAT</div>
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
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="ถาม AI ได้เลยครับ..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} />
              <button onClick={send} disabled={loading} style={{ background: 'transparent', border: `1px solid ${loading ? 'rgba(255,255,255,0.1)' : 'rgba(6,214,160,0.3)'}`, borderRadius: '4px', color: loading ? 'rgba(255,255,255,0.3)' : COLORS.teal, padding: '3px 10px', fontSize: '11px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'monospace' }}>
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
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '12px' }}>CLOUD TREND (ปริมาณเมฆย้อนหลัง)</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '55px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {frames.length > 0
                ? frames.map((f, i) => {
                    const isNow = i === frames.length - 1
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px', color: isNow ? status.color : 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{f.cloudPercent}%</span>
                        <div style={{ width: '100%', background: isNow ? status.color : `${status.color}40`, borderRadius: '3px 3px 0 0', height: `${Math.max(6, (f.cloudPercent / 100) * 32)}px`, border: isNow ? `1px solid ${status.color}` : 'none', transition: 'height 0.3s' }} />
                      </div>
                    )
                  })
                : Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>--%</span>
                      <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '2px 2px 0 0', height: '6px' }} />
                    </div>
                  ))
              }
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>{frames.length > 0 ? frames[0].time : '--:--'}</span>
              <span style={{ fontSize: '10px', color: COLORS.teal, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{frames.length > 0 ? frames[frames.length - 1].time : '--:--'}</span>
            </div>
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