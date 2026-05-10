'use client'
import { useState }    from 'react'
import { useRouter }   from 'next/navigation'
import { COLORS } from '@/constants/observatories'
import { Observatory } from '@/types'
import { getSkyPhoto } from '@/lib/skyPhoto'

type ObsCardProps = { obs: Observatory }

export function ObsCard({ obs }: ObsCardProps) {
  const router  = useRouter()
  const [hovered, setHovered] = useState(false)
  const skyPhoto = getSkyPhoto(obs.condition, obs.timestamp, obs.narit_image_url)

  // เช็คว่าข้อมูลเก่าเกิน 5 นาทีไหม
  const isOutdated = Date.now() - new Date(obs.timestamp).getTime() > 5 * 60 * 1000

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/observatory/${obs.observatory_id}`)}
      style={{
        background:     hovered ? '#141b24' : COLORS.card,
        borderRadius:   '16px',
        border:         hovered ? '1.5px solid rgba(79,209,197,0.35)' : '1.5px solid rgba(255,255,255,0.08)',
        padding:        '20px 20px 20px 24px',
        cursor:         'pointer',
        transition:     'all 0.22s',
        transform:      hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow:      hovered ? '0 16px 48px rgba(79,209,197,0.08)' : '0 2px 16px rgba(0,0,0,0.5)',
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        gap:            '16px',
        height:         '100%',
        overflow:       'hidden',
        position:       'relative',
      }}
    >
      <style>{`
        .obs-name {
          font-size: clamp(18px, 2vw, 22px);
          font-weight: 600;
          margin-bottom: 4px;
          white-space: normal;
          word-break: break-word;
          line-height: 1.3;
          transition: color 0.2s;
        }
        .obs-timestamp {
          font-size: clamp(13px, 1.2vw, 14px);
          color: #ccced1;
          margin-bottom: 16px;
        }
        .obs-temp {
          font-size: clamp(44px, 4vw, 56px);
          font-weight: 200;
          color: #ffffff;
          line-height: 1;
          margin-bottom: 8px;
        }
        .obs-temp span {
          font-size: clamp(30px, 3vw, 40px);
        }
        .obs-condition {
          font-size: clamp(15px, 1.5vw, 20px);
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 16px;
        }
        .obs-label {
          font-size: clamp(12px, 1.2vw, 16px);
          color: #4fd1c5;
          opacity: 0.7;
          margin-bottom: 2px;
          letter-spacing: 0.08em;
        }
        .obs-value {
          font-size: clamp(15px, 1.4vw, 17px);
          font-weight: 600;
          color: #ffffff;
        }
        .obs-img {
          width:  clamp(120px, 14vw, 175px);
          height: clamp(120px, 14vw, 175px);
        }
        @media (max-width: 680px) {
          .obs-img {
            width:  110px !important;
            height: 110px !important;
          }
        }
      `}</style>

      {/* ✅ badge Data not up to date */}
      {isOutdated && (
        <div style={{
          position: 'absolute',
          bottom: '14px',
          right: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: '20px',
          padding: '4px 10px',
          zIndex: 2,
        }}>
          <span style={{ fontSize: '11px' }}>⚠️</span>
          <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Data not up to date
          </span>
        </div>
      )}

      {/* LEFT */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="obs-name" style={{ color: hovered ? '#4fd1c5' : '#e2e8f0' }}>
          {obs.name}
        </p>
        <p className="obs-timestamp">
          {new Date(obs.timestamp).toLocaleString('en-GB', {
            weekday: 'short', day: '2-digit', month: 'short',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
        <div className="obs-temp">
          {obs.temperature?.toFixed(1)}<span>°C</span>
        </div>
        <div className="obs-condition">
          <span>{obs.condition === 'Clear' ? '🌙' : obs.condition === 'Partly Cloudy' ? '⛅' : obs.condition === 'Overcast' ? '🌥' : '☁️'}</span>
          <span>{obs.condition}</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div>
            <div className="obs-label">HUMID</div>
            <div className="obs-value">{obs.humidity}%</div>
          </div>
          <div>
            <div className="obs-label">WIND</div>
            <div className="obs-value">{obs.wind_speed} m/s</div>
          </div>
        </div>
      </div>

      {/* RIGHT: รูปวงกลม */}
      <div className="obs-img" style={{
        borderRadius: '50%',
        overflow:     'hidden',
        border:       '2px solid rgba(79,209,197,0.2)',
        flexShrink:   0,
        position:     'relative',
      }}>
        <img
          src={skyPhoto}
          alt={obs.condition}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transition: 'transform 0.4s',
            transform: hovered ? 'scale(1.08)' : 'scale(1)',
          }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.4) 100%)' }}/>
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div style={{
      background: COLORS.card, borderRadius: '16px', height: '100%',
      border: '1.5px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#1e3030', fontSize: '14px',
    }}>
      Loading...
    </div>
  )
}