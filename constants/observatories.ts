// ===== Deep Space Dark Theme =====
export const COLORS = {
  // Backgrounds
  bg:     '#040812',   // ดำสุด base
  bg2:    '#080f1e',   // layer 2
  card:   '#0d1829',   // card bg
  cardHover: '#121f36', // card hover

  // Accent Purple
  accent:  '#6C63FF',  // primary CTA
  accent2: '#9D94FF',  // secondary
  accent3: '#C5BFFF',  // light labels

  // Teal
  teal:    '#06D6A0',  // success / score
  teal2:   '#2EFFCE',  // highlight
  tealDim: '#054a3a',  // dim teal

  // Gold
  gold:    '#FFD166',  // best / achievement
  gold2:   '#FFA500',  // warning

  // Text
  text:    '#EAF4FF',  // primary
  text2:   '#8AAAC8',  // secondary
  text3:   '#4A6A8A',  // muted

  // Status
  good:    '#06D6A0',  // score >= 70
  fair:    '#FFD166',  // score 40-69
  poor:    '#FF6B6B',  // score < 40

  // Legacy (compat)
  mid:     '#07090e',
}

export const OBSERVATORIES = [
  { id: 'TNO', name: 'Thai National Observatory',   country: '🇹🇭', lat: 18.57,  lon: 98.48   },
  { id: 'APK', name: 'Astro Park Observatory',      country: '🇹🇭', lat: 18.85,  lon: 98.96   },
  { id: 'CCO', name: 'Chachoengsao Observatory',    country: '🇹🇭', lat: 13.59,  lon: 101.26  },
  { id: 'SKA', name: 'Songkhla Observatory',         country: '🇹🇭', lat: 7.16,   lon: 100.61  },
  { id: 'KKN', name: 'KhonKaen Observatory',         country: '🇹🇭', lat: 16.76,  lon: 102.62  },
  { id: 'GAO', name: 'Gao Mei Gu Observatory',       country: '🇨🇳', lat: 26.70,  lon: 100.03  },
  { id: 'SPB', name: 'Springbrook Observatory',      country: '🇦🇺', lat: -28.22, lon: 153.28  },
  { id: 'SRO', name: 'Sierra Remote Observatories',  country: '🇺🇸', lat: 36.97,  lon: -119.40 },
  { id: 'PR8', name: 'PROMPT-8',                     country: '🇨🇱', lat: -30.16, lon: -70.80  },
]

export const OBS_COORDS = OBSERVATORIES.reduce((acc, o) => {
  acc[o.id] = { lat: o.lat, lon: o.lon, country: o.country }
  return acc
}, {} as Record<string, { lat: number; lon: number; country: string }>)

export const CONDITION_ICON: Record<string, string> = {
  'Clear':         '🌙',
  'Partly Cloudy': '⛅',
  'Cloudy':        '☁️',
  'Overcast':      '🌥️',
}

export const REFRESH_INTERVAL = 1 * 60 * 1000

export function scoreColor(score: number): string {
  if (score >= 70) return COLORS.good
  if (score >= 40) return COLORS.fair
  return COLORS.poor
}

export const OBSERVATORY_ORDER = ['TNO','APK','CCO','SKA','KKN','GAO','SPB','SRO','PR8']

export const OBS_TIMEZONE: Record<string, string> = {
  TNO: 'Asia/Bangkok',
  APK: 'Asia/Bangkok',
  CCO: 'Asia/Bangkok',
  SKA: 'Asia/Bangkok',
  KKN: 'Asia/Bangkok',
  GAO: 'Asia/Shanghai',
  SPB: 'Australia/Brisbane',
  SRO: 'America/Los_Angeles',
  PR8: 'America/Santiago',
}
