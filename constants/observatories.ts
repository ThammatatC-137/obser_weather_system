
// ข้อมูลหอดูดาวทั้งหมด


// ลำดับการแสดงบนหน้าแรก
export const OBSERVATORY_ORDER = [
  'TNO', 'APK', 'CCO', 'SKA', 'KKN', 'GAO', 'SPB', 'SRO', 'PR8'
]

// พิกัดแต่ละหอ สำหรับดึงข้อมูลอากาศ
export const OBS_COORDS: Record<string, {
  lat:  number
  lon:  number
  name: string
  country: string
}> = {
    TNO: { lat: 18.57,  lon: 98.48,   name: 'Thai National Observatory',   country: 'Thailand' },
  APK: { lat: 14.87,  lon: 102.01,  name: 'Astro Park Observatory',      country: 'Thailand'   },
  CCO: { lat: 13.72,  lon: 101.08,  name: 'Chachoengsao Observatory',    country: 'Thailand'   },
  SKA: { lat: 7.16,   lon: 100.61,  name: 'Songkhla Observatory',        country: 'Thailand'   },
  KKN: { lat: 16.43,  lon: 102.82,  name: 'KhonKaen Observatory',        country: 'Thailand'   },
  GAO: { lat: 26.70,  lon: 100.03,  name: 'Gao Mei Gu Observatory',      country: 'China'      },
  SPB: { lat: -28.22, lon: 153.28,  name: 'Springbrook Observatory',     country: 'Australia'  },
  SRO: { lat: 36.97,  lon: -119.40, name: 'Sierra Remote Observatories', country: 'USA'        },
  PR8: { lat: -30.16, lon: -70.80,  name: 'PROMPT-8',                    country: 'Chile'      },
}


// สีธีมหลัก
export const COLORS = {
  teal: '#4fd1c5',
  bg:   '#060810',
  tealDim:'#2a6b66',
  card: '#0d1219',
  mid:  '#07090e',
}

export const CONDITION_ICON: Record<string, string> = {
  'Clear':         '🌙',
  'Partly Cloudy': '⛅',
  'Cloudy':        '☁️',
  'Overcast':      '🌥️',
}

// Auto Refresh
export const REFRESH_INTERVAL = 50 * 60 * 1000