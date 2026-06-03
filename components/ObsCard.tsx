'use client'
import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { COLORS, OBS_TIMEZONE } from '@/constants/observatories'
import { Observatory }          from '@/types'
import { getSkyPhoto }          from '@/lib/skyPhoto'

const boxBg = 'linear-gradient(135deg, #16223f 0%, #0d1627 50%, #161c30 100%)'

function WarnIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

type ObsCardProps = { obs: Observatory }

export function ObsCard({ obs }: ObsCardProps) {
  const router = useRouter()
  const [hov, setHov] = useState(false)
  const [now, setNow] = useState(new Date())

  const skyPhoto = getSkyPhoto(obs.condition, obs.timestamp, obs.narit_image_url)
  const [imgFailed, setImgFailed] = useState(false)

  const sensorAge      = Date.now() - new Date(obs.timestamp).getTime()
  const isDataOutdated = sensorAge > 30 * 60 * 1000          // sensor ไม่อัปมากกว่า 30 นาที
  const isSkyOutdated  = !obs.narit_image_url || imgFailed   // ไม่มี URL หรือรูปโหลดไม่ได้เท่านั้น

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const Badge = ({ text }: { text: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#dc2626', borderRadius: '5px', padding: '3px 9px' }}>
      <WarnIcon />
      <span style={{ fontSize: '10px', color: '#fff', fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{text}</span>
    </div>
  )

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => router.push(`/observatory/${obs.observatory_id}`)}
      style={{
        position:     'relative',
        background:   boxBg,
        borderRadius: '12px',
        border:       `1px solid ${hov ? 'rgba(6,214,160,0.38)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow:    hov ? '0 12px 28px rgba(0,0,0,0.55), 0 0 0 1px rgba(6,214,160,0.12)' : '0 4px 20px rgba(0,0,0,0.4)',
        transform:    hov ? 'translateY(-4px)' : 'translateY(0)',
        transition:   'transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s, border-color 0.2s',
        cursor:       'pointer',
        height:       '100%',
        overflow:     'hidden',
        fontFamily:   'var(--font-poppins)',
      }}
    >
      {/* รูปท้องฟ้า อยู่ครึ่งขวาแบบเต็มขอบ */}
      <img
        src={skyPhoto}
        alt={obs.condition}
        style={{
          position:       'absolute',
          top: 0, right: 0,
          width:          '52%',
          height:         '100%',
          objectFit:      'cover',
          objectPosition: 'center',
          transform:      hov ? 'scale(1.55)' : 'scale(1.45)',
          transition:     'transform 0.5s ease',
        }}
        onError={() => setImgFailed(true)}
      />

      {/* gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #0d1627 35%, rgba(13,22,39,0.5) 52%, transparent 100%)', pointerEvents: 'none' }} />

      {/* ป้ายเตือน วางมุมขวาล่างเรียงลงมา */}
      {(isDataOutdated || isSkyOutdated) && (
        <div style={{ position: 'absolute', bottom: '14px', right: '14px', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          {isDataOutdated && <Badge text="DATA NOT UP TO DATE" />}
          {isSkyOutdated  && <Badge text="SKY NOT UP TO DATE"  />}
        </div>
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

        {/* TOP */}
        <div>
          <div style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '3px', textTransform: 'uppercase' }}>
            {obs.observatory_id}
          </div>
          <div style={{ fontSize: 'clamp(14px,1.6vw,18px)', fontWeight: 600, color: COLORS.teal, marginBottom: '4px', lineHeight: 1.3, maxWidth: '55%' }}>
            {obs.name}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.02em' }}>
            {now.toLocaleString('en-GB', { timeZone: OBS_TIMEZONE[obs.observatory_id] || 'UTC', weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* BOTTOM */}
        <div>
          <div style={{ fontSize: 'clamp(36px,3.8vw,52px)', fontWeight: 200, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            {obs.temperature?.toFixed(1)}<span style={{ fontSize: 'clamp(22px,2.5vw,32px)', color: 'rgba(255,255,255,0.7)' }}>°C</span>
          </div>
          <div style={{ fontSize: 'clamp(12px,1.2vw,14px)', color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <span>{obs.condition === 'Clear' ? '🌙' : obs.condition === 'Partly Cloudy' ? '⛅' : obs.condition === 'Overcast' ? '🌥' : '☁️'}</span>
            <span>{obs.condition}</span>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'rgba(79,209,197,0.7)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase' }}>HUMID</div>
              <div style={{ fontSize: 'clamp(13px,1.2vw,15px)', fontWeight: 600, color: '#fff' }}>{obs.humidity}%</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'rgba(79,209,197,0.7)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase' }}>WIND</div>
              <div style={{ fontSize: 'clamp(13px,1.2vw,15px)', fontWeight: 600, color: '#fff' }}>{obs.wind_speed} m/s</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div style={{ background: boxBg, borderRadius: '12px', height: '100%', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontFamily: 'var(--font-poppins)', letterSpacing: '0.1em' }}>
      LOADING...
    </div>
  )
}
