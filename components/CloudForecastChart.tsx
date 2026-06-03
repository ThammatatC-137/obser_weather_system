'use client'
import { useEffect, useState, useId } from 'react'
import { COLORS, OBS_COORDS, OBS_TIMEZONE } from '@/constants/observatories'
import { getSunAltitude } from '@/lib/moonPhase'

type Pt    = { time: string; pct: number }
type Props = { obsId: string; currentPct: number }

const W = 320, H = 120, padT = 10, padB = 4
const BACK_MS = 15 * 60 * 1000   // ย้อนหลัง 15 นาที
const FWD_MS  = 15 * 60 * 1000   // ล่วงหน้า 15 นาที
const TICK_MS = 5 * 60 * 1000    // ขีดสเกลแกน x ทุก 5 นาที
const STEP    = 5 * 60 * 1000    // กริดของเส้นทำนายทุก 5 นาที
const HORIZON = 5 * 60 * 1000    // ทำนายย้อนหลังล่วงหน้าทีละ 5 นาที

const ACTUAL_COLOR = COLORS.teal   // ค่าจริงที่วัดจากรูป (SAM) / NARIT
const PRED_COLOR   = '#fbbf24'     // ค่าทำนาย

const clamp = (v: number) => Math.max(0, Math.min(100, v))

function buildPath(pts: ([number, number] | null)[]): string {
  let d = '', prev: [number, number] | null = null
  for (const p of pts) {
    if (!p) { prev = null; continue }
    if (!prev) d += `M${p[0]} ${p[1]}`
    else { const cx = (prev[0] + p[0]) / 2; d += ` C${cx} ${prev[1]} ${cx} ${p[1]} ${p[0]} ${p[1]}` }
    prev = p
  }
  return d
}

function interpAt(points: { t: number; pct: number }[], t: number): number | null {
  if (points.length === 0) return null
  if (t < points[0].t || t > points[points.length - 1].t) return null
  let i = 0
  while (i < points.length - 1 && points[i + 1].t < t) i++
  const a = points[i], b = points[i + 1] ?? points[i]
  if (b.t === a.t) return a.pct
  return a.pct + (b.pct - a.pct) * ((t - a.t) / (b.t - a.t))
}

function trendSlope(pts: { t: number; pct: number }[]): number {
  if (pts.length < 2) return 0
  const n = pts.length
  const mt = pts.reduce((s, p) => s + p.t, 0) / n
  const my = pts.reduce((s, p) => s + p.pct, 0) / n
  let num = 0, den = 0
  for (const p of pts) { num += (p.t - mt) * (p.pct - my); den += (p.t - mt) ** 2 }
  return den === 0 ? 0 : num / den
}

