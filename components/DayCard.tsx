'use client'
import { DayData } from '@/types'
import { COLORS }  from '@/constants/observatories'

export function DayCard({ day }: { day: DayData }) {
  const borderColor = day.isToday ? COLORS.teal : day.isPast ? 'rgba(255,255,255,0.06)' : 'rgba(96,165,250,0.2)'
  const bgColor     = day.isToday ? 'rgba(6,214,160,0.08)' : 'rgba(13,24,41,0.7)'

  return (
    <div style={{
      flex:           '0 0 auto',
      width:          '100px',
      background:     bgColor,
      backdropFilter: 'blur(8px)',
      border:         `1px solid ${borderColor}`,
      borderRadius:   '12px',
      padding:        '12px 8px',
      textAlign:      'center',
      position:       'relative',
    }}>
      {day.isToday && (
        <div style={{
          position:   'absolute', top: '-10px', left: '50%',
          transform:  'translateX(-50%)',
          background: COLORS.teal, color: '#000',
          fontSize:   '9px', fontWeight: '700',
          padding:    '2px 8px', borderRadius: '6px',
        }}>TODAY</div>
      )}
      <div style={{ fontSize: '10px', color: day.isPast ? COLORS.text3 : COLORS.text2, marginBottom: '4px' }}>
        {day.dayLabel}
      </div>
      <div style={{ fontSize: '22px', marginBottom: '6px' }}>{day.conditionIcon}</div>
      <div style={{ fontSize: '13px', fontWeight: '600', color: COLORS.text }}>
        {day.tempMax.toFixed(0)}°
      </div>
      <div style={{ fontSize: '11px', color: COLORS.text3 }}>
        {day.tempMin.toFixed(0)}°
      </div>
      <div style={{ marginTop: '6px', fontSize: '10px', color: COLORS.text3 }}>
        💧 {day.humidity.toFixed(0)}%
      </div>
      <div style={{ fontSize: '10px', color: COLORS.text3 }}>
        🌧 {day.rainSum.toFixed(1)}mm
      </div>
    </div>
  )
}
