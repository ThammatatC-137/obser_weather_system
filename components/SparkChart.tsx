'use client'
import { useState, useCallback, useId } from 'react'
import { COLORS } from '@/constants/observatories'

type Props = {
  data:       number[]
  times:      string[]
  label:      string
  unit:       string
  fixedMin?:  number
  fixedMax?:  number
  extraData?: { label: string; data: number[]; unit: string; color?: string }
  yTicks?:    number
  color?:     string
  emptyMin?:  number
  emptyMax?:  number
}

function buildPath(pts: [number, number][]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const cpx = (x0 + x1) / 2
    d += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`
  }
  return d
}

function buildXTicks(times: string[], count = 4): { label: string; ratio: number }[] {
  if (times.length < 2) return []
  const result: { label: string; ratio: number }[] = []
  const step = Math.floor((times.length - 1) / (count - 1))
  for (let i = 0; i < count; i++) {
    const idx = Math.min(i * step, times.length - 1)
    result.push({
      label: times[idx] ? new Date(times[idx]).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
      ratio: idx / (times.length - 1),
    })
  }
  return result
}

const formatVal = (v: number) =>
  v >= 1000 ? v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : v.toFixed(1)

const cardBase: React.CSSProperties = {
  background:  'linear-gradient(135deg, #16223f 0%, #0d1627 50%, #161c30 100%)',
  borderRadius: '12px',
  padding:     '14px 16px 10px',
  position:    'relative',
  fontFamily:  'var(--font-poppins)',
  transition:  'transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s, border-color 0.2s',
}

const BOX_W = 180
const BOX_H = 40

function FloatBox({ svgX, svgY, svgW, svgH, containerW, containerH, color, dashed, label, value, unit }: {
  svgX: number; svgY: number; svgW: number; svgH: number
  containerW: number; containerH: number
  color: string; dashed?: boolean; label: string; value: string; unit: string
}) {
  const px = (svgX / svgW) * containerW
  const py = (svgY / svgH) * containerH
  const gap = 10
  let left = px + gap
  if (left + BOX_W > containerW - 4) left = px - BOX_W - gap
  let top = py - BOX_H / 2
  if (top < 0) top = 4
  if (top + BOX_H > containerH) top = containerH - BOX_H - 4

  return (
    <div style={{ position: 'absolute', left, top, width: BOX_W, height: BOX_H, background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 100%)', border: `1px solid ${color}40`, borderRadius: '8px', padding: '0 14px', boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px ${color}20`, pointerEvents: 'none', zIndex: 25, display: 'flex', alignItems: 'center', gap: '10px', boxSizing: 'border-box', fontFamily: 'var(--font-poppins)' }}>
      {dashed ? (
        <span style={{ width: '14px', height: '0', borderTop: `2.5px dashed ${color}`, flexShrink: 0 }} />
      ) : (
        <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: color, flexShrink: 0 }} />
      )}
      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {value} {unit}
      </span>
    </div>
  )
}

const DATE_W = 140
const DATE_H = 30

function DateBox({ svgX, svgY, svgW, svgH, containerW, containerH, text }: {
  svgX: number; svgY: number; svgW: number; svgH: number
  containerW: number; containerH: number; text: string
}) {
  const px = (svgX / svgW) * containerW
  const py = (svgY / svgH) * containerH + 12
  let left = px - DATE_W / 2
  if (left < 0) left = 4
  if (left + DATE_W > containerW) left = containerW - DATE_W - 4
  let top = py
  if (top + DATE_H > containerH) top = py - DATE_H - 24

  return (
    <div style={{ position: 'absolute', left, top, width: DATE_W, height: DATE_H, background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 100%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', pointerEvents: 'none', zIndex: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', boxSizing: 'border-box', fontFamily: 'var(--font-poppins)', letterSpacing: '0.03em' }}>
      {text}
    </div>
  )
}

