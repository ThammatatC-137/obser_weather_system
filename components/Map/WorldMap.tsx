'use client'
import { useEffect, useRef } from 'react'
import { Observatory }        from '@/types'
import { OBS_COORDS, COLORS } from '@/constants/observatories'
import { calcScore, scoreToColor, scoreToLabel } from '@/lib/obsScore'

type WorldMapProps = {
  observatories: Observatory[]
}

export function WorldMap({ observatories }: WorldMapProps) {
  const mapRef     = useRef<HTMLDivElement>(null)
  const mapObjRef  = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const initedRef  = useRef(false)  // ← ป้องกันสร้างซ้ำครับ

  useEffect(() => {
    if (!mapRef.current || initedRef.current) return
    initedRef.current = true  

    import('leaflet').then(L => {
      const link = document.createElement('link')
      link.rel   = 'stylesheet'
      link.href  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      const map = L.map(mapRef.current!, {
        center:             [20, 20],   
        zoom:               2,
        minZoom:            2,
        maxZoom:            10,
        zoomControl:        true,
        attributionControl: false,
        })

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 10 }
      ).addTo(map)

      mapObjRef.current = { map, L }
    })

    return () => {
      if (mapObjRef.current?.map) {
        mapObjRef.current.map.remove()
        mapObjRef.current = null
        initedRef.current = false
      }
    }
  }, [])

  useEffect(() => {
    if (!mapObjRef.current || observatories.length === 0) return
    const { map, L } = mapObjRef.current

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    observatories.forEach(obs => {
      const coords = OBS_COORDS[obs.observatory_id]
      if (!coords) return

      const score = calcScore(obs)
      const color = scoreToColor(score)
      const label = scoreToLabel(score)

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 8px ${color};"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8],
      })

      const marker = L.marker([coords.lat, coords.lon], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="background:#0d1219;color:#f1f5f9;border-radius:10px;padding:12px;min-width:180px;font-family:sans-serif;">
            <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${obs.name}</div>
            <div style="font-size:11px;color:#64748b;margin-bottom:8px;">${coords.country}</div>
            <div style="font-size:24px;font-weight:200;color:#fff;margin-bottom:4px;">${obs.temperature?.toFixed(1)}°C</div>
            <div style="color:#94a3b8;font-size:12px;margin-bottom:8px;">${obs.condition}</div>
            <div style="display:inline-block;background:${color}20;border:1px solid ${color}60;border-radius:6px;padding:3px 10px;font-size:12px;color:${color};font-weight:600;">
              Score ${score}/100 — ${label}
            </div>
          </div>
        `, { className: 'custom-popup' })

      markersRef.current.push(marker)
    })
  }, [observatories])

  return (
    <div style={{ background: COLORS.card, borderRadius: '14px', border: '1px solid rgba(79,209,197,0.12)', overflow: 'hidden', marginBottom: '16px' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4fd1c5' }}/>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>Real-time Observatory Map</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', fontSize: '11px' }}>
          <span style={{ color: '#4ade80' }}>🟢 พร้อม</span>
          <span style={{ color: '#fbbf24' }}>🟡 พอใช้</span>
          <span style={{ color: '#f87171' }}>🔴 ไม่พร้อม</span>
        </div>
      </div>
      <div ref={mapRef} style={{ height: '420px' }} />
      <style>{`
        .custom-popup .leaflet-popup-content-wrapper { background: #0d1219 !important; border: 1px solid rgba(79,209,197,0.2) !important; border-radius: 10px !important; box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important; padding: 0 !important; }
        .custom-popup .leaflet-popup-content { margin: 0 !important; }
        .custom-popup .leaflet-popup-tip { background: #0d1219 !important; }
      `}</style>
    </div>
  )
}