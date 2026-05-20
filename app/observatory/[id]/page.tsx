'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Sidebar      from '@/components/Sidebar'
import { Observatory, SunMoonData, DayData } from '@/types'
import { COLORS, OBS_COORDS, REFRESH_INTERVAL } from '@/constants/observatories'
import { getSkyPhoto } from '@/lib/skyPhoto'
import { getMoonPhase, getSunPosition, getSunAltitude } from '@/lib/moonPhase'
import { DayCard }    from '@/components/DayCard'
import { SparkChart } from '@/components/SparkChart'
import ObsAiChat from '@/components/ObsAiChat'
import { formatDayLabel } from '@/lib/moonPhase'

// ดูขนาดหน้าจอแบบ real-time
function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

// icon แต่ละหอดูดาว
function IconMountain({ color = '#06D6A0' }: { color?: string }) {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M3 18L8 8L12 14L15 10L21 18H3Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none"/></svg>
}
function IconHome({ color = '#06D6A0' }: { color?: string }) {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M3 12L12 4L21 12V20H15V15H9V20H3V12Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none"/></svg>
}
function IconCompass({ color = '#06D6A0' }: { color?: string }) {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none"/><path d="M12 8L14 12L12 16L10 12L12 8Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none"/></svg>
}
function IconGlobe({ color = '#06D6A0' }: { color?: string }) {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none"/><path d="M12 3C12 3 8 7 8 12C8 17 12 21 12 21" stroke={color} strokeWidth="1.5" fill="none"/><path d="M12 3C12 3 16 7 16 12C16 17 12 21 12 21" stroke={color} strokeWidth="1.5" fill="none"/><line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="1.5"/></svg>
}

const OBS_ICONS: Record<string, React.FC<{color?: string}>> = {
  TNO: IconMountain, APK: IconHome, CCO: IconCompass, SKA: IconCompass,
  KKN: IconCompass,  GAO: IconGlobe, SPB: IconGlobe, SRO: IconGlobe, PR8: IconGlobe,
}

// icon ค่าสภาพอากาศ
function IconHumid()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3C12 3 5 10 5 15C5 18.87 8.13 22 12 22C15.87 22 19 18.87 19 15C19 10 12 3 12 3Z" stroke="#06D6A0" strokeWidth="1.5" fill="none"/></svg> }
function IconDewpoint() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L12 16M8 12L12 16L16 12" stroke="#8AAAC8" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="19" r="3" stroke="#8AAAC8" strokeWidth="1.5" fill="none"/></svg> }
function IconSeeing()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#8AAAC8" strokeWidth="1.5" fill="none"/><path d="M2 12C2 12 6 5 12 5C18 5 22 12 22 12C22 12 18 19 12 19C6 19 2 12 2 12Z" stroke="#8AAAC8" strokeWidth="1.5" fill="none"/></svg> }
function IconWind()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 8H17C18.66 8 20 6.66 20 5C20 3.34 18.66 2 17 2C15.34 2 14 3.34 14 5" stroke="#06D6A0" strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M3 12H20C21.66 12 23 13.34 23 15C23 16.66 21.66 18 20 18C18.34 18 17 16.66 17 15" stroke="#06D6A0" strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M3 16H13C14.66 16 16 17.34 16 19C16 20.66 14.66 22 13 22C11.34 22 10 20.66 10 19" stroke="#06D6A0" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg> }
function IconDir()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#8AAAC8" strokeWidth="1.5" fill="none"/><path d="M12 7L14.5 14.5L12 13L9.5 14.5L12 7Z" stroke="#8AAAC8" strokeWidth="1.5" strokeLinejoin="round" fill="none"/></svg> }
function IconRain()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 16L4 20M10 16L8 20M14 16L12 20M18 16L16 20" stroke="#8AAAC8" strokeWidth="1.5" strokeLinecap="round"/><path d="M5 14C3.34 14 2 12.66 2 11C2 9.34 3.34 8 5 8C5.26 8 5.5 8.04 5.74 8.1C6.35 5.76 8.48 4 11 4C13.76 4 16 6.24 16 9H17C18.66 9 20 10.34 20 12C20 13.66 18.66 15 17 15H5V14Z" stroke="#8AAAC8" strokeWidth="1.5" fill="none"/></svg> }
function IconPressure() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#8AAAC8" strokeWidth="1.5" fill="none"/><path d="M12 8V12L15 14" stroke="#8AAAC8" strokeWidth="1.5" strokeLinecap="round"/></svg> }
function IconUV()       { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="#FFD166" strokeWidth="1.5" fill="none"/><path d="M12 2V4M12 20V22M2 12H4M20 12H22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M19.07 4.93L17.66 6.34M6.34 17.66L4.93 19.07" stroke="#FFD166" strokeWidth="1.5" strokeLinecap="round"/></svg> }