function EmptyGraph({ label, yTicks, times, emptyMin = 0, emptyMax = 1 }: {
  label: string; yTicks: number; times: string[]; emptyMin?: number; emptyMax?: number
}) {
  const [hov, setHov]     = useState(false)
  const [cross, setCross] = useState<{ svgX: number; ratioX: number } | null>(null)
  const [cSize, setCSize] = useState({ w: 300, h: 110 })

  const W = 320, H = 110, padT = 10, padB = 4
  const innerH = H - padT - padB
  const range  = emptyMax - emptyMin || 1
  const yTickValues = Array.from({ length: yTicks }, (_, i) => emptyMin + (range / (yTicks - 1)) * i).reverse()
  const toY = (v: number) => padT + innerH - ((v - emptyMin) / range) * innerH
  const xTickItems = buildXTicks(times, 4)

  const getTimeAtRatio = (ratio: number) => {
    if (times.length === 0) return ''
    const idx = Math.round(ratio * (times.length - 1))
    const t = times[Math.max(0, Math.min(times.length - 1, idx))]
    return t ? new Date(t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', '') : ''
  }

  return (
    <div
      style={{ ...cardBase, border: `1px solid ${hov ? 'rgba(6,214,160,0.35)' : 'rgba(255,255,255,0.06)'}`, transform: hov ? 'translateY(-4px)' : 'translateY(0)', boxShadow: hov ? '0 12px 28px rgba(0,0,0,0.55), 0 0 0 1px rgba(6,214,160,0.12)' : '0 4px 20px rgba(0,0,0,0.4)', overflow: 'visible' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setCross(null) }}
    >
      <div style={{ marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)', paddingTop: `${padT}px`, paddingBottom: `${padB}px`, minWidth: '36px', textAlign: 'right', lineHeight: 1, flexShrink: 0 }}>
          {yTickValues.map((v, i) => <span key={i}>{formatVal(v)}</span>)}
        </div>
        <div style={{ position: 'relative', flex: 1 }}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', cursor: 'crosshair' }}
            onMouseMove={e => { const rect = e.currentTarget.getBoundingClientRect(); setCSize({ w: rect.width, h: rect.height }); const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); setCross({ svgX: ratio * W, ratioX: ratio }) }}
            onMouseLeave={() => setCross(null)}
          >
            {yTickValues.map((v, i) => <line key={i} x1={0} y1={toY(v)} x2={W} y2={toY(v)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />)}
            {xTickItems.map((t, i) => <line key={i} x1={t.ratio * W} y1={padT} x2={t.ratio * W} y2={H - padB} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />)}
            {cross && <line x1={cross.svgX} y1={padT} x2={cross.svgX} y2={H - padB} stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3 3" />}
          </svg>
          {cross && <DateBox svgX={cross.svgX} svgY={H / 2} svgW={W} svgH={H} containerW={cSize.w} containerH={cSize.h} text={getTimeAtRatio(cross.ratioX)} />}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '5px', paddingLeft: '42px' }}>
        {xTickItems.map((t, i) => <span key={i}>{t.label}</span>)}
      </div>
    </div>
  )
}

export function SparkChart({ data, times, label, unit, fixedMin, fixedMax, extraData, yTicks = 4, color, emptyMin, emptyMax }: Props) {
  const uid = useId().replace(/:/g, '')
  const [tooltip,  setTooltip]  = useState<{ svgX: number; svgY: number; extraSvgY: number | null; idx: number } | null>(null)
  const [hovered,  setHovered]  = useState(false)
  const [cSize,    setCSize]    = useState({ w: 300, h: 110 })

  const accentColor = color || COLORS.teal
  const valid = data.filter(v => v != null && !isNaN(v))
  if (valid.length === 0) return <EmptyGraph label={label} yTicks={yTicks} times={times} emptyMin={emptyMin} emptyMax={emptyMax} />

  const dataMin = Math.min(...valid)
  const dataMax = Math.max(...valid)
  const padding = dataMin === dataMax ? Math.abs(dataMin) * 0.1 || 0.5 : 0
  const min     = fixedMin ?? dataMin - padding
  const max     = fixedMax ?? dataMax + padding
  const range   = max - min || 1

  const W = 320, H = 110
  const padL = 0, padR = 0, padT = 10, padB = 4
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const toX = (i: number) => padL + (i / Math.max(data.length - 1, 1)) * innerW
  const toY = (v: number) => padT + innerH - ((Math.max(min, Math.min(max, v)) - min) / range) * innerH

  const pts: [number, number][] = data
    .map((v, i): [number, number] | null => v != null && !isNaN(v) ? [toX(i), toY(v)] : null)
    .filter((p): p is [number, number] => p !== null)

  const linePath = buildPath(pts)
  const areaPath = pts.length > 0 ? `${linePath} L ${pts[pts.length - 1][0]} ${H - padB} L ${pts[0][0]} ${H - padB} Z` : ''

  const extraPts: [number, number][] | null = extraData
    ? extraData.data.map((v, i): [number, number] | null => v != null && !isNaN(v) ? [toX(i), toY(v)] : null).filter((p): p is [number, number] => p !== null)
    : null
  const extraLinePath = extraPts ? buildPath(extraPts) : null

  const yTickValues = Array.from({ length: yTicks }, (_, i) => min + (range / (yTicks - 1)) * i).reverse()
  const xTickItems  = buildXTicks(times, 4)

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setCSize({ w: rect.width, h: rect.height })
    const xRel = (e.clientX - rect.left) / rect.width * W
    const idx  = Math.max(0, Math.min(data.length - 1, Math.round((xRel - padL) / innerW * (data.length - 1))))
    const mainV  = data[idx]
    const extraV = extraData?.data[idx]
    setTooltip({ svgX: toX(idx), svgY: (mainV != null && !isNaN(mainV)) ? toY(mainV) : H / 2, extraSvgY: (extraV != null && !isNaN(extraV)) ? toY(extraV) : null, idx })
  }, [data, extraData, innerW])

  const fmtDate = (t: string) =>
    new Date(t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', '')

  return (
    <div
      style={{ ...cardBase, border: `1px solid ${hovered ? 'rgba(6,214,160,0.35)' : 'rgba(255,255,255,0.06)'}`, transform: hovered ? 'translateY(-4px)' : 'translateY(0)', boxShadow: hovered ? '0 12px 28px rgba(0,0,0,0.55), 0 0 0 1px rgba(6,214,160,0.12)' : '0 4px 20px rgba(0,0,0,0.4)', overflow: 'visible' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTooltip(null) }}
    >
      <div style={{ marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)', paddingTop: `${padT}px`, paddingBottom: `${padB}px`, minWidth: '36px', textAlign: 'right', lineHeight: 1, flexShrink: 0 }}>
          {yTickValues.map((v, i) => <span key={i}>{formatVal(v)}</span>)}
        </div>

        <div style={{ position: 'relative', flex: 1 }}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', cursor: 'crosshair' }} onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
            <defs>
              <clipPath id={`clip-${uid}`}><rect x={padL} y={padT} width={innerW} height={innerH} /></clipPath>
              <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={accentColor} stopOpacity="0.30" />
                <stop offset="75%"  stopColor={accentColor} stopOpacity="0.06" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="0.00" />
              </linearGradient>
              {extraLinePath && (
                <linearGradient id={`grad-ex-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={extraData?.color || '#8AAAC8'} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={extraData?.color || '#8AAAC8'} stopOpacity="0.00" />
                </linearGradient>
              )}
            </defs>

            {yTickValues.map((v, i) => <line key={i} x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />)}
            {xTickItems.map((t, i) => <line key={i} x1={padL + t.ratio * innerW} y1={padT} x2={padL + t.ratio * innerW} y2={H - padB} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />)}

            {areaPath && <path d={areaPath} fill={`url(#grad-${uid})`} clipPath={`url(#clip-${uid})`} />}
            {extraLinePath && extraPts && (
              <path d={`${extraLinePath} L ${extraPts[extraPts.length-1][0]} ${H-padB} L ${extraPts[0][0]} ${H-padB} Z`} fill={`url(#grad-ex-${uid})`} clipPath={`url(#clip-${uid})`} />
            )}
            {linePath && <path d={linePath} fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />}
            {extraLinePath && <path d={extraLinePath} fill="none" stroke={extraData?.color || '#8AAAC8'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 3" />}

            {tooltip && (
              <>
                <line x1={tooltip.svgX} y1={padT} x2={tooltip.svgX} y2={H - padB} stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="3 3" />
                {data[tooltip.idx] != null && !isNaN(data[tooltip.idx]) && (
                  <circle cx={tooltip.svgX} cy={tooltip.svgY} r="3.5" fill="#fff" stroke={accentColor} strokeWidth="2" style={{ filter: `drop-shadow(0 0 5px ${accentColor})` }} />
                )}
                {tooltip.extraSvgY !== null && (
                  <circle cx={tooltip.svgX} cy={tooltip.extraSvgY} r="3" fill="#fff" stroke={extraData?.color || '#8AAAC8'} strokeWidth="2" />
                )}
              </>
            )}
          </svg>

          {tooltip && (
            <>
              <DateBox svgX={tooltip.svgX} svgY={tooltip.svgY} svgW={W} svgH={H} containerW={cSize.w} containerH={cSize.h} text={times[tooltip.idx] ? fmtDate(times[tooltip.idx]) : ''} />
              {data[tooltip.idx] != null && !isNaN(data[tooltip.idx]) && (
                <FloatBox svgX={tooltip.svgX} svgY={tooltip.svgY} svgW={W} svgH={H} containerW={cSize.w} containerH={cSize.h} color={accentColor} label={label} value={formatVal(data[tooltip.idx])} unit={unit} />
              )}
              {extraData && tooltip.extraSvgY !== null && extraData.data[tooltip.idx] != null && !isNaN(extraData.data[tooltip.idx]) && (
                <FloatBox svgX={tooltip.svgX} svgY={tooltip.extraSvgY} svgW={W} svgH={H} containerW={cSize.w} containerH={cSize.h} color={extraData.color || '#8AAAC8'} dashed label={extraData.label} value={extraData.data[tooltip.idx].toFixed(1)} unit={extraData.unit} />
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '5px', paddingLeft: '42px' }}>
        {xTickItems.map((t, i) => <span key={i}>{t.label}</span>)}
      </div>
    </div>
  )
}
