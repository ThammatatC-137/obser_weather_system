'use client'
import { useState }     from 'react'
import Sidebar           from '@/components/Sidebar'
import { ObsCard } from '@/components/ObsCard'
import { WorldMap } from '@/components/Map/WorldMap'
import AiChat            from '@/components/AiChat'
import { useWeather }    from '@/hooks/useWeather'
import { COLORS }        from '@/constants/observatories'

function SkeletonCard() {
  return (
    <div style={{ background: COLORS.card, borderRadius: '16px', border: '1px solid rgba(79,209,197,0.08)', padding: '20px', minHeight: '200px', animation: 'pulse 1.5s infinite' }}>
      <div style={{ height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '12px', width: '60%' }} />
      <div style={{ height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '8px' }} />
      <div style={{ height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', width: '80%' }} />
    </div>
  )
}

export default function Home() {
  const { observatories, loading, lastUpdate } = useWeather()
  const [filterIds, setFilterIds] = useState<string[] | null>(null)

  const displayed = filterIds
    ? observatories.filter(o => filterIds.includes(o.observatory_id))
    : observatories

  const faded = filterIds
    ? observatories.filter(o => !filterIds.includes(o.observatory_id))
    : []

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, color: '#f1f5f9', fontFamily: "'DM Sans','Helvetica Neue',sans-serif", display: 'flex' }}>
      <style>{`
        * { box-sizing: border-box; }
        .main-layout { flex: 1; min-width: 0; padding: 20px 28px; }
        .obs-grid { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          grid-auto-rows: minmax(200px, auto);
          gap: 14px; 
        }
        @media (max-width: 1100px) { .obs-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 680px)  { .obs-grid { grid-template-columns: repeat(1, 1fr); } }
        @media (max-width: 768px)  { .main-layout { padding: 12px; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
      <Sidebar activeId="all" />
      <main className="main-layout">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" fill={COLORS.teal} />
          <line x1="12" y1="2"  x2="12" y2="5"  stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="19" x2="12" y2="22" stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" />
          <line x1="2"  y1="12" x2="5"  y2="12" stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" />
          <line x1="19" y1="12" x2="22" y2="12" stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" />
          <line x1="4.22"  y1="4.22"  x2="6.34"  y2="6.34"  stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" />
          <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" />
          <line x1="19.78" y1="4.22"  x2="17.66" y2="6.34"  stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" />
          <line x1="6.34"  y1="17.66" x2="4.22"  y2="19.78" stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" />
        </svg>
          <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.02em' }}>Weather Report</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {lastUpdate && <span style={{ fontSize: '11px', color: '#2a4a4a' }}>Updated {lastUpdate}</span>}
            <span style={{ fontSize: '11px', color: '#1e3030', letterSpacing: '0.1em', fontWeight: '600' }}>{observatories.length} OBSERVATORIES</span>
          </div>
        </div>

        {/* แผนที่ */}
        <WorldMap observatories={observatories} />

        {/* AI Chat */}
        <AiChat
          observatories={observatories}
          onFilter={setFilterIds}
        />

        {/* Filter Badge */}
        {filterIds && filterIds.length > 0 && (
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#4fd1c5' }}>
              ✦ กรองแสดง {filterIds.length} หอดูดาวครับ
            </span>
            <button
              onClick={() => setFilterIds(null)}
              style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}
            >
              ✕ ล้างตัวกรอง
            </button>
          </div>
        )}

        {/* Cards */}
        <div className="obs-grid">
          {loading
            ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
            : <>
                {displayed.map(obs => (
                  <ObsCard key={obs.observatory_id} obs={obs} />
                ))}
                {faded.map(obs => (
                  <div key={obs.observatory_id} style={{ opacity: 0.25, pointerEvents: 'none' }}>
                    <ObsCard obs={obs} />
                  </div>
                ))}
              </>
          }
        </div>

      </main>
    </div>
  )
}
