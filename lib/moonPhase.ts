// ─────────────────────────────────────────────────────────────────────────────
// moonPhase.ts — คำนวณ Moon phase, Sun position, Sun altitude
// ─────────────────────────────────────────────────────────────────────────────

function getMoonIllumination(date: Date): { fraction: number; phase: number } {
  const rad = Math.PI / 180
  const e   = 23.4397 * rad

  function toDays(d: Date) {
    return d.getTime() / 86400000 - 10957.5  // ✅ J2000 offset ถูกต้อง
  }
  function solarMeanAnomaly(d: number) {
    return rad * (357.5291 + 0.98560028 * d)
  }
  function eclipticLongitude(M: number) {
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M))
    return M + C + rad * 102.9372 + Math.PI
  }
  function sunCoords(d: number) {
    const M = solarMeanAnomaly(d), L = eclipticLongitude(M)
    return { dec: Math.asin(Math.sin(e) * Math.sin(L)), ra: Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) }
  }
  function moonCoords(d: number) {
    const L  = rad * (218.316 + 13.176396 * d)
    const M  = rad * (134.963 + 13.064993 * d)
    const F  = rad * (93.272  + 13.229350 * d)
    const l  = L + rad * 6.289 * Math.sin(M)
    const b  = rad * 5.128 * Math.sin(F)
    const dt = 385001 - 20905 * Math.cos(M)
    return {
      ra:   Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l)),
      dec:  Math.asin(Math.sin(e) * Math.sin(l) + Math.cos(e) * Math.sin(b) * Math.cos(l) / Math.cos(b)),
      dist: dt,
    }
  }

  const d     = toDays(date)
  const s     = sunCoords(d)
  const m     = moonCoords(d)
  const phi   = Math.acos(Math.min(1, Math.max(-1,
    Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra)
  )))
  const inc   = Math.atan2(149598000 * Math.sin(phi), m.dist - 149598000 * Math.cos(phi))
  const angle = Math.atan2(
    Math.cos(s.dec) * Math.sin(s.ra - m.ra),
    Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra)
  )
  return {
    fraction: (1 + Math.cos(inc)) / 2,
    phase:    0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI,
  }
}

export function getMoonPhase(date: Date) {
  const { fraction, phase } = getMoonIllumination(date)

  // ✅ ทศนิยม 2 ตำแหน่ง
  const illumination = Math.round(fraction * 10000) / 100

  let phaseName = '', emoji = ''
  if      (phase < 0.0625) { phaseName = 'New Moon';        emoji = '🌑' }
  else if (phase < 0.1875) { phaseName = 'Waxing Crescent'; emoji = '🌒' }
  else if (phase < 0.3125) { phaseName = 'First Quarter';   emoji = '🌓' }
  else if (phase < 0.4375) { phaseName = 'Waxing Gibbous';  emoji = '🌔' }
  else if (phase < 0.5625) { phaseName = 'Full Moon';       emoji = '🌕' }
  else if (phase < 0.6875) { phaseName = 'Waning Gibbous';  emoji = '🌖' }
  else if (phase < 0.8125) { phaseName = 'Last Quarter';    emoji = '🌗' }
  else                     { phaseName = 'Waning Crescent'; emoji = '🌘' }

  return { phase: phaseName, emoji, illumination }
}

export function getSunPosition(sunriseISO: string, sunsetISO: string): number {
  const now  = Date.now()
  const rise = new Date(sunriseISO).getTime()
  const set  = new Date(sunsetISO).getTime()
  if (isNaN(rise) || isNaN(set) || set <= rise) return 0
  return Math.max(0, Math.min(100, ((now - rise) / (set - rise)) * 100))
}

// ✅ รับ lat/lon เพื่อคำนวณแม่น เหมือน SunCalc จริงๆ
export function getSunAltitude(sunriseISO: string, sunsetISO: string, lat: number, lon: number): number {
  const rad = Math.PI / 180
  const now = new Date()
  const d   = now.getTime() / 86400000 - 10957.5

  // sun coords
  const M   = rad * (357.5291 + 0.98560028 * d)
  const C   = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M))
  const L   = M + C + rad * 102.9372 + Math.PI
  const e   = rad * 23.4397
  const dec = Math.asin(Math.sin(e) * Math.sin(L))
  const ra  = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))

  // hour angle
  const lw  = rad * (-lon)
  const phi = rad * lat
  const H   = (rad * (280.16 + 360.9856235 * d)) - lw - ra

  // altitude
  const alt = Math.asin(
    Math.sin(phi) * Math.sin(dec) +
    Math.cos(phi) * Math.cos(dec) * Math.cos(H)
  )
  return Math.round(alt * (180 / Math.PI) * 100) / 100
}

export function getConditionFromCloud(cloud: number): string {
  if (cloud < 20) return 'Clear'
  if (cloud < 60) return 'Partly Cloudy'
  if (cloud < 85) return 'Cloudy'
  return 'Overcast'
}

export function getConditionIcon(condition: string): string {
  const icons: Record<string, string> = {
    'Clear': '🌙', 'Partly Cloudy': '⛅', 'Cloudy': '☁️', 'Overcast': '🌥️',
  }
  return icons[condition] || '🌙'
}

export function formatDayLabel(dateStr: string, isToday: boolean): string {
  if (isToday) return 'วันนี้'
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })
}