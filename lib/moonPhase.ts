export function getMoonPhase(date: Date) {
  const known = new Date('2000-01-06')
  const diff  = (date.getTime() - known.getTime()) / (1000 * 60 * 60 * 24)
  const phase = ((diff % 29.53) + 29.53) % 29.53
  const illumination = Math.round(Math.pow(Math.sin((phase / 29.53) * Math.PI), 2) * 100)

  let phaseName = ''
  let emoji     = ''
  if      (phase < 1.85)  { phaseName = 'New Moon';        emoji = '🌑' }
  else if (phase < 7.38)  { phaseName = 'Waxing Crescent'; emoji = '🌒' }
  else if (phase < 9.22)  { phaseName = 'First Quarter';   emoji = '🌓' }
  else if (phase < 14.76) { phaseName = 'Waxing Gibbous';  emoji = '🌔' }
  else if (phase < 16.61) { phaseName = 'Full Moon';       emoji = '🌕' }
  else if (phase < 22.15) { phaseName = 'Waning Gibbous';  emoji = '🌖' }
  else if (phase < 23.99) { phaseName = 'Last Quarter';    emoji = '🌗' }
  else                    { phaseName = 'Waning Crescent'; emoji = '🌘' }

  return { phase: phaseName, emoji, illumination }
}

export function getSunPosition(sunrise: string, sunset: string): number {
  const now     = new Date()
  const rise    = new Date(sunrise)
  const set     = new Date(sunset)
  const total   = set.getTime() - rise.getTime()
  const elapsed = now.getTime() - rise.getTime()
  return Math.max(0, Math.min(100, (elapsed / total) * 100))
}

export function getSunAltitude(sunrise: string, sunset: string): number {
  const pos = getSunPosition(sunrise, sunset)
  return Math.sin((pos / 100) * Math.PI) * 90
}

export function getConditionFromCloud(cloud: number): string {
  if (cloud < 20) return 'Clear'
  if (cloud < 60) return 'Partly Cloudy'
  if (cloud < 85) return 'Cloudy'
  return 'Overcast'
}

export function getConditionIcon(condition: string): string {
  const icons: Record<string, string> = {
    'Clear':         '🌙',
    'Partly Cloudy': '⛅',
    'Cloudy':        '☁️',
    'Overcast':      '🌥️',
  }
  return icons[condition] || '🌙'
}

export function formatDayLabel(dateStr: string, isToday: boolean): string {
  if (isToday) return 'วันนี้'
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })
}
