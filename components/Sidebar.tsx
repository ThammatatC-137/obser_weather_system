'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COLORS } from '@/constants/observatories'

const TEAL     = COLORS.teal
const TEAL_DIM = '#3d7a7a'

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

function IconMountain({ active }: { active: boolean }) {
  const fill = active ? TEAL : TEAL_DIM
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <path d="M2 20 L8 8 L12 14 L15 10 L22 20 Z" fill={fill} />
      <path d="M13.5 9.5 L15 7 L16.5 9.5 Z" fill="rgba(255,255,255,0.55)" />
    </svg>
  )
}

function IconHome({ active }: { active: boolean }) {
  const fill = active ? TEAL : TEAL_DIM
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <path d="M12 3 L21 10.5 V20 H15 V14 H9 V20 H3 V10.5 Z" fill={fill} />
      <rect x="9" y="14" width="6" height="6" fill="rgba(0,0,0,0.3)" />
    </svg>
  )
}

function IconCompass({ active }: { active: boolean }) {
  const fill = active ? TEAL : TEAL_DIM
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <polygon points="12,2 20,21 12,16 4,21" fill={fill} transform="rotate(30, 12, 12)" />
    </svg>
  )
}

function IconGlobe({ active }: { active: boolean }) {
  const fill = active ? TEAL : TEAL_DIM
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill={fill} />
      {/* เส้น longitude */}
      <ellipse cx="12" cy="12" rx="3.5" ry="9" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
      {/* เส้น latitude */}
      <line x1="3" y1="9"  x2="21" y2="9"  stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
      <line x1="3" y1="15" x2="21" y2="15" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
      {/* เส้น equator */}
      <line x1="3" y1="12" x2="21" y2="12" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
    </svg>
  )
}

function IconStar({ active }: { active: boolean }) {
  const fill = active ? TEAL : TEAL_DIM
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={fill} />
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
          background: linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%);
          border: 1px solid rgba(255,255,255,0.06);
          flex-direction: column; z-index: 100; overflow: hidden;
          transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          font-family: var(--font-poppins);
        }
        .sidebar-mobile {
          display: none; position: fixed; bottom: 0; left: 0; right: 0; height: 64px;
          background: linear-gradient(135deg, #1a2540 0%, #0f1a2e 100%);
          border-top: 1px solid rgba(255,255,255,0.06);
          flex-direction: row; align-items: center; justify-content: space-around;
          z-index: 100; padding: 0 8px;
          font-family: var(--font-poppins);
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
          padding: open ? '16px 20px 16px 24px' : '16px 0',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          minHeight: '56px',
        }}>
          {open && (
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', letterSpacing: '0.1em' }}>
              STATIONS
            </span>
          )}
          <div
            onClick={() => setOpen(!open)}
            style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '18px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            ☰
          </div>
        </div>

        {/* Menu Items */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
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
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding:        open ? '11px 20px 11px 24px' : '11px 0',
                    justifyContent: open ? 'flex-start' : 'center',
                    margin: '2px 8px', borderRadius: '10px', cursor: 'pointer',
                    background: isActive  ? 'rgba(6,214,160,0.1)'
                              : isHovered ? 'rgba(255,255,255,0.04)'
                              : 'transparent',
                    border: isActive ? '1px solid rgba(6,214,160,0.2)' : '1px solid transparent',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <item.Icon active={isActive || isHovered} />
                  {open && (
                    <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 400, color: isActive ? TEAL : isHovered ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>
                      {item.label}
                    </span>
                  )}
                </div>
                {i === 0 && (
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '6px 16px' }} />
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
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 8px', borderRadius: '10px', cursor: 'pointer', background: isActive ? 'rgba(6,214,160,0.1)' : 'transparent', flex: 1, maxWidth: '60px' }}
            >
              <item.Icon active={isActive} />
            </div>
          )
        })}
      </nav>
    </>
  )
}
