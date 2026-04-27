'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COLORS } from '@/constants/observatories'

const TEAL     = COLORS.teal
const TEAL_DIM = COLORS.tealDim

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

function IconStar({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={active ? TEAL : 'none'} stroke={active ? TEAL : TEAL_DIM} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function IconTriangle({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <polygon points="12,3 22,21 2,21" fill="none" stroke={active ? TEAL : TEAL_DIM} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function IconGlobe({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={active ? TEAL : TEAL_DIM} strokeWidth="2" />
      <ellipse cx="12" cy="12" rx="4" ry="9" stroke={active ? TEAL : TEAL_DIM} strokeWidth="1.5" />
      <line x1="3.5" y1="9"  x2="20.5" y2="9"  stroke={active ? TEAL : TEAL_DIM} strokeWidth="1.5" />
      <line x1="3.5" y1="15" x2="20.5" y2="15" stroke={active ? TEAL : TEAL_DIM} strokeWidth="1.5" />
    </svg>
  )
}

const ITEMS = [
  { id: 'all',  label: 'All Station', path: '/',                Icon: IconGrid     },
  { id: 'find', label: 'หาที่ดูดาว', path: '/find',            Icon: IconStar     },
  { id: 'TNO',  label: 'TNO',         path: '/observatory/TNO', Icon: IconTriangle },
  { id: 'APK',  label: 'APK',         path: '/observatory/APK', Icon: IconTriangle },
  { id: 'CCO',  label: 'CCO',         path: '/observatory/CCO', Icon: IconTriangle },
  { id: 'SKA',  label: 'SKA',         path: '/observatory/SKA', Icon: IconTriangle },
  { id: 'KKN',  label: 'KKN',         path: '/observatory/KKN', Icon: IconTriangle },
  { id: 'GAO',  label: 'GAO',         path: '/observatory/GAO', Icon: IconGlobe    },
  { id: 'SPB',  label: 'SPB',         path: '/observatory/SPB', Icon: IconGlobe    },
  { id: 'SRO',  label: 'SRO',         path: '/observatory/SRO', Icon: IconGlobe    },
  { id: 'PR8',  label: 'PR8',         path: '/observatory/PR8', Icon: IconGlobe    },
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
          display: flex;
          position: fixed;
          left: 12px;
          top: 12px;
          height: calc(100vh - 24px);
          background: ${COLORS.mid};
          border: 1px solid rgba(79,209,197,0.1);
          border-radius: 16px;
          flex-direction: column;
          z-index: 100;
          overflow: hidden;
          transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        .sidebar-mobile {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          height: 64px;
          background: ${COLORS.mid};
          border-top: 1px solid rgba(79,209,197,0.1);
          flex-direction: row;
          align-items: center;
          justify-content: space-around;
          z-index: 100;
          padding: 0 8px;
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', padding: open ? '22px 20px 18px 24px' : '22px 0 18px', borderBottom: '1px solid rgba(79,209,197,0.08)', minHeight: '68px' }}>
          {open && <span style={{ fontSize: '17px', fontWeight: '700', color: TEAL }}>Stations</span>}
          <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer', color: TEAL_DIM, fontSize: '22px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>☰</div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 0' }}>
          {ITEMS.map((item, i) => {
            const isActive  = activeId === item.id
            const isHovered = hovered === item.id
            return (
              <div key={item.id}>
                <div
                  onClick={() => router.push(item.path)}
                  onMouseEnter={() => setHovered(item.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: open ? '13px 20px 13px 24px' : '13px 0', justifyContent: open ? 'flex-start' : 'center', margin: '2px 10px', borderRadius: '12px', cursor: 'pointer', background: isActive ? 'rgba(79,209,197,0.12)' : isHovered ? 'rgba(79,209,197,0.05)' : 'transparent', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                >
                  <item.Icon active={isActive || isHovered} />
                  {open && <span style={{ fontSize: '14px', fontWeight: isActive ? '600' : '400', color: isActive ? TEAL : isHovered ? '#7dd3c8' : '#3d6060' }}>{item.label}</span>}
                </div>
                {/* เส้นแบ่งหลัง All Station และ หาที่ดูดาว */}
                {(i === 0 || i === 1) && <div style={{ height: '1px', background: 'rgba(79,209,197,0.08)', margin: '8px 16px' }} />}
              </div>
            )
          })}
        </div>
      </aside>

      <div className="sidebar-spacer" style={{ width: open ? '264px' : '96px' }} />

      <nav className="sidebar-mobile">
        {ITEMS.slice(0, 6).map(item => {
          const isActive = activeId === item.id
          return (
            <div key={item.id} onClick={() => router.push(item.path)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 8px', borderRadius: '10px', cursor: 'pointer', background: isActive ? 'rgba(79,209,197,0.12)' : 'transparent', flex: 1, maxWidth: '60px' }}>
              <item.Icon active={isActive} />
              <span style={{ fontSize: '9px', color: isActive ? TEAL : TEAL_DIM, fontWeight: '500' }}>{item.label}</span>
            </div>
          )
        })}
      </nav>
    </>
  )
}