// style การ์ดปกติ
const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
}

// style การ์ดที่ hover ได้
const hoverCardStyle = (hov: boolean): React.CSSProperties => ({
  background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)',
  border: `1px solid ${hov ? 'rgba(6,214,160,0.2)' : 'rgba(255,255,255,0.06)'}`,
  borderRadius: '12px',
  boxShadow: hov
    ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(6,214,160,0.12)'
    : '0 4px 20px rgba(0,0,0,0.4)',
  transform: hov ? 'translateY(-3px)' : 'translateY(0)',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
  cursor: 'default',
})

// กล่องค่าสภาพอากาศแต่ละตัว
function StatRow({ Icon, label, value, color = '#8AAAC8', isMobile }: {
  Icon: React.FC; label: string; value: string; color?: string; isMobile?: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ ...hoverCardStyle(hov), display: 'flex', alignItems: 'flex-start', padding: isMobile ? '12px 14px' : '16px 20px', gap: '8px' }}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}><Icon /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: isMobile ? '28px' : '40px', fontWeight: 300, color, marginTop: '2px', letterSpacing: '-0.01em' }}>{value}</div>
      </div>
    </div>
  )
}

// กล่อง Sun & Moon
function SunMoonCard({ children }: { children: React.ReactNode }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ ...hoverCardStyle(hov), padding: '16px 20px', flex: 1 }}
    >
      {children}
    </div>
  )
}

// แปลง condition เป็น emoji
function condIcon(c: string) {
  if (c === 'Clear')         return '☀️'
  if (c === 'Partly Cloudy') return '⛅'
  if (c === 'Cloudy')        return '☁️'
  return '🌧️'
}

// type ค่าเฉลี่ยย้อนหลัง
type HistoryAvg = {
  temperature: number | null; humidity: number | null; wind_speed: number | null
  wind_direction: string; pressure: number | null; rain_rate: number | null
  dew_point: number | null; uv_index: number | null; seeing_dimm: number | null
}

// type ข้อมูลกราฟ
type ChartData = {
  times: string[]; temperature: number[]; humidity: number[]
  wind_speed: number[]; pressure: number[]; rain_rate: number[]
  uv_index: number[]; seeing_dimm: number[]; dew_point: number[]
}

