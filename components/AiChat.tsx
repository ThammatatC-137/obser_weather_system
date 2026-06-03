'use client'
import { useState, useRef, useEffect } from 'react'
import { COLORS } from '@/constants/observatories'

type Message = {
  role: 'user' | 'assistant'
  content: string
  filter?: string[]
}

type Props = {
  observatories: any[]
  onFilter: (ids: string[] | null) => void
}

const cardBg = 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)'
const boxBg  = 'linear-gradient(135deg, #16223f 0%, #0d1627 50%, #161c30 100%)'

const IC = (d: string, extra?: string) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={d} />{extra && <path d={extra} />}
  </svg>
)

const SUGGESTIONS = [
  { icon: IC('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'), text: 'คืนนี้หอไหนดูดาวได้บ้าง?' },
  { icon: IC('M3 10h1M20 10h1M4.22 4.22l.7.7M18.36 18.36l.7.7M12 1v1M12 20v1', 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z'), text: 'หอไหนฟ้าใสที่สุดตอนนี้?' },
  { icon: IC('M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'), text: 'พรุ่งนี้หอไหนดีที่สุด?' },
  { icon: IC('M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25', 'M8 19v2M8 13v2M12 21v-2M12 15v-2M16 19v2M16 13v2'), text: 'ตอนนี้มีหอไหนฝนตกบ้าง?' },
  { icon: IC('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10'), text: 'สัปดาห์หน้าวันไหนดูดาวได้?' },
]

export default function AiChat({ observatories, onFilter }: Props) {
  const [messages,        setMessages]        = useState<Message[]>([])
  const [input,           setInput]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages.length > 0) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (q?: string) => {
    const question = (q ?? input).trim()
    if (!question || loading) return
    setInput('')
    setShowSuggestions(false)
    setLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: question }])
    try {
      const res  = await fetch('/api/ai-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, observatories }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || 'ไม่สามารถตอบได้ครับ', filter: data.filter || null }])
      if (data.filter && data.filter.length > 0) onFilter(data.filter)
      else onFilter(null)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'เกิดข้อผิดพลาดครับ ลองใหม่นะครับ' }])
    } finally { setLoading(false) }
  }

  const clearFilter = () => { onFilter(null); setMessages([]) }

  const IconTelescope = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M3 7l4-2 10 5-4 2L3 7z"/><path d="M17 10l2 8"/><path d="M13 12l1 5"/><path d="M15 18H10"/><path d="M12 18v3"/>
    </svg>
  )

  return (
    <div style={{ background: cardBg, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', marginBottom: '20px', overflow: 'hidden', fontFamily: 'var(--font-poppins)' }}>

      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <IconTelescope />
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', letterSpacing: '0.1em' }}>AI ASSISTANT — OBSERVATORY NETWORK</span>
        </div>
        {messages.length > 0 && (
          <button onClick={clearFilter} style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '4px', color: '#f87171', padding: '2px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-poppins)', letterSpacing: '0.05em' }}>
            CLEAR
          </button>
        )}
      </div>

      {/* คำถามแนะนำ แสดงเมื่อยังไม่มีข้อความ หรือ focus ช่องพิมพ์ตอน input ว่าง */}
      {(messages.length === 0 || showSuggestions) && !loading && (
        <div style={{ padding: '10px 16px 0', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => send(s.text)}
              style={{
                background: 'linear-gradient(135deg, #16223f 0%, #0d1627 100%)',
                border: '1px solid rgba(6,214,160,0.5)',
                borderRadius: '6px',
                color: '#fff',
                padding: '5px 12px',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: 'var(--font-poppins)',
                transition: 'border-color 0.15s, background 0.15s',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = COLORS.teal
                ;(e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #1e3050 0%, #112035 100%)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(6,214,160,0.5)'
                ;(e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #16223f 0%, #0d1627 100%)'
              }}
            >
              {s.icon}
              <span>{s.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '12px 16px', borderBottom: messages.length > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{'>'}</span>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(false) }}
          onFocus={() => { if (!input) setShowSuggestions(true) }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="ถามเกี่ยวกับสภาพอากาศ หรือเลือกคำถามด้านบน..."
          style={{ flex: 1, background: 'transparent', border: 'none', color: '#f1f5f9', padding: 0, fontSize: '13px', outline: 'none', fontFamily: 'var(--font-poppins)' }}
        />
        <button onClick={() => send()} disabled={loading} style={{ background: 'transparent', border: `1px solid ${loading ? 'rgba(255,255,255,0.1)' : 'rgba(6,214,160,0.3)'}`, borderRadius: '4px', color: loading ? 'rgba(255,255,255,0.3)' : COLORS.teal, padding: '4px 14px', fontSize: '11px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-poppins)', letterSpacing: '0.05em' }}>
          {loading ? '...' : 'ถาม AI'}
        </button>
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div style={{ padding: '12px 16px', maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: '26px', height: '26px', borderRadius: '6px', flexShrink: 0, background: boxBg, border: '1px solid rgba(6,214,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconTelescope />
                </div>
              )}
              <div style={{ maxWidth: '80%', background: msg.role === 'user' ? 'linear-gradient(135deg,#0d3028 0%,#0a2535 100%)' : 'linear-gradient(135deg,#16223f 0%,#0d1627 100%)', border: `1px solid ${msg.role === 'user' ? 'rgba(6,214,160,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: msg.role === 'user' ? '8px 8px 2px 8px' : '8px 8px 8px 2px', padding: '8px 12px', fontSize: '12px', color: '#fff', lineHeight: 1.6 }}>
                {msg.content}
                {msg.filter && msg.filter.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: COLORS.teal, letterSpacing: '0.04em' }}>✦ กรองแสดง {msg.filter.length} หอดูดาวครับ</div>
                )}
              </div>
              {msg.role === 'user' && (
                <div style={{ width: '26px', height: '26px', borderRadius: '6px', flexShrink: 0, background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: COLORS.teal, fontWeight: 700 }}>U</div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '6px', flexShrink: 0, background: boxBg, border: '1px solid rgba(6,214,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconTelescope /></div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px 8px 8px 2px', padding: '8px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>กำลังคิดครับ...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
