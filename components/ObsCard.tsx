'use client'
import { useState }    from 'react'
import { useRouter }   from 'next/navigation'
import { COLORS, CONDITION_ICON } from '@/constants/observatories'
import { Observatory } from '@/types'
import { getSkyPhoto } from '@/lib/skyPhoto'

type ObsCardProps = { obs: Observatory }

export function ObsCard({ obs }: ObsCardProps) {
  const router          = useRouter()
  const [hovered, setHovered] = useState(false)
  const skyPhoto        = getSkyPhoto(obs.condition, obs.timestamp)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/observatory/${obs.observatory_id}`)}
      style={{
        background:   hovered ? '#141b24' : COLORS.card,
        borderRadius: '16px',
        border:       hovered ? '1.5px solid rgba(79,209,197,0.35)' : '1.5px solid rgba(255,255,255,0.08)',
        padding:      '20px 20px 20px 24px',
        cursor:       'pointer',
        transition:   'all 0.22s',
        transform:    hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow:    hovered ? '0 16px 48px rgba(79,209,197,0.08)' : '0 2px 16px rgba(0,0,0,0.5)',
        display:      'flex',
        justifyContent: 'space-between',
        alignItems:   'center',
        gap:          '16px',
        height:       '100%',
      }}
    >
      {/* LEFT: ข้อมูล */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '26px', fontWeight: '600', color: hovered ? '#4fd1c5' : '#e2e8f0', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.2s' }}>
          {obs.name}
        </p>
        <p style={{ fontSize: '16px', color: '#ccced1', marginBottom: '16px' }}>
          {new Date(obs.timestamp).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
        <div style={{ fontSize: '56px', fontWeight: '200', color: '#ffffff', lineHeight: 1, marginBottom: '8px' }}>
          {obs.temperature?.toFixed(1)}<span style={{ fontSize: '40px' }}>°C</span>
        </div>
        <div style={{ fontSize: '20px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
          <span>{obs.condition === 'Clear' ? '🌙' : obs.condition === 'Partly Cloudy' ? '⛅' : obs.condition === 'Overcast' ? '🌥' : '☁️'}</span>
          <span>{obs.condition}</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '16px', color: '#4fd1c5', opacity: 0.7, marginBottom: '2px', letterSpacing: '0.08em' }}>HUMID</div>
            <div style={{ fontSize: '17px', fontWeight: '600', color: '#ffffff' }}>{obs.humidity}%</div>
          </div>
          <div>
            <div style={{ fontSize: '16px', color: '#4fd1c5', opacity: 0.7, marginBottom: '2px', letterSpacing: '0.08em' }}>WIND</div>
            <div style={{ fontSize: '17px', fontWeight: '600', color: '#ffffff' }}>{obs.wind_speed} m/s</div>
          </div>
        </div>
      </div>

      {/* RIGHT: รูปท้องฟ้า */}
      <div style={{ width: '175px', height: '175px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(79,209,197,0.2)', flexShrink: 0, position: 'relative' }}>
        <img
          src={skyPhoto}
          alt={obs.condition}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s', transform: hovered ? 'scale(1.08)' : 'scale(1)' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.4) 100%)' }}/>
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div style={{ background: COLORS.card, borderRadius: '16px', height: '100%', border: '1.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e3030', fontSize: '14px' }}>
      Loading...
    </div>
  )
}