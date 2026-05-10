'use client'
import { useState } from 'react'
import { DayData } from '@/types'
import { COLORS }  from '@/constants/observatories'

export function DayCard({ day, style }: { day: DayData; style?: React.CSSProperties }) {
  const [hov, setHov] = useState(false)

  const borderColor = hov
    ? 'rgba(6,214,160,0.35)'
    : day.isToday
      ? COLORS.teal
      : day.isPast
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(96,165,250,0.2)'

  const bgColor = day.isToday
    ? 'linear-gradient(135deg, rgba(6,214,160,0.15) 0%, #0f1a2e 50%, rgba(6,100,160,0.15) 100%)'
    : 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)'

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:     bgColor,
        backdropFilter: 'blur(8px)',
        border:         `1px solid ${borderColor}`,
        borderRadius:   '12px',
        padding:        '12px 8px',
        textAlign:      'center',
        position:       'relative',
        boxShadow:  hov
          ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(6,214,160,0.12)'
          : '0 4px 20px rgba(0,0,0,0.4)',
        transform:  hov ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        cursor:     'pointer',
        // บังคับให้สูงเท่ากันทุก card
        height:        '100%',
        minHeight:     '220px',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        justifyContent: 'space-between',
        boxSizing:     'border-box',
        ...style,
      }}
    >
      {/* badge TODAY */}
      {day.isToday && (
        <div style={{
          position:  'absolute', top: '-10px', left: '50%',
          transform: 'translateX(-50%)',
          background: COLORS.teal, color: '#000',
          fontSize: '9px', fontWeight: '700',
          padding: '2px 8px', borderRadius: '6px',
          whiteSpace: 'nowrap',
        }}>TODAY</div>
      )}

      {/* วันที่ */}
      <div style={{ fontSize: '14px', color: day.isPast ? COLORS.text3 : COLORS.text2, lineHeight: 1.3 }}>
        {day.dayLabel}
      </div>

      {/* icon สภาพอากาศ */}
      <div style={{ fontSize: '26px', margin: '4px 0' }}>{day.conditionIcon}</div>

      {/* อุณหภูมิ */}
      <div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.text }}>
          {day.tempMax.toFixed(1)}°
        </div>
        <div style={{ fontSize: '14px', color: COLORS.text3 }}>
          {day.tempMin.toFixed(0)}°
        </div>
      </div>

      {/* ความชื้น + ฝน */}
      <div style={{ marginTop: '4px' }}>
        <div style={{ fontSize: '13px', color: COLORS.text3 }}>
          💧 {day.humidity.toFixed(0)}%
        </div>
        <div style={{ fontSize: '13px', color: COLORS.text3 }}>
          🌧 {day.rainSum.toFixed(2)}mm
        </div>
      </div>
    </div>
  )
}