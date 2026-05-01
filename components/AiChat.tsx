'use client'
import { useState, useRef, useEffect } from 'react'
import { COLORS } from '@/constants/observatories'

type Message = {
  role: 'user' | 'assistant'
  content: string
  filter?: string[] // observatory_id ที่ควรแสดง
}

type Props = {
  observatories: any[]
  onFilter: (ids: string[] | null) => void
}

export default function AiChat({ observatories, onFilter }: Props) {
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [open, setOpen]           = useState(false)
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

      // Filter Cards
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

  return (
    <div style={{ background: COLORS.card, borderRadius: '12px', border: '1px solid rgba(79,209,197,0.15)', marginBottom: '20px', overflow: 'hidden' }}>

      {/* Input Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '14px 16px' }}>
        <span style={{ fontSize: '16px' }}></span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder='ถามเกี่ยวกับสภาพอากาศ เช่น "คืนนี้หอไหนดูดาวได้บ้าง?"'
          style={{
            flex: 1, background: COLORS.bg,
            border: '1px solid rgba(79,209,197,0.2)',
            borderRadius: '8px', color: '#f1f5f9',
            padding: '9px 14px', fontSize: '13px', outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{
            background: loading ? 'rgba(79,209,197,0.05)' : 'rgba(79,209,197,0.15)',
            border: '1px solid rgba(79,209,197,0.4)',
            borderRadius: '8px', color: '#4fd1c5',
            padding: '9px 18px', fontSize: '13px',
            fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳' : 'ถาม AI'}
        </button>
        {messages.length > 0 && (
          <button
            onClick={clearFilter}
            style={{
              background: 'rgba(248,113,113,0.1)',
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
        <div style={{ borderTop: '1px solid rgba(79,209,197,0.1)', padding: '12px 16px', maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && <span style={{ fontSize: '14px', flexShrink: 0 }}>🤖</span>}
              <div style={{
                maxWidth: '80%',
                background:   msg.role === 'user' ? 'rgba(79,209,197,0.15)' : 'rgba(255,255,255,0.05)',
                border:       `1px solid ${msg.role === 'user' ? 'rgba(79,209,197,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding:      '8px 12px',
                fontSize:     '13px',
                color:        msg.role === 'user' ? '#4fd1c5' : '#cbd5e1',
                lineHeight:   1.6,
              }}>
                {msg.content}
                {msg.filter && msg.filter.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#4fd1c5', opacity: 0.7 }}>
                    ✦ กรองแสดง {msg.filter.length} หอดูดาวครับ
                  </div>
                )}
              </div>
              {msg.role === 'user' && <span style={{ fontSize: '14px', flexShrink: 0 }}>👤</span>}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px' }}></span>
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px 12px 12px 2px', padding: '8px 12px', fontSize: '13px', color: '#334155' }}>
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
