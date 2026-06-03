'use client'
import { useState } from 'react'
import { DayData } from '@/types'
import { COLORS }  from '@/constants/observatories'

const boxBg = 'linear-gradient(135deg, #16223f 0%, #0d1627 50%, #161c30 100%)'

export function DayCard({ day, style }: { day: DayData; style?: React.CSSProperties }) {
  const [hov, setHov] = useState(false)

  const borderColor = hov
    ? 'rgba(6,214,160,0.38)'
    : day.isToday
      ? 'rgba(6,214,160,0.5)'
      : day.isPast
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(96,165,250,0.18)'

  const bg = day.isToday
    ? 'linear-gradient(135deg, rgba(6,214,160,0.12) 0%, #0d1627 50%, rgba(6,100,160,0.12) 100%)'
    : boxBg

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:     bg,
        border:         `1px solid ${borderColor}`,
        borderRadius:   '12px',
        padding:        '12px 8px',
        textAlign:      'center',
        position:       'relative',
        boxShadow:      hov ? '0 12px 28px rgba(0,0,0,0.55), 0 0 0 1px rgba(6,214,160,0.12)' : '0 4px 20px rgba(0,0,0,0.4)',
        transform:      hov ? 'translateY(-4px)' : 'translateY(0)',
        transition:     'transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s, border-color 0.2s',
        cursor:         'pointer',
        height:         '100%',
        minHeight:      '220px',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'space-between',
        boxSizing:      'border-box',
        fontFamily:     'var(--font-poppins)',
        ...style,
      }}
    >
      {day.isToday && (
        <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: COLORS.teal, color: '#000', fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', whiteSpace: 'nowrap', letterSpacing: '0.08em' }}>TODAY</div>
      )}

      <div style={{ fontSize: '12px', fontWeight: 600, color: day.isPast ? 'rgba(255,255,255,0.5)' : '#fff', lineHeight: 1.3, letterSpacing: '0.04em' }}>
        {day.dayLabel}
      </div>

      <div style={{ fontSize: '26px', margin: '4px 0' }}>{day.conditionIcon}</div>

      <div>
        <div style={{ fontSize: '17px', fontWeight: 700, color: '#fff' }}>
          {day.tempMax.toFixed(1)}°
        </div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>
          {day.tempMin.toFixed(0)}°
        </div>
      </div>

      <div style={{ marginTop: '4px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.02em' }}>
          💧 {day.humidity.toFixed(0)}%
        </div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.02em' }}>
          🌧 {day.rainSum.toFixed(2)}mm
        </div>
      </div>
    </div>
  )
}