export function CloudForecastChart({ obsId, currentPct }: Props) {
  const uid = useId().replace(/:/g, '')
  const [history, setHistory] = useState<Pt[]>([])
  const [loading, setLoading] = useState(true)
  const [hover,   setHover]   = useState<{ ratio: number; t: number } | null>(null)

  // ดึงค่าจริง (history) รีเฟรชทุก 1 นาที
  useEffect(() => {
    let cancelled = false
    const load = () => fetch(`/api/cloud-prediction?id=${obsId}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        setHistory(d?.success && Array.isArray(d.history) ? d.history : [])
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    setLoading(true)
    load()
    const timer = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [obsId])

  if (loading) return (
    <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
      LOADING...
    </div>
  )

  const now   = Date.now()
  const start = now - BACK_MS
  const end   = now + FWD_MS
  const span  = BACK_MS + FWD_MS
  const toX   = (t: number) => ((t - start) / span) * W

  const c       = OBS_COORDS[obsId]
  const isNight = c ? getSunAltitude('', '', c.lat, c.lon) < 0 : false

  // ค่าจริง เผื่อย้อนก่อนหน้าต่างกราฟ 30 นาที ไว้ใช้คำนวณทำนายย้อน + ค่าปัจจุบันที่ now
  const allPts = history
    .map(p => ({ t: new Date(p.time).getTime(), pct: Number(p.pct) }))
    .filter(p => !isNaN(p.t) && !isNaN(p.pct) && p.t >= start - 30 * 60000 && p.t <= now)
    .sort((a, b) => a.t - b.t)
  if (!isNaN(currentPct)) allPts.push({ t: now, pct: currentPct })

  // ค่าจริงเฉพาะในหน้าต่างกราฟ (15 นาทีล่าสุด) สำหรับวาดเส้นเขียว
  const actual = allPts.filter(p => p.t >= start)

  const samNow = !isNaN(currentPct) ? currentPct : (actual.length ? actual[actual.length - 1].pct : null)

  if (actual.length < 2 && samNow == null) return (
    <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
      รอข้อมูลสะสม...
    </div>
  )

  // อนาคต: ทำนายต่อด้วยเทรนด์จากค่าจริงล่าสุด
  const futureSlope = trendSlope(allPts.filter(p => p.t >= now - 15 * 60000))

  // อดีต: ทำนายย้อนหลังจากข้อมูลก่อนหน้า ทีละ 5 นาที
  const backtest = (T: number): number | null => {
    const base = interpAt(allPts, T - HORIZON)
    if (base == null) return null
    const s = trendSlope(allPts.filter(p => p.t >= T - HORIZON - 15 * 60000 && p.t <= T - HORIZON))
    return clamp(base + s * HORIZON)
  }

  // เส้นทำนายต่อเนื่องตลอดกราฟ: อดีต=ทำนายย้อน, อนาคต=เทรนด์ต่อ
  const grid: number[] = []
  for (let t = Math.ceil(start / STEP) * STEP; t <= end; t += STEP) grid.push(t)
  const predSeries = grid.map(T => {
    if (T <= now) return backtest(T)
    return samNow != null ? clamp(samNow + futureSlope * (T - now)) : null
  })
  const predPoints = grid
    .map((t, i) => ({ t, pct: predSeries[i] }))
    .filter((p): p is { t: number; pct: number } => p.pct != null)

  // ค่าทำนายที่เวลา T: อดีต=ทำนายย้อน, อนาคต=เทรนด์ต่อ (คำนวณตรง ไม่ผ่านกริด)
  const predAt = (T: number): number | null =>
    T <= now ? backtest(T) : (samNow != null ? clamp(samNow + futureSlope * (T - now)) : null)
  const predAtMin = (m: number) => predAt(now + m * 60000)

  // คลาดเคลื่อนเฉลี่ย: ทำนายย้อน vs ค่าจริง (เฉพาะอดีต)
  const errs = grid.map((t, i) => {
    if (t > now || predSeries[i] == null) return null
    const a = interpAt(actual, t)
    return a == null ? null : Math.abs(a - predSeries[i]!)
  }).filter((v): v is number => v != null)
  const avgErr = errs.length ? Math.round(errs.reduce((a, b) => a + b, 0) / errs.length) : null

  // สเกลแกน y
  const allVals = [...actual.map(p => p.pct), ...predPoints.map(p => p.pct)]
  let minV = Math.min(...allVals), maxV = Math.max(...allVals)
  if (maxV - minV < 20) { const mid = (minV + maxV) / 2; minV = mid - 10; maxV = mid + 10 }
  minV = Math.max(0, minV - 4)
  maxV = Math.min(100, maxV + 4)
  const range = maxV - minV || 1
  const toY = (v: number) => padT + (H - padT - padB) - ((v - minV) / range) * (H - padT - padB)

  const actualPts  = actual.map(p => [toX(p.t), toY(p.pct)] as [number, number])
  const actualPath = buildPath(actualPts)
  const actualArea = actualPts.length > 1
    ? `${actualPath} L${actualPts[actualPts.length - 1][0]} ${H - padB} L${actualPts[0][0]} ${H - padB} Z`
    : ''

  const predPts: ([number, number] | null)[] = grid.map((t, i) => predSeries[i] == null ? null : [toX(t), toY(predSeries[i]!)])
  const predPath = buildPath(predPts)

  const nowX   = toX(now)
  const yTicks = [minV, (minV + maxV) / 2, maxV].map(v => Math.round(v))
  const tz     = OBS_TIMEZONE[obsId] || 'UTC'
  const xTicks: { x: number; label: string }[] = []
  for (let t = Math.ceil(start / TICK_MS) * TICK_MS; t <= end; t += TICK_MS) {
    xTicks.push({ x: toX(t), label: new Date(t).toLocaleTimeString('th-TH', { timeZone: tz, hour: '2-digit', minute: '2-digit' }) })
  }

  const samLabel = isNight ? 'NARIT (กลางคืน)' : 'SAM (กล้อง)'

  const hoverActual = hover ? interpAt(actual, hover.t) : null
  const hoverPred   = hover ? predAt(hover.t) : null
  const hoverLabel  = hover ? new Date(hover.t).toLocaleTimeString('th-TH', { timeZone: tz, hour: '2-digit', minute: '2-digit' }) : ''

  const Stat = ({ label, value, color }: { label: string; value: number | null; color: string }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color, lineHeight: 1.1 }}>
        {value != null ? `${Math.round(value)}%` : '--'}
      </div>
    </div>
  )

  return (
    <div>
      {/* ตัวเลขสรุป */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <Stat label={samLabel}          value={samNow}        color={ACTUAL_COLOR} />
        <Stat label="ทำนาย"             value={predAtMin(15)} color={PRED_COLOR} />
        <Stat label="คลาดเคลื่อนเฉลี่ย" value={avgErr}        color={avgErr != null && avgErr > 15 ? '#f87171' : '#4ade80'} />
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>
        {/* label แกน y */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.45)', paddingTop: `${padT}px`, paddingBottom: `${padB}px`, minWidth: '28px', textAlign: 'right', lineHeight: 1, flexShrink: 0 }}>
          {[...yTicks].reverse().map((v, i) => <span key={i}>{v}%</span>)}
        </div>

        {/* กราฟ SVG */}
        <div style={{ flex: 1, position: 'relative' }}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', cursor: 'crosshair' }}
            onMouseMove={e => {
              const r = e.currentTarget.getBoundingClientRect()
              const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
              setHover({ ratio, t: start + ratio * span })
            }}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id={`act-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={ACTUAL_COLOR} stopOpacity="0.3" />
                <stop offset="100%" stopColor={ACTUAL_COLOR} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* เส้นกริด */}
            {yTicks.map((v, i) => (
              <line key={i} x1={0} y1={toY(v)} x2={W} y2={toY(v)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            ))}
            {xTicks.map((t, i) => (
              <line key={i} x1={t.x} y1={padT} x2={t.x} y2={H - padB} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            ))}

            {/* ค่าจริง (เขียว) */}
            {actualArea && <path d={actualArea} fill={`url(#act-${uid})`} />}
            {actualPath && <path d={actualPath} fill="none" stroke={ACTUAL_COLOR} strokeWidth="2" strokeLinecap="round" />}

            {/* ทำนาย (เหลืองประ) ทับตลอดเส้น */}
            {predPath && <path d={predPath} fill="none" stroke={PRED_COLOR} strokeWidth="1.8" strokeDasharray="5 3" strokeLinecap="round" />}

            {/* เส้น NOW */}
            <line x1={nowX} y1={padT} x2={nowX} y2={H - padB} stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeDasharray="3 2" />
            {samNow != null && <circle cx={nowX} cy={toY(samNow)} r="3" fill={ACTUAL_COLOR} stroke="#fff" strokeWidth="1" />}

            {/* เส้นตั้ง + จุด ตรงตำแหน่งเมาส์ */}
            {hover && (
              <line x1={hover.ratio * W} y1={padT} x2={hover.ratio * W} y2={H - padB} stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="3 3" />
            )}
            {hover && hoverActual != null && (
              <circle cx={hover.ratio * W} cy={toY(hoverActual)} r="3.5" fill="#fff" stroke={ACTUAL_COLOR} strokeWidth="2" />
            )}
            {hover && hoverPred != null && (
              <circle cx={hover.ratio * W} cy={toY(hoverPred)} r="3.5" fill="#fff" stroke={PRED_COLOR} strokeWidth="2" />
            )}
          </svg>

          <div style={{ position: 'absolute', top: 0, left: `${(nowX / W) * 100}%`, transform: 'translateX(-50%)', fontSize: '9px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, pointerEvents: 'none' }}>
            NOW
          </div>

          {/* tooltip */}
          {hover && (
            <div style={{
              position: 'absolute', top: '2px',
              left: `${hover.ratio * 100}%`,
              transform: hover.ratio > 0.5 ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)',
              background: 'rgba(15,26,46,0.96)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px', padding: '5px 9px', pointerEvents: 'none', whiteSpace: 'nowrap',
              fontSize: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', zIndex: 5,
            }}>
              <div style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '3px', fontWeight: 600 }}>{hoverLabel}</div>
              <div style={{ color: ACTUAL_COLOR, fontWeight: 600 }}>● จริง {hoverActual != null ? `${Math.round(hoverActual)}%` : '--'}</div>
              <div style={{ color: PRED_COLOR, fontWeight: 600 }}>● ทำนาย {hoverPred != null ? `${Math.round(hoverPred)}%` : '--'}</div>
            </div>
          )}
        </div>
      </div>

      {/* label แกน x */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', paddingLeft: '34px' }}>
        {xTicks.map((t, i) => <span key={i}>{t.label}</span>)}
      </div>

      {/* legend */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '10px', flexWrap: 'wrap' }}>
        <span style={{ color: ACTUAL_COLOR }}>— {isNight ? 'NARIT ค่าจริง' : 'SAM ค่าจริง'}</span>
        <span style={{ color: PRED_COLOR }}>--- ทำนาย</span>
      </div>
    </div>
  )
}
