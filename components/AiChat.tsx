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

export default function AiChat({ observatories, onFilter }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setLoading(true)

    const userMsg: Message = { role: 'user', content: question }
    setMessages(prev => [...prev, userMsg])

    try {
      const res  = await fetch('/api/ai-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question, observatories }),
      })
      const data = await res.json()

      const assistantMsg: Message = {
        role:    'assistant',
        content: data.answer || 'ไม่สามารถตอบได้ครับ',
        filter:  data.filter || null,
      }
      setMessages(prev => [...prev, assistantMsg])

      if (data.filter && data.filter.length > 0) {
        onFilter(data.filter)
      } else {
        onFilter(null)
      }

    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'เกิดข้อผิดพลาดครับ ลองใหม่นะครับ' }])
    } finally {
      setLoading(false)
    }
  }

  const clearFilter = () => {
    onFilter(null)
    setMessages([])
  }

  // icon AI — กล้องโทรทรรศน์ SVG
  const IconTelescope = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M3 7l4-2 10 5-4 2L3 7z"/>
      <path d="M17 10l2 8"/>
      <path d="M13 12l1 5"/>
      <path d="M15 18H10"/>
      <path d="M12 18v3"/>
    </svg>
  )

  // icon User — คน SVG
  const IconUser = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      marginBottom: '20px',
      overflow: 'hidden',
    }}>

      {/* Input Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '14px 16px' }}>
        <IconTelescope />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder='ถามเกี่ยวกับสภาพอากาศ เช่น "คืนนี้หอไหนดูดาวได้บ้าง?"'
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px', color: '#f1f5f9',
            padding: '9px 14px', fontSize: '13px', outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)',
            border: `1px solid ${loading ? 'rgba(255,255,255,0.06)' : 'rgba(6,214,160,0.3)'}`,
            borderRadius: '8px',
            color: loading ? 'rgba(255,255,255,0.3)' : COLORS.teal,
            padding: '9px 18px', fontSize: '13px',
            fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {loading ? '...' : 'ถาม AI'}
        </button>
        {messages.length > 0 && (
          <button
            onClick={clearFilter}
            style={{
              background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: '8px', color: '#f87171',
              padding: '9px 12px', fontSize: '12px', cursor: 'pointer',
            }}
          >
            ล้าง
          </button>
        )}
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '12px 16px', maxHeight: '240px',
          overflowY: 'auto', display: 'flex',
          flexDirection: 'column', gap: '10px',
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>

              {/* icon AI */}
              {msg.role === 'assistant' && (
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #1a3040 0%, #0f2030 100%)',
                  border: '1px solid rgba(6,214,160,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconTelescope />
                </div>
              )}

              {/* กล่องข้อความ — solid ไม่ทะลุ */}
              <div style={{
                maxWidth: '80%',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #0f3040 0%, #0a2535 100%)'
                  : 'linear-gradient(135deg, #1e2d45 0%, #141f30 100%)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(6,214,160,0.25)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '10px 14px',
                fontSize: '13px',
                color: msg.role === 'user' ? '#a7f3d0' : '#e2e8f0',
                lineHeight: 1.65,
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }}>
                {msg.content}
                {msg.filter && msg.filter.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: COLORS.teal, opacity: 0.8 }}>
                    ✦ กรองแสดง {msg.filter.length} หอดูดาวครับ
                  </div>
                )}
              </div>

              {/* icon User */}
              {msg.role === 'user' && (
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #0f3040 0%, #0a2535 100%)',
                  border: '1px solid rgba(6,214,160,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconUser />
                </div>
              )}
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                background: 'linear-gradient(135deg, #1a3040 0%, #0f2030 100%)',
                border: '1px solid rgba(6,214,160,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconTelescope />
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #1e2d45 0%, #141f30 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px 12px 12px 2px',
                padding: '10px 14px', fontSize: '13px',
                color: 'rgba(255,255,255,0.4)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }}>
                กำลังคิดครับ...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}