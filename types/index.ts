// กำหนดหน้าตาของข้อมูลทั้งหมดในโปรเจกต์


// ข้อมูลหอดูดาว 1 แห่ง
export type Observatory = {
  observatory_id: string    // รหัสย่อ เช่น "TNO"
  name:           string    // ชื่อเต็ม
  timestamp:      string    // เวลาที่บันทึก
  temperature:    number    // อุณหภูมิ °C
  humidity:       number    // ความชื้น %
  wind_speed:     number    // ความเร็วลม m/s
  wind_direction: string    // ทิศทางลม เช่น "NE"
  pressure:       number    // ความดันอากาศ hPa
  rain_rate:      number    // ปริมาณฝน mm
  cloud_cover:    number    // ความหนาแน่นเมฆ %
  uv_index:       number    // ค่า UV
  condition:      string    // สภาพอากาศ เช่น "Clear"
  seeing_dimm:    number | null  // ค่า Seeing (อาจไม่มี)
}

// ผลลัพธ์จาก AI
export type AIDetail = {
  id:     string                          // รหัสหอ
  status: 'ready' | 'not_ready' | 'partial'  // สถานะ
  reason: string                          // เหตุผล
}

export type AIResponse = {
  answer:               string     // คำตอบจาก AI
  ready_observatories:  string[]   // หอที่พร้อม
  filter:               boolean    // กรองหน้าเว็บไหม
  details:              AIDetail[] // รายละเอียดแต่ละหอ
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
  sunrise:      string
  sunset:       string
  moonPhase:    string
  moonEmoji:    string
  illumination: number
  sunAltitude:  number
}
