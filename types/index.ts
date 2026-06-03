export type Observatory = {
  observatory_id: string
  name:           string
  timestamp:      string
  collected_at?:  string
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
  narit_image_url?:      string
  narit_sky_status?:     string
  narit_score_clear?:    number
  narit_score_cloudy?:   number
  narit_score_partly?:   number
  narit_score_rain?:     number
  narit_cloud_percent?:  number
  dew_point?:            number
  solar_rad?:            number
  daily_rain?:           number

  // CNN prediction
  cnn_prediction?:          string
  cnn_confidence?:          number
  cnn_score_clear?:         number
  cnn_score_partly_cloudy?: number
  cnn_score_cloudy?:        number
  cnn_score_rain?:          number
  cnn_updated_at?:          string

  // Star Count (OpenCV)
  star_count?:      number
  star_updated_at?: string

  // FastSAM
  pixel_cloud_percent?: number

  // AI Fusion (LiteLLM)
  ai_trend?:      string
  ai_prediction?: string
  ai_updated_at?: string
}

export type SunMoonData = {
  sunrise:      string
  sunset:       string
  sunriseISO:   string
  sunsetISO:    string
  moonPhase:    string
  moonEmoji:    string
  illumination: number
  sunAltitude:  number
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