export default function ObservatoryDetail() {
  const router  = useRouter()
  const params  = useParams()
  const id      = params?.id as string
  const width   = useWindowWidth()

  // breakpoint มือถือ / แท็บเล็ต / คอม
  const isMobile  = width < 640
  const isTablet  = width >= 640 && width < 1024
  const isDesktop = width >= 1024

  const [obs,            setObs]            = useState<Observatory | null>(null)
  const [sunMoon,        setSunMoon]        = useState<SunMoonData | null>(null)
  const [forecast,       setForecast]       = useState<DayData[]>([])
  const [loading,        setLoading]        = useState(true)
  const [lastUpdate,     setLastUpdate]     = useState('')
  const [sunPos,         setSunPos]         = useState(50)
  const [selectedDate,   setSelectedDate]   = useState<string | null>(null)
  const [historyData,    setHistoryData]    = useState<HistoryAvg | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [chartData,      setChartData]      = useState<ChartData | null>(null)
  const [chartLoading,   setChartLoading]   = useState(false)
  const [sunHov,         setSunHov]         = useState(false)

  // ดึงข้อมูลสภาพอากาศปัจจุบัน
  const fetchRealtime = useCallback(async () => {
    try {
      const res  = await fetch(`/api/weather?t=${Date.now()}`)
      const json = await res.json()
      if (json.success) {
        setObs(json.data.find((d: Observatory) => d.observatory_id === id) || null)
        setLastUpdate(new Date().toLocaleTimeString('th-TH'))
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [id])

  // ดึงข้อมูลดวงอาทิตย์และดวงจันทร์
  const fetchSunMoon = useCallback(async () => {
    const coords = OBS_COORDS[id]
    if (!coords) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const res   = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
        `&daily=sunrise,sunset&timezone=auto&start_date=${today}&end_date=${today}`
      )
      const data  = await res.json()
      const sr    = data.daily?.sunrise?.[0]
      const ss    = data.daily?.sunset?.[0]
      const moon  = getMoonPhase(new Date())
      setSunMoon({
        sunrise:      new Date(sr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        sunset:       new Date(ss).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        sunriseISO:   sr,
        sunsetISO:    ss,
        moonPhase:    moon.phase,
        moonEmoji:    moon.emoji,
        illumination: moon.illumination,
        sunAltitude:  getSunAltitude(sr, ss, coords.lat, coords.lon),
      })
    } catch (e) { console.error(e) }
  }, [id])

  // ดึงพยากรณ์อากาศ 15 วัน
  const fetchForecast = useCallback(async () => {
    try {
      const res  = await fetch(`/api/forecast?id=${id}`)
      const json = await res.json()
      if (json.success) {
        const today = new Date().toISOString().split('T')[0]
        const days: DayData[] = json.data.map((d: any) => ({
          date: d.date, dayLabel: formatDayLabel(d.date, d.date === today),
          isToday: d.date === today, isPast: d.date < today,
          tempMax: d.temp_max ?? 0, tempMin: d.temp_min ?? 0,
          humidity: d.humidity ?? 0, windSpeed: d.wind_max ?? 0,
          rainSum: d.rain ?? 0, cloudCover: d.cloud_cover ?? 0,
          condition: d.condition ?? 'Clear', conditionIcon: condIcon(d.condition ?? 'Clear'),
        }))
        setForecast(days)
      }
    } catch (e) { console.error(e) }
  }, [id])

  // ดึงกราฟ 24 ชั่วโมงล่าสุด (realtime)
  const fetchRealtimeChart = useCallback(async () => {
    setChartLoading(true)
    try {
      const res  = await fetch(`/api/history?id=${id}`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setChartData({
          times:       json.data.map((r: any) => r.timestamp),
          temperature: json.data.map((r: any) => r.temperature ?? null),
          humidity:    json.data.map((r: any) => r.humidity    ?? null),
          wind_speed:  json.data.map((r: any) => r.wind_speed  ?? null),
          pressure:    json.data.map((r: any) => r.pressure    ?? null),
          rain_rate:   json.data.map((r: any) => r.rain_rate   ?? null),
          uv_index:    json.data.map((r: any) => r.uv_index    ?? null),
          seeing_dimm: json.data.map((r: any) => r.seeing_dimm ?? null),
          dew_point:   json.data.map((r: any) => r.dew_point   ?? null),
        })
      } else { setChartData(null) }
    } catch (e) { console.error(e) }
    finally { setChartLoading(false) }
  }, [id])

  // ดึงกราฟของวันที่เลือก (อดีต = MongoDB, อนาคต = Open-Meteo)
  const fetchChartForDate = useCallback(async (date: string) => {
    setChartLoading(true)
    const today = new Date().toISOString().split('T')[0]
    try {
      if (date >= today) {
        const coords = OBS_COORDS[id]
        if (!coords) { setChartData(null); return }
        const res  = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
          `&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,wind_speed_10m,surface_pressure,precipitation,uv_index` +
          `&wind_speed_unit=ms&timezone=auto&start_date=${date}&end_date=${date}`
        )
        const data = await res.json()
        const h    = data.hourly
        if (h) {
          setChartData({
            times: h.time, temperature: h.temperature_2m,
            humidity: h.relative_humidity_2m, dew_point: h.dew_point_2m,
            wind_speed: h.wind_speed_10m, pressure: h.surface_pressure,
            rain_rate: h.precipitation, uv_index: h.uv_index,
            seeing_dimm: h.time.map(() => null),
          })
        } else { setChartData(null) }
      } else {
        const res  = await fetch(`/api/history?id=${id}&date=${date}&mode=chart`)
        const json = await res.json()
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setChartData({
            times:       json.data.map((r: any) => r.timestamp),
            temperature: json.data.map((r: any) => r.temperature ?? null),
            humidity:    json.data.map((r: any) => r.humidity    ?? null),
            dew_point:   json.data.map((r: any) => r.dew_point   ?? null),
            wind_speed:  json.data.map((r: any) => r.wind_speed  ?? null),
            pressure:    json.data.map((r: any) => r.pressure    ?? null),
            rain_rate:   json.data.map((r: any) => r.rain_rate   ?? null),
            uv_index:    json.data.map((r: any) => r.uv_index    ?? null),
            seeing_dimm: json.data.map((r: any) => r.seeing_dimm ?? null),
          })
        } else { setChartData(null) }
      }
    } catch (e) { console.error(e); setChartData(null) }
    finally { setChartLoading(false) }
  }, [id])

  // ดึงค่าเฉลี่ยวันอดีต ถ้าไม่มีใน history ให้คำนวณจาก chart data แทน
  const fetchHistory = useCallback(async (date: string) => {
    setHistoryLoading(true)
    try {
      const res  = await fetch(`/api/history?id=${id}&date=${date}`)
      const json = await res.json()
      if (json.success && json.data) {
        setHistoryData(json.data)
      } else {
        const res2  = await fetch(`/api/history?id=${id}&date=${date}&mode=chart`)
        const json2 = await res2.json()
        if (json2.success && Array.isArray(json2.data) && json2.data.length > 0) {
          const records = json2.data
          const avg = (key: string): number | null => {
            const vals = records.map((r: any) => r[key]).filter((v: any) => v != null && !isNaN(v))
            return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null
          }
          const dirs    = records.map((r: any) => r.wind_direction).filter(Boolean)
          const mostDir = dirs.length
            ? dirs.sort((a: string, b: string) =>
                dirs.filter((v: string) => v === b).length - dirs.filter((v: string) => v === a).length
              )[0] : '--'
          setHistoryData({
            temperature: avg('temperature'), humidity: avg('humidity'),
            wind_speed: avg('wind_speed'), wind_direction: mostDir,
            pressure: avg('pressure'), rain_rate: avg('rain_rate'),
            dew_point: avg('dew_point'), uv_index: avg('uv_index'),
            seeing_dimm: avg('seeing_dimm'),
          })
        } else { setHistoryData(null) }
      }
    } catch (e) { console.error(e); setHistoryData(null) }
    finally { setHistoryLoading(false) }
  }, [id])

  // กดเปลี่ยนวัน
  const handleDayClick = (date: string) => {
    const today = new Date().toISOString().split('T')[0]
    if (date === today) { setSelectedDate(null); setHistoryData(null); fetchRealtimeChart(); return }
    if (date === selectedDate) { setSelectedDate(null); setHistoryData(null); fetchRealtimeChart(); return }
    setSelectedDate(date)
    if (date < today) { fetchHistory(date); fetchChartForDate(date) }
    else { setHistoryData(null); fetchChartForDate(date) }
  }

  useEffect(() => {
    fetchRealtime(); fetchSunMoon(); fetchForecast(); fetchRealtimeChart()
    const t = setInterval(fetchRealtime, REFRESH_INTERVAL)
    return () => clearInterval(t)
  }, [fetchRealtime, fetchSunMoon, fetchForecast, fetchRealtimeChart])

  // อัปเดตตำแหน่งดวงอาทิตย์บน arc ทุก 1 นาที
  useEffect(() => {
    if (!sunMoon?.sunriseISO || !sunMoon?.sunsetISO) return
    const update = () => setSunPos(getSunPosition(sunMoon.sunriseISO, sunMoon.sunsetISO))
    update()
    const t = setInterval(update, 60000)
    return () => clearInterval(t)
  }, [sunMoon])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: COLORS.teal, fontSize: '13px', letterSpacing: '0.1em' }}>LOADING...</div>
    </div>
  )
  if (!obs) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <p style={{ color: COLORS.teal }}>Observatory not found</p>
      <button onClick={() => router.push('/')} style={{ padding: '10px 24px', background: 'transparent', border: `1px solid ${COLORS.teal}`, borderRadius: '8px', color: COLORS.teal, cursor: 'pointer' }}>← Back</button>
    </div>
  )

  const skyPhoto  = getSkyPhoto(obs.condition, obs.timestamp, obs.narit_image_url)
  const heroIcon  = obs.condition === 'Clear' ? '☀️' : obs.condition === 'Partly Cloudy' ? '⛅' : obs.condition === 'Overcast' ? '🌥️' : '☁️'
  const ObsIcon   = OBS_ICONS[id] || IconGlobe
  const today     = new Date().toISOString().split('T')[0]

  const isViewingFuture  = selectedDate && selectedDate > today
  const selectedForecast = isViewingFuture ? forecast.find(d => d.date === selectedDate) : null
  const isViewingHistory = selectedDate && selectedDate < today
  const hasHistoryData   = isViewingHistory && historyData
  const histForecast     = isViewingHistory ? forecast.find(d => d.date === selectedDate) : null

  const heroTemp = isViewingFuture && selectedForecast ? selectedForecast.tempMax
    : isViewingHistory && histForecast ? histForecast.tempMax : obs.temperature
  const heroConditionIcon = isViewingFuture && selectedForecast ? selectedForecast.conditionIcon
    : isViewingHistory && histForecast ? histForecast.conditionIcon : heroIcon
  const heroConditionText = isViewingFuture && selectedForecast ? selectedForecast.condition
    : isViewingHistory && histForecast ? histForecast.condition : obs.condition

  const displayHumidity = hasHistoryData ? historyData!.humidity?.toFixed(0)
    : isViewingFuture && selectedForecast ? selectedForecast.humidity.toFixed(0) : obs.humidity?.toString()
  const displayDewpoint = hasHistoryData ? historyData!.dew_point?.toFixed(1) : obs.dew_point?.toFixed(1) ?? '--'
  const displaySeeing   = hasHistoryData
    ? (historyData!.seeing_dimm ? `${historyData!.seeing_dimm?.toFixed(2)}"` : '--')
    : (obs.seeing_dimm ? `${obs.seeing_dimm}"` : '--')
  const displayWind     = hasHistoryData ? historyData!.wind_speed?.toFixed(2)
    : isViewingFuture && selectedForecast ? selectedForecast.windSpeed.toFixed(2) : obs.wind_speed?.toString()
  const displayDir      = hasHistoryData ? historyData!.wind_direction : obs.wind_direction
  const displayRain     = hasHistoryData ? historyData!.rain_rate?.toFixed(1)
    : isViewingFuture && selectedForecast ? selectedForecast.rainSum.toFixed(1) : obs.rain_rate?.toString()
  const displayPressure = hasHistoryData ? historyData!.pressure?.toFixed(1) : obs.pressure?.toFixed(1)
  const displayUV       = hasHistoryData ? historyData!.uv_index?.toFixed(0) : obs.uv_index?.toFixed(0)

  const statusLabel = historyLoading ? 'Loading...'
    : isViewingHistory ? `ค่าเฉลี่ย ${selectedDate}`
    : isViewingFuture  ? `พยากรณ์ ${selectedDate}` : selectedDate ?? ''
  const chartTitle = selectedDate ? `กราฟ 24hr — ${selectedDate}` : '24hr ย้อนหลัง (Realtime)'

  const p  = (isNaN(sunPos) ? 0 : sunPos) / 100
  const cx = p * 320
  const cy = (1 - p) * (1 - p) * 90 + 2 * (1 - p) * p * 0 + p * p * 90
  const isDaytime = sunMoon && sunMoon.sunAltitude > 0

  const px = isMobile ? '16px' : isTablet ? '20px' : '32px'

  // กล่อง Stats 8 ตัว
  const StatsSection = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '10px' : '18px' }}>
      <StatRow Icon={IconHumid}    label="Humidity"  value={displayHumidity  ? `${displayHumidity}%`  : '--'} color={COLORS.teal} isMobile={isMobile} />
      <StatRow Icon={IconDewpoint} label="Dewpoint"  value={displayDewpoint  ? `${displayDewpoint}°C` : '--'} color="#8AAAC8"     isMobile={isMobile} />
      <StatRow Icon={IconSeeing}   label="Seeing"    value={displaySeeing    ?? '--'}                          color="#8AAAC8"     isMobile={isMobile} />
      <StatRow Icon={IconWind}     label="Wind"      value={displayWind      ? `${displayWind} m/s`   : '--'} color={COLORS.teal} isMobile={isMobile} />
      <StatRow Icon={IconDir}      label="Direction" value={displayDir       ?? '--'}                          color="#8AAAC8"     isMobile={isMobile} />
      <StatRow Icon={IconRain}     label="Rain Rate" value={displayRain      ?? '--'}                          color="#8AAAC8"     isMobile={isMobile} />
      <StatRow Icon={IconPressure} label="Pressure"  value={displayPressure  ?? '--'}                          color="#8AAAC8"     isMobile={isMobile} />
      <StatRow Icon={IconUV}       label="UV Index"  value={displayUV        ?? '--'}                          color={COLORS.gold} isMobile={isMobile} />
    </div>
  )

  // กล่อง Sun & Moon ลดขนาดตามจอ ไม่ scroll
  const SunMoonSection = () => (
    <SunMoonCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div style={{ fontSize: isMobile ? '10px' : '13px', color: 'rgba(6,214,160,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Sun & Moon</div>
        {sunMoon && <div style={{ fontSize: isMobile ? '10px' : '12px', color: 'rgba(255,255,255,0.5)' }}>Illumination : {sunMoon.illumination.toFixed(2)}%</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '4px' : '8px' }}>
        {sunMoon
          ? <div style={{ fontSize: isMobile ? '18px' : isTablet ? '20px' : '26px', fontWeight: 300, color: 'rgba(255,255,255,0.8)' }}>{sunMoon.sunAltitude.toFixed(2)}°</div>
          : <div />
        }
        {sunMoon && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: isMobile ? '10px' : '12px', color: 'rgba(255,255,255,0.5)' }}>{sunMoon.moonPhase}</div>
            <div style={{ fontSize: isMobile ? '16px' : '20px' }}>{sunMoon.moonEmoji}</div>
          </div>
        )}
      </div>

      
      <div style={{ position: 'relative' }}>
        <svg width="100%" height={isMobile ? '55' : isTablet ? '70' : '90'} viewBox="0 0 320 100">
          <line x1="0" y1="90" x2="320" y2="90" stroke="rgba(6,214,160,0.15)" strokeWidth="1" />
          <path d="M0 90 Q160 0 320 90" fill="none" stroke="rgba(6,214,160,0.12)" strokeWidth="1.5" strokeDasharray="4 4" />
          {isDaytime && (
            <>
              <defs><clipPath id="pastClip2"><rect x="0" y="0" width={cx} height="100" /></clipPath></defs>
              <path d="M0 90 Q160 0 320 90" fill="none" stroke="rgba(6,214,160,0.55)" strokeWidth="2" strokeDasharray="4 4" clipPath="url(#pastClip2)" />
              {/* area fill โค้งตาม arc จริงๆ ไม่เป็นสามเหลี่ยม */}
              <path d="M0 90 Q160 0 320 90 L320 90 L0 90 Z" fill="rgba(6,214,160,0.06)" clipPath="url(#pastClip2)" />
              <g onMouseEnter={() => setSunHov(true)} onMouseLeave={() => setSunHov(false)} style={{ cursor: 'pointer' }}>
                <circle cx={cx} cy={cy} r="16" fill="transparent" />
                <circle cx={cx} cy={cy} r="8" fill={COLORS.gold} style={{ filter: `drop-shadow(0 0 6px ${COLORS.gold})` }} />
              </g>
            </>
          )}
        </svg>

        {isDaytime && sunHov && (
          <div style={{
            position: 'absolute',
            top: '2px',
            left: `${(cx / 320) * 100}%`,
            transform: cx > 260 ? 'translateX(-100%)' : 'translateX(-50%)',
            background: 'rgba(15,26,46,0.95)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: '8px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}>
            {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '12px' : '15px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
        <span>{sunMoon?.sunrise || '--:--'}</span>
        <span>{sunMoon?.sunset  || '--:--'}</span>
      </div>
    </SunMoonCard>
  )

  return (
    <div style={{ background: '#000000', color: '#f1f5f9', display: 'flex' }}>
      <Sidebar activeId={id} />
      <main style={{ flex: 1, minWidth: 0 }}>

        {/* Hero — desktop = 2 คอลัมน์, mobile/tablet = ซ้อนแนวตั้ง */}
        {isDesktop ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 600px', height: '73vh', minHeight: '500px' }}>
            <HeroImage
              skyPhoto={skyPhoto} obs={obs} ObsIcon={ObsIcon}
              selectedDate={selectedDate} statusLabel={statusLabel}
              heroTemp={heroTemp} heroConditionIcon={heroConditionIcon} heroConditionText={heroConditionText}
              cardStyle={cardStyle} router={router} lastUpdate={lastUpdate}
              fetchRealtimeChart={fetchRealtimeChart} setSelectedDate={setSelectedDate} setHistoryData={setHistoryData}
            />
            <div style={{ background: '#000', borderLeft: '1px solid rgba(6,214,160,0.08)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
              <StatsSection />
              <SunMoonSection />
            </div>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', height: isMobile ? '45vh' : '55vh', overflow: 'hidden' }}>
              <img src={skyPhoto} alt={obs.condition}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(6,11,20,0.3) 0%, rgba(6,11,20,0.95) 100%)' }} />
              <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => router.push('/')} style={{ ...cardStyle, padding: '6px 12px', color: COLORS.teal, cursor: 'pointer', fontSize: '12px', border: '1px solid rgba(6,214,160,0.2)' }}>← Back</button>
                {lastUpdate && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Updated {lastUpdate}</span>}
              </div>
              <div style={{ position: 'absolute', bottom: '20px', left: '16px', right: '16px', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <ObsIcon color={COLORS.teal} />
                  <span style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 500, color: '#fff' }}>{obs.name}</span>
                </div>
                {selectedDate && <div style={{ fontSize: '13px', color: COLORS.teal, marginBottom: '6px' }}>{statusLabel}</div>}
                <div style={{ fontSize: isMobile ? '40px' : '52px', fontWeight: 200, color: '#fff', lineHeight: 1 }}>
                  {heroTemp != null ? <>{heroTemp.toFixed(1)}<span style={{ fontSize: '28px', opacity: 0.6 }}>°C</span></> : '--'}
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{heroConditionIcon}</span><span>{heroConditionText}</span>
                </div>
                {selectedDate && (
                  <button onClick={() => { setSelectedDate(null); setHistoryData(null); fetchRealtimeChart() }}
                    style={{ ...cardStyle, marginTop: '8px', padding: '5px 12px', color: COLORS.teal, cursor: 'pointer', fontSize: '11px', border: '1px solid rgba(6,214,160,0.2)' }}>
                     Back to Live
                  </button>
                )}
              </div>
            </div>
            <div style={{ padding: `16px ${px}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <StatsSection />
              <SunMoonSection />
            </div>
          </>
        )}

        {/* Forecast 15 วัน */}
        {forecast.length > 0 && (
          <div style={{ padding: `16px ${px} 8px` }}>
            <div style={{ fontSize: '11px', color: 'rgba(6,214,160,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '12px' }}>
              15-Day Forecast {selectedDate && <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>— {selectedDate}</span>}
            </div>
            {(() => {
              const past     = forecast.filter(d => d.isPast).slice(-7)
              const todayArr = forecast.filter(d => d.isToday)
              const upcoming = forecast.filter(d => !d.isPast && !d.isToday).slice(0, 7)
              const days     = [...past, ...todayArr, ...upcoming]
              return isDesktop ? (
                // desktop: scroll แนวนอน card เท่ากันทุกใบ
                <div style={{
                  display: 'flex', gap: '8px',
                  overflowX: 'auto', paddingBottom: '8px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(6,214,160,0.3) transparent',
                } as React.CSSProperties}>
                  {days.map(day => (
                    <div key={day.date} onClick={() => handleDayClick(day.date)}
                      style={{
                        cursor: 'pointer', flexShrink: 0,
                        width: `calc((100% - ${(days.length - 1) * 8}px) / ${days.length})`,
                        minWidth: '90px', maxWidth: '130px',
                        outline: selectedDate === day.date ? `2px solid ${COLORS.teal}` : 'none',
                        borderRadius: '12px',
                      }}>
                      <DayCard day={day.isToday && obs ? { ...day, tempMax: obs.temperature ?? day.tempMax } : day} />
                    </div>
                  ))}
                </div>
              ) : (
                // mobile/tablet: scroll snap ทีละ card
                <div style={{
                  display: 'flex', gap: '8px',
                  overflowX: 'auto', paddingBottom: '12px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(6,214,160,0.3) transparent',
                  WebkitOverflowScrolling: 'touch',
                  scrollSnapType: 'x mandatory',
                } as React.CSSProperties}>
                  {days.map(day => (
                    <div key={day.date} onClick={() => handleDayClick(day.date)}
                      style={{
                        cursor: 'pointer', flexShrink: 0,
                        width: isMobile ? '110px' : '130px',
                        scrollSnapAlign: 'start',
                        outline: selectedDate === day.date ? `2px solid ${COLORS.teal}` : 'none',
                        borderRadius: '12px',
                      }}>
                      <DayCard day={day.isToday && obs ? { ...day, tempMax: obs.temperature ?? day.tempMax } : day} />
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {/* กราฟ */}
        <div style={{ padding: `16px ${px} ${isMobile ? '80px' : '40px'}` }}>
          <div style={{ fontSize: '11px', color: 'rgba(6,214,160,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '16px' }}>
            {chartTitle}
          </div>
          {chartLoading ? (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>Loading charts...</div>
          ) : chartData && chartData.times.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : isTablet ? 'repeat(2, 1fr)' : '1fr',
              gap: '16px',
            }}>
              <SparkChart label="Seeing (DIMM)"  unit='"'    data={chartData.seeing_dimm}  times={chartData.times} />
              <SparkChart label="Humidity"       unit="%"    data={chartData.humidity}     times={chartData.times} />
              <SparkChart label="Temperature"    unit="°C"   data={chartData.temperature}  times={chartData.times}
                extraData={{ label: 'Dewpoint', data: chartData.dew_point, unit: '°C', color: '#8AAAC8' }} />
              <SparkChart label="Air Pressure"   unit=" hPa" data={chartData.pressure}     times={chartData.times} />
              <SparkChart label="Wind Speed"     unit=" m/s" data={chartData.wind_speed}   times={chartData.times} />
              <SparkChart label="Rain Rate"      unit=" mm"  data={chartData.rain_rate}    times={chartData.times} />
              <SparkChart label="UV Index"       unit=""     data={chartData.uv_index}     times={chartData.times} />
            </div>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>ไม่มีข้อมูลกราฟ</div>
          )}
        </div>
        {/* AI ผู้ช่วย */}
        <div style={{ padding: `0 ${px} ${isMobile ? '80px' : '40px'}` }}>
          <div style={{ fontSize: '11px', color: 'rgba(6,214,160,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '16px' }}>
            AI ผู้ช่วยหอดูดาว
          </div>
          <ObsAiChat obs={obs} />
        </div>

      </main>
    </div>
  )
}

// Hero รูปใหญ่ฝั่งซ้าย (desktop เท่านั้น)
function HeroImage({ skyPhoto, obs, ObsIcon, selectedDate, statusLabel, heroTemp, heroConditionIcon, heroConditionText, cardStyle, router, lastUpdate, fetchRealtimeChart, setSelectedDate, setHistoryData }: any) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <img src={skyPhoto} alt={obs.condition}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(6,11,20,0.7) 0%, rgba(6,11,20,0.2) 60%, transparent 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(6,11,20,0.95) 100%)' }} />
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}>
        {lastUpdate && <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)' }}>Updated {lastUpdate}</span>}
        <button onClick={() => router.push('/')} style={{ ...cardStyle, padding: '6px 14px', color: COLORS.teal, cursor: 'pointer', fontSize: '12px', border: '1px solid rgba(6,214,160,0.2)' }}>Back</button>
      </div>
      <div style={{ position: 'absolute', top: '28px', left: '28px', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <ObsIcon color={COLORS.teal} />
          <span style={{ fontSize: '32px', fontWeight: 500, color: '#fff' }}>{obs.name}</span>
        </div>
        <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>
          {selectedDate
            ? <span style={{ color: COLORS.teal }}>{statusLabel}</span>
            : new Date(obs.timestamp).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }
        </div>
        <div style={{ fontSize: '56px', fontWeight: 200, letterSpacing: '-0.04em', lineHeight: 1, color: '#fff' }}>
          {heroTemp != null ? <>{heroTemp.toFixed(1)}<span style={{ fontSize: '40px', opacity: 0.6 }}>°C</span></> : '--'}
        </div>
        <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{heroConditionIcon}</span><span>{heroConditionText}</span>
        </div>
        {selectedDate && (
          <button onClick={() => { setSelectedDate(null); setHistoryData(null); fetchRealtimeChart() }}
            style={{ ...cardStyle, marginTop: '12px', padding: '6px 14px', color: COLORS.teal, cursor: 'pointer', fontSize: '11px', border: '1px solid rgba(6,214,160,0.2)' }}>
            Back to Live
          </button>
        )}
      </div>
    </div>
    
  )
}