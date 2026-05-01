'use client'
import { COLORS } from '@/constants/observatories'

type Props = { icon: string; label: string; value: string }

export function StatCard({ icon, label, value }: Props) {
  return (
    <div style={{
      background:   `rgba(13,24,41,0.7)`,
      backdropFilter: 'blur(8px)',
      border:       `1px solid rgba(108,99,255,0.15)`,
      borderRadius: '10px',
      padding:      '10px 12px',
      display:      'flex',
      alignItems:   'center',
      gap:          '8px',
    }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '10px', color: COLORS.text3, marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: COLORS.text }}>{value}</div>
      </div>
    </div>
  )
}
