'use client'
import Sidebar                   from '@/components/Sidebar'
import { ObsCard, SkeletonCard } from '@/components/ObsCard'
import { WorldMap }              from '@/components/Map/WorldMap'
import { useWeather }            from '@/hooks/useWeather'
import { COLORS }                from '@/constants/observatories'

export default function Home() {
  const { observatories, loading, lastUpdate } = useWeather()

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, color: '#f1f5f9', fontFamily: "'DM Sans','Helvetica Neue',sans-serif", display: 'flex' }}>
      <style>{`
        * { box-sizing: border-box; }
        .main-layout { flex: 1; min-width: 0; padding: 20px 28px; }
        .obs-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
        .obs-grid > * { min-height: 270px; }
        @media (max-width: 1024px) { .obs-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 768px)  { .main-layout { padding: 12px; } .obs-grid { grid-template-columns: 1fr; } }
      `}</style>

      <Sidebar activeId="all" />

      <main className="main-layout">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexShrink: 0 }}>
          <span style={{ color: '#4fd1c5', fontSize: '22px' }}>✦</span>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.02em' }}>Weather Report</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {lastUpdate && <span style={{ fontSize: '11px', color: '#2a4a4a' }}>Updated {lastUpdate}</span>}
            <span style={{ fontSize: '11px', color: '#1e3030', letterSpacing: '0.1em', fontWeight: '600' }}>{observatories.length} OBSERVATORIES</span>
          </div>
        </div>

        {/* แผนที่ */}
        <WorldMap observatories={observatories} />

        {/* AI Chat */}
        <div style={{ background: COLORS.card, borderRadius: '12px', border: '1px solid rgba(79,209,197,0.15)', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '18px' }}></span>
          <div style={{ flex: 1, background: COLORS.bg, border: '1px solid rgba(79,209,197,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#334155', fontSize: '13px' }}>
            ถามเกี่ยวกับสภาพอากาศ เช่น "คืนนี้หอไหนดูดาวได้บ้าง?"
          </div>
          <div style={{ background: 'rgba(79,209,197,0.15)', border: '1px solid rgba(79,209,197,0.4)', borderRadius: '8px', color: '#4fd1c5', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
             ถาม AI
          </div>
        </div>

        {/* 9 Cards */}
        <div className="obs-grid">
          {loading
            ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
            : observatories.map(obs => <ObsCard key={obs.observatory_id} obs={obs} />)
          }
        </div>

      </main>
    </div>
  )
}