export type Observatory = {
  observatory_id: string
  name:           string
  timestamp:      string
  temperature:    number
  humidity:       number
  wind_speed:     number
  wind_direction: string
  pressure:       number
  rain_rate:      number
  cloud_cover:    number
  uv_index:       number
  condition:      string
  seeing_dimm:    number | null
  score?:         number

  // รูปจาก NARIT
  narit_image_url?:    string 
  narit_sky_status?:   string
  narit_score_clear?:  number
  narit_score_cloudy?: number
  narit_score_partly?: number
  narit_score_rain?:   number
  dew_point?:          number
  solar_rad?:          number
  daily_rain?:         number
}

export type AIDetail = {
  id:     string
  status: 'ready' | 'not_ready' | 'partial'
  reason: string
}

export type AIResponse = {
  answer:               string
  ready_observatories:  string[]
  filter:               boolean
  details:              AIDetail[]
}

export type ChartData = {
  times:       string[]
  temperature: number[]
  humidity:    number[]
  wind_speed:  number[]
  pressure:    number[]
  rain:        number[]
  uv:          number[]
}

export type DayData = {
  date:          string
  dayLabel:      string
  isToday:       boolean
  isPast:        boolean
  tempMax:       number
  tempMin:       number
  humidity:      number
  windSpeed:     number
  rainSum:       number
  cloudCover:    number
  condition:     string
  conditionIcon: string
}

export type SunMoonData = {
  sunrise:      string   // formatted สำหรับ display (th-TH HH:mm)
  sunset:       string   // formatted สำหรับ display (th-TH HH:mm)
  sunriseISO:   string   // ← เพิ่ม: ISO string สำหรับ getSunPosition / getSunAltitude
  sunsetISO:    string   // ← เพิ่ม: ISO string สำหรับ getSunPosition / getSunAltitude
  moonPhase:    string
  moonEmoji:    string
  illumination: number
  sunAltitude:  number
  moonAltitude?: number
  moonrise?:    string
  moonset?:     string
}