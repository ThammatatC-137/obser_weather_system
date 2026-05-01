'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COLORS } from '@/constants/observatories'

const TEAL     = COLORS.teal
const TEAL_DIM = '#4a8a8a'

function IconGrid({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3"  y="3"  width="7" height="7" rx="1.5" fill={active ? TEAL : TEAL_DIM} />
      <rect x="14" y="3"  width="7" height="7" rx="1.5" fill={active ? TEAL : TEAL_DIM} />
      <rect x="3"  y="14" width="7" height="7" rx="1.5" fill={active ? TEAL : TEAL_DIM} />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill={active ? TEAL : TEAL_DIM} />
    </svg>
  )
}

// ภูเขา — TNO (ดอยอินทนนท์)
function IconMountain({ active }: { active: boolean }) {
  const c = active ? TEAL : TEAL_DIM
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M2 20 L8 8 L12 14 L15 10 L22 20 Z"
        stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active ? `${TEAL}22` : 'none'} />
      <path d="M13.5 9.5 L15 7 L16.5 9.5" stroke={c} strokeWidth="1.5" strokeLinejoin="round" fill={active ? '#ffffff33' : 'none'} />
    </svg>
  )
}

// บ้าน — APK (Astro Park)
function IconHome({ active }: { active: boolean }) {
  const c = active ? TEAL : TEAL_DIM
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5 L12 3 L21 10.5 V20 H15 V14 H9 V20 H3 Z"
        stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active ? `${TEAL}22` : 'none'} />
    </svg>
  )
}

function IconCompass({ active }: { active: boolean }) {
  const c = active ? TEAL : TEAL_DIM
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2 L19 20 L12 16 L5 20 Z"
        fill={active ? `${TEAL}44` : 'none'}
        stroke={c} strokeWidth="1.8" strokeLinejoin="round"
      />
    </svg>
  )
}

// โลก — หอต่างประเทศ
function IconGlobe({ active }: { active: boolean }) {
  const c = active ? TEAL : TEAL_DIM
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.8" />
      <ellipse cx="12" cy="12" rx="4" ry="9" stroke={c} strokeWidth="1.4" />
      <line x1="3.5" y1="9"  x2="20.5" y2="9"  stroke={c} strokeWidth="1.4" />
      <line x1="3.5" y1="15" x2="20.5" y2="15" stroke={c} strokeWidth="1.4" />
    </svg>
  )
}

// ดาว — หาที่ดูดาว
function IconStar({ active }: { active: boolean }) {
  const c = active ? TEAL : TEAL_DIM
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={active ? `${TEAL}33` : 'none'}
        stroke={c} strokeWidth="1.8" strokeLinejoin="round"
      />
    </svg>
  )
}

const ITEMS = [
  { id: 'all',  label: 'All Station',   path: '/',                Icon: IconGrid     },
  { id: 'TNO',  label: 'TNO',           path: '/observatory/TNO', Icon: IconMountain },
  { id: 'APK',  label: 'Astro Park',    path: '/observatory/APK', Icon: IconHome     },
  { id: 'CCO',  label: 'Chachoengsao', path: '/observatory/CCO', Icon: IconCompass  },
  { id: 'SKA',  label: 'Songkhla',      path: '/observatory/SKA', Icon: IconCompass  },
  { id: 'KKN',  label: 'KhonKaen',      path: '/observatory/KKN', Icon: IconCompass  },
  { id: 'GAO',  label: 'Gao Mei Gu',    path: '/observatory/GAO', Icon: IconGlobe    },
  { id: 'SPB',  label: 'Springbrook',   path: '/observatory/SPB', Icon: IconGlobe    },
  { id: 'SRO',  label: 'Sierra Remote', path: '/observatory/SRO', Icon: IconGlobe    },
  { id: 'PR8',  label: 'PROMPT-8',      path: '/observatory/PR8', Icon: IconGlobe    },
  { id: 'find', label: 'หาที่ดูดาว',    path: '/find',            Icon: IconStar     },
]

type SidebarProps = { activeId: string }

export default function Sidebar({ activeId }: SidebarProps) {
  const [open,    setOpen]    = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const router = useRouter()

  return (
    <>
      <style>{`
        .sidebar-desktop {
          display: flex; position: fixed; left: 12px; top: 12px;
          height: calc(100vh - 24px);
          background: ${COLORS.card};
          border: 1px solid rgba(79,209,197,0.1);
          flex-direction: column; z-index: 100; overflow: hidden;
          transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
          border-radius: 16px;
        }
        .sidebar-mobile {
          display: none; position: fixed; bottom: 0; left: 0; right: 0; height: 64px;
          background: ${COLORS.card};
          border-top: 1px solid rgba(79,209,197,0.1);
          flex-direction: row; align-items: center; justify-content: space-around;
          z-index: 100; padding: 0 8px;
        }
        .sidebar-spacer {
          flex-shrink: 0;
          transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile  { display: flex !important; }
          .sidebar-spacer  { display: none !important; }
        }
      `}</style>

      <aside className="sidebar-desktop" style={{ width: open ? '240px' : '72px' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          padding: open ? '22px 20px 18px 24px' : '22px 0 18px',
          borderBottom: '1px solid rgba(79,209,197,0.08)',
          minHeight: '68px',
        }}>
          {open && (
            <span style={{ fontSize: '17px', fontWeight: '700', color: '#e2e8f0' }}>
              Stations
            </span>
          )}
          <div
            onClick={() => setOpen(!open)}
            style={{
              cursor: 'pointer', color: '#8aaac8', fontSize: '22px',
              width: '38px', height: '38px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ☰
          </div>
        </div>

        {/* Menu Items */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 0' }}>
          {ITEMS.map((item, i) => {
            const isActive  = activeId === item.id
            const isHovered = hovered  === item.id
            return (
              <div key={item.id}>
                <div
                  onClick={() => router.push(item.path)}
                  onMouseEnter={() => setHovered(item.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding:        open ? '13px 20px 13px 24px' : '13px 0',
                    justifyContent: open ? 'flex-start' : 'center',
                    margin: '2px 10px', borderRadius: '12px', cursor: 'pointer',
                    background: isActive  ? 'rgba(79,209,197,0.12)'
                              : isHovered ? 'rgba(79,209,197,0.06)'
                              : 'transparent',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <item.Icon active={isActive || isHovered} />
                  {open && (
                    <span style={{
                      fontSize:   '14px',
                      fontWeight: isActive ? '600' : '400',
                      color: isActive  ? TEAL
                           : isHovered ? '#a0cfc9'
                           : '#8aaac8',
                    }}>
                      {item.label}
                    </span>
                  )}
                </div>
                {i === 0 && (
                  <div style={{
                    height: '1px',
                    background: 'rgba(79,209,197,0.08)',
                    margin: '8px 16px',
                  }} />
                )}
              </div>
            )
          })}
        </div>
      </aside>

      <div className="sidebar-spacer" style={{ width: open ? '264px' : '96px' }} />

      <nav className="sidebar-mobile">
        {ITEMS.map(item => {
          const isActive = activeId === item.id
          return (
            <div key={item.id}
              onClick={() => router.push(item.path)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '3px', padding: '6px 8px', borderRadius: '10px', cursor: 'pointer',
                background: isActive ? 'rgba(79,209,197,0.12)' : 'transparent',
                flex: 1, maxWidth: '60px',
              }}
            >
              <item.Icon active={isActive} />
              
            </div>
          )
        })}
      </nav>
    </>
  )
}
