'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter }                    from 'next/navigation'
import { Observatory }                  from '@/types'
import { OBS_COORDS, COLORS }           from '@/constants/observatories'
import { calcScore, scoreToColor, scoreToLabel } from '@/lib/obsScore'

type GlobeMapProps = { observatories: Observatory[] }

type GlobePoint = {
  lat: number; lng: number
  label: string; name: string; color: string
  score: number; scoreLabel: string
  temp: string; humid: string; wind: string; cond: string
  country: string
}

const OBS_COUNTRY: Record<string, string> = {
  TNO: 'Thailand', APK: 'Thailand', CCO: 'Thailand',
  SKA: 'Thailand', KKN: 'Thailand',
  GAO: 'China', SPB: 'Australia', SRO: 'United States', PR8: 'Chile',
}

const boxBg = 'linear-gradient(135deg, #16223f 0%, #0d1627 50%, #161c30 100%)'

export function GlobeMap({ observatories }: GlobeMapProps) {
  const router    = useRouter()
  const mountRef  = useRef<HTMLDivElement>(null)
  const globeRef  = useRef<any>(null)
  const initedRef = useRef(false)
  const [hovered,  setHovered]  = useState<GlobePoint | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const points: GlobePoint[] = observatories
    .map(obs => {
      const c = OBS_COORDS[obs.observatory_id]
      if (!c) return null
      const score = calcScore(obs)
      return {
        lat: c.lat, lng: c.lon,
        label: obs.observatory_id, name: obs.name,
        color: scoreToColor(score), score, scoreLabel: scoreToLabel(score),
        temp:    obs.temperature != null ? `${obs.temperature.toFixed(1)}°C` : '--',
        humid:   obs.humidity    != null ? `${obs.humidity}%`                : '--',
        wind:    obs.wind_speed  != null ? `${obs.wind_speed} m/s`           : '--',
        cond:    obs.condition   || '--',
        country: OBS_COUNTRY[obs.observatory_id] || '--',
      }
    })
    .filter((p): p is GlobePoint => p !== null)

  // resize observer
  useEffect(() => {
    if (!mountRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      globeRef.current?.width(width).height(height)
    })
    ro.observe(mountRef.current)
    return () => ro.disconnect()
  }, [])

  // init globe
  useEffect(() => {
    if (!mountRef.current || initedRef.current) return
    initedRef.current = true

    import('globe.gl').then(({ default: Globe }) => {
      const w = mountRef.current!.clientWidth
      const h = Math.max(300, Math.min(w * 0.6, 480))
      // สร้าง globe instance ลงใน div
      const globe = (Globe as any)()(mountRef.current!)

      globe
        .width(w).height(h)
        .backgroundColor('rgba(0,0,0,0)')
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .atmosphereColor('#4fc3f7')
        .atmosphereAltitude(0.25)
        .pointsData(points)
        .pointLat('lat').pointLng('lng')
        .pointColor('color')
        .pointRadius(0.7)
        .pointAltitude(0.015)
        .pointResolution(12)
        .pointLabel(() => '')
        .enablePointerInteraction(true)

      globe.controls().autoRotate      = true
      globe.controls().autoRotateSpeed = 0.4
      globe.controls().enableZoom      = true
      globe.controls().minDistance     = 150
      globe.controls().maxDistance     = 600

      globe.pointOfView({ lat: 15, lng: 110, altitude: 2.2 }, 0)

      globe.onPointHover((point: any) => {
        setHovered(point as GlobePoint | null)
        // ชี้ที่จุดแล้วหยุดหมุน เอาเมาส์ออกค่อยหมุนต่อ
        globe.controls().autoRotate = !point
        if (mountRef.current) mountRef.current.style.cursor = point ? 'pointer' : 'default'
      })

      // คลิกจุดหอแล้วเข้าไปหน้ารายละเอียดของหอนั้น
      globe.onPointClick((point: any) => {
        if (point?.label) router.push(`/observatory/${point.label}`)
      })

      globeRef.current = globe
    })

    return () => {
      if (globeRef.current) {
        globeRef.current._destructor?.()
        globeRef.current = null
        initedRef.current = false
      }
    }
  }, [])

  // update points
  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.pointsData(points)
  }, [observatories])

  return (
    <div
      style={{ background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', fontFamily: 'var(--font-poppins)', position: 'relative' }}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
    >
      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: COLORS.teal, boxShadow: `0 0 6px ${COLORS.teal}`, flexShrink: 0 }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', letterSpacing: '0.1em' }}>REAL-TIME OBSERVATORY GLOBE</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '14px', fontSize: '10px', letterSpacing: '0.06em', fontWeight: 600 }}>
          <span style={{ color: '#4ade80' }}>● พร้อม</span>
          <span style={{ color: '#fbbf24' }}>● พอใช้</span>
          <span style={{ color: '#f87171' }}>● ไม่พร้อม</span>
        </div>
      </div>

      {/* Globe */}
      <div ref={mountRef} style={{ width: '100%', height: 'clamp(300px, 55vw, 480px)', position: 'relative' }} />

      {/* Tooltip ใช้สไตล์เดียวกับ ObsCard */}
      {hovered && (
        <div style={{
          position: 'absolute',
          left: Math.min(mousePos.x + 16, (mountRef.current?.clientWidth || 600) - 230),
          top:  Math.max(mousePos.y - 10, 50),
          width: '220px',
          background: boxBg,
          border: `1px solid ${hovered.color}50`,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: `0 12px 32px rgba(0,0,0,0.7), 0 0 0 1px ${hovered.color}20`,
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          {/* header bar */}
          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#fff', fontWeight: 700, letterSpacing: '0.12em' }}>{hovered.label}</span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>{hovered.country}</span>
          </div>

          {/* body */}
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.teal, marginBottom: '10px', lineHeight: 1.3 }}>
              {hovered.name}
            </div>

            <div style={{ fontSize: 'clamp(28px,2.5vw,34px)', fontWeight: 200, color: '#fff', lineHeight: 1, marginBottom: '4px', letterSpacing: '-0.02em' }}>
              {hovered.temp}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginBottom: '12px' }}>
              {hovered.cond}
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '9px', color: 'rgba(79,209,197,0.7)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase' }}>HUMID</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{hovered.humid}</div>
              </div>
              <div>
                <div style={{ fontSize: '9px', color: 'rgba(79,209,197,0.7)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase' }}>WIND</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{hovered.wind}</div>
              </div>
            </div>

            <div style={{ display: 'inline-block', background: `${hovered.color}20`, border: `1px solid ${hovered.color}60`, borderRadius: '5px', padding: '3px 10px', fontSize: '11px', color: hovered.color, fontWeight: 700, letterSpacing: '0.06em' }}>
              {hovered.score}/100 — {hovered.scoreLabel}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
