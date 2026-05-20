'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { COLORS } from '@/constants/observatories'
import { Observatory } from '@/types'

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  type?: 'alert' | 'warning' | 'normal'
}

type TemporalFrame = {
  label: string
  time: string
  clearScore: number
  imageUrl: string | null
}

type Props = { obs: Observatory }

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
}

function IconTelescope() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l4-2 10 5-4 2L3 7z"/>
      <path d="M17 10l2 8"/>
      <path d="M13 12l1 5"/>
      <path d="M15 18H10"/>
      <path d="M12 18v3"/>
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )
}

function getSkyStatus(obs: Observatory): { label: string; color: string; type: 'alert' | 'warning' | 'normal' } {
  const clear      = obs.narit_score_clear ?? 0
  const rain       = obs.narit_score_rain  ?? 0
  const cloudCover = obs.cloud_cover       ?? 0
  const rainRate   = obs.rain_rate         ?? 0

  if (rain > 0.3 || rainRate > 0)
    return { label: '❌ ฝนตก ไม่ควรเปิดโดมครับ', color: '#f87171', type: 'alert' }
  if (cloudCover > 70)
    return { label: '⚠️ เมฆเยอะ รอก่อนนะครับ', color: '#fbbf24', type: 'warning' }
  if (clear > 0.7 || cloudCover < 20)
    return { label: '✅ ฟ้าใส เหมาะดูดาวมากครับ', color: '#4ade80', type: 'normal' }
  return { label: '⚠️ ท้องฟ้าผสม ระวังเมฆด้วยนะครับ', color: '#fbbf24', type: 'warning' }
}

export default function ObsAiChat({ obs }: Props) {
  const [messages,    setMessages]    = useState<Message[]>([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [frames,      setFrames]      = useState<TemporalFrame[]>([])
  const [prediction,  setPrediction]  = useState<string | null>(null)
  const bottomRef     = useRef<HTMLDivElement>(null)
  const prevStatusRef = useRef<string>('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ดึงข้อมูล Temporal ย้อนหลัง 15 นาที
  const fetchTemporal = useCallback(async () => {
    try {
      const res  = await fetch(`/api/history?id=${obs.observatory_id}`)
      const json = await res.json()
      if (!json.success || !Array.isArray(json.data) || json.data.length === 0) return

      const recent = json.data.slice(-16)
      const len    = recent.length

      // เลือก 4 จุด — t-15, t-10, t-5, ตอนนี้
      const picks = [
        { label: 't-15 นาที', idx: Math.max(0, len - 16) },
        { label: 't-10 นาที', idx: Math.max(0, len - 11) },
        { label: 't-5 นาที',  idx: Math.max(0, len - 6)  },
        { label: 'ตอนนี้',    idx: len - 1                },
      ]

      const frameList: TemporalFrame[] = picks.map(p => {
        const r = recent[p.idx]
        return {
          label:      p.label,
          time:       new Date(r.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          clearScore: Math.round((r.narit_score_clear ?? 0) * 100),
          imageUrl:   r.narit_image_url ?? null,
        }
      })

      setFrames(frameList)

      // คำนวณ trend
      if (frameList.length >= 2) {
        const first = frameList[0].clearScore
        const last  = frameList[frameList.length - 1].clearScore
        const diff  = last - first

        if (diff < -20) {
          const rate     = Math.abs(diff) / 15  // % ต่อนาที
          const minsLeft = rate > 0 ? Math.round(last / rate) : 0
          setPrediction(`เมฆเพิ่มขึ้น ${Math.abs(diff)}% ใน 15 นาที — คาดว่าอีก ${minsLeft} นาทีฟ้าจะมืดครับ`)
        } else if (diff > 20) {
          setPrediction(`เมฆลดลง ${diff}% ใน 15 นาที — ฟ้ากำลังใสขึ้นครับ`)
        } else {
          setPrediction(null)
        }
      }
    } catch (e) { console.error(e) }
  }, [obs.observatory_id])

  // แจ้งเตือนอัตโนมัติเมื่อสถานะเปลี่ยน
  useEffect(() => {
    if (!obs) return
    const status    = getSkyStatus(obs)
    const statusKey = `${status.type}-${obs.cloud_cover}-${obs.rain_rate}`

    if (prevStatusRef.current !== statusKey) {
      prevStatusRef.current = statusKey
      if (status.type !== 'normal' || messages.length === 0) {
        const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `${status.label}\nเมฆ ${obs.cloud_cover ?? '--'}% | ความชื้น ${obs.humidity ?? '--'}% | ลม ${obs.wind_speed ?? '--'} m/s | ฝน ${obs.rain_rate ?? 0} mm`,
          timestamp: `${now} น. — แจ้งเตือนอัตโนมัติ`,
          type: status.type,
        }])
      }
    }
  }, [obs.cloud_cover, obs.rain_rate, obs.narit_score_clear])

  // ดึง temporal ทุก 1 นาที
  useEffect(() => {
    fetchTemporal()
    const t = setInterval(fetchTemporal, 60000)
    return () => clearInterval(t)
  }, [fetchTemporal])

  const send = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setLoading(true)
    const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { role: 'user', content: question, timestamp: `${now} น.` }])

    try {
      const res  = await fetch('/api/ai-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question, observatories: [obs], mode: 'observatory' }),
      })
      const data = await res.json()
      const now2 = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      setMessages(prev => [...prev, {
        role: 'assistant', content: data.answer || 'ไม่สามารถตอบได้ครับ',
        timestamp: `${now2} น.`, type: 'normal',
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'เกิดข้อผิดพลาดครับ', timestamp: '', type: 'normal' }])
    } finally { setLoading(false) }
  }

  const status = getSkyStatus(obs)
  const cloudPercent = Math.round(100 - (obs.narit_score_clear ?? 0) * 100)

  const msgBg     = (t?: string) => t === 'alert' ? 'rgba(248,113,113,0.1)' : t === 'warning' ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.04)'
  const msgBorder = (t?: string) => t === 'alert' ? 'rgba(248,113,113,0.3)' : t === 'warning' ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.07)'

  const frameColor = (score: number) =>
    score >= 70 ? '#4ade80' : score >= 40 ? '#fbbf24' : '#f87171'

  return (
    <div style={{ ...cardStyle, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconTelescope />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>AI ผู้ช่วยหอดูดาว</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Live</span>
        </div>
      </div>

      {/* รูป allsky + วิเคราะห์ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        <div style={{ padding: '12px 16px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>รูปท้องฟ้าล่าสุด</div>
          <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: 'rgba(0,0,0,0.4)' }}>
            {obs.narit_image_url
              ? <img src={obs.narit_image_url} alt="allsky" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>ไม่มีรูปครับ</span></div>
            }
            <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.75)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, color: status.color }}>
              Clear {Math.round((obs.narit_score_clear ?? 0) * 100)}% | เมฆ {cloudPercent}%
            </div>
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '6px' }}>{obs.name} allsky camera</div>
        </div>

        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>วิเคราะห์ตอนนี้</div>
          <div style={{ background: `${status.color}15`, border: `1px solid ${status.color}40`, borderRadius: '8px', padding: '8px 12px', marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: status.color }}>{status.label}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {[
              { label: 'เมฆ',     value: `${cloudPercent}%` },
              { label: 'ความชื้น', value: `${obs.humidity ?? '--'}%` },
              { label: 'ลม',      value: `${obs.wind_speed ?? '--'} m/s` },
              { label: 'ฝน',      value: `${obs.rain_rate ?? 0} mm` },
            ].map(item => (
              <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '6px 8px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{item.label}</div>
                <div style={{ fontSize: '14px', fontWeight: 300, color: '#fff' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Temporal AI */}
      {frames.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
            การเคลื่อนที่ของเมฆ — 15 นาทีที่ผ่านมา
          </div>

          {/* 4 frames */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
            {frames.map((f, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)',
                border: i === frames.length - 1 ? `1px solid ${COLORS.teal}40` : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px', overflow: 'hidden',
              }}>
                <div style={{ padding: '4px 6px', fontSize: '10px', color: i === frames.length - 1 ? COLORS.teal : 'rgba(255,255,255,0.35)' }}>
                  {f.label}
                </div>
                <div style={{ aspectRatio: '1', background: 'rgba(0,0,0,0.4)', position: 'relative' }}>
                  {f.imageUrl
                    ? <img src={f.imageUrl} alt={f.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)' }}>-</span></div>
                  }
                </div>
                <div style={{ padding: '4px 6px', fontSize: '11px', fontWeight: 600, color: frameColor(f.clearScore) }}>
                  Clear {f.clearScore}%
                </div>
                <div style={{ padding: '0 6px 4px', fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>{f.time} น.</div>
              </div>
            ))}
          </div>

          {/* prediction */}
          {prediction && (
            <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ fontSize: '12px', color: '#fbbf24' }}>⏱ {prediction}</span>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div style={{ padding: '12px 16px', maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0, background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconTelescope />
                </div>
              )}
              <div style={{
                maxWidth: '80%',
                background:   msg.role === 'user' ? 'rgba(6,214,160,0.08)' : msgBg(msg.type),
                border:       `1px solid ${msg.role === 'user' ? 'rgba(6,214,160,0.2)' : msgBorder(msg.type)}`,
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '8px 12px', fontSize: '12px', lineHeight: 1.6,
                color: msg.role === 'user' ? COLORS.teal : '#cbd5e1',
                whiteSpace: 'pre-line',
              }}>
                {msg.content}
                {msg.timestamp && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>{msg.timestamp}</div>}
              </div>
              {msg.role === 'user' && (
                <div style={{ width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0, background: 'rgba(6,214,160,0.08)', border: '1px solid rgba(6,214,160,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconUser />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0, background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconTelescope />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px 12px 12px 2px', padding: '8px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                กำลังคิดครับ...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <IconTelescope />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder='ถามได้เลยครับ เช่น "ฟ้าจะใสอีกไหมคืนนี้"'
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px', color: '#f1f5f9',
            padding: '8px 12px', fontSize: '12px', outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)',
            border: `1px solid ${loading ? 'rgba(255,255,255,0.06)' : 'rgba(6,214,160,0.3)'}`,
            borderRadius: '8px', color: loading ? 'rgba(255,255,255,0.3)' : COLORS.teal,
            padding: '8px 14px', fontSize: '12px', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
          }}
        >
          {loading ? '...' : 'ถาม'}
        </button>
      </div>

    </div>
  )
}