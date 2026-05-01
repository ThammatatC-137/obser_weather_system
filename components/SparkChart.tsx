'use client'
import { COLORS } from '@/constants/observatories'

type Props = {
  data:   number[]
  times:  string[]
  label:  string
  unit:   string
}

export function SparkChart({ data, times, label, unit }: Props) {
  const valid  = data.filter(v => v !== null && v !== undefined && !isNaN(v))
  const min    = Math.min(...valid)
  const max    = Math.max(...valid)
  const range  = max - min || 1
  const W      = 300
  const H      = 80
  const pad    = 10

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / range) * (H - pad * 2)
    return `${x},${y}`
  }).join(' ')

  const latest = valid[valid.length - 1]?.toFixed(1) ?? '--'

  return (
    <div style={{
      background:     'rgba(13,24,41,0.7)',
      backdropFilter: 'blur(8px)',
      border:         '1px solid rgba(108,99,255,0.12)',
      borderRadius:   '14px',
      padding:        '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: COLORS.text2 }}>{label}</span>
        <span style={{ fontSize: '16px', fontWeight: '600', color: COLORS.text }}>
          {latest}{unit}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={COLORS.accent} stopOpacity="0.3" />
            <stop offset="100%" stopColor={COLORS.accent} stopOpacity="0"   />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke={COLORS.accent}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <polygon
          points={`${pad},${H - pad} ${points} ${W - pad},${H - pad}`}
          fill={`url(#grad-${label})`}
        />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: COLORS.text3, marginTop: '4px' }}>
        <span>{times[0] ? new Date(times[0]).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
        <span>{times[times.length-1] ? new Date(times[times.length-1]).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
      </div>
    </div>
  )
}
