'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'

type DarkSpot = { name: string; lat: number; lon: number; country: string; dist?: number }

const DARK_SKY_SPOTS: DarkSpot[] = [
  // Thailand
  { name: 'ดอยอินทนนท์', lat: 18.5883, lon: 98.4868, country: 'ไทย' },
  { name: 'ดอยม่อนแจ่ม', lat: 18.8896, lon: 98.8665, country: 'ไทย' },
  { name: 'ดอยหลวงเชียงดาว', lat: 19.4062, lon: 98.9198, country: 'ไทย' },
  { name: 'เขาค้อ', lat: 16.7536, lon: 101.0382, country: 'ไทย' },
  { name: 'อุทยานแห่งชาติเขาใหญ่', lat: 14.4321, lon: 101.3695, country: 'ไทย' },
  { name: 'เขาสามร้อยยอด', lat: 12.1856, lon: 99.9539, country: 'ไทย' },
  { name: 'อุทยานแห่งชาติแก่งกระจาน', lat: 12.9386, lon: 99.5726, country: 'ไทย' },
  { name: 'ดอยสุเทพ เชียงใหม่', lat: 18.8048, lon: 98.9215, country: 'ไทย' },
  // East Asia
  { name: 'Noto Peninsula Dark Sky Park', lat: 37.2, lon: 137.2, country: 'Japan' },
  { name: 'Iriomote-Ishigaki National Park', lat: 24.35, lon: 124.1, country: 'Japan' },
  { name: 'Zhangye Danxia National Park', lat: 38.9, lon: 100.1, country: 'China' },
  { name: 'Jeju Island Dark Sky Park', lat: 33.38, lon: 126.55, country: 'South Korea' },
  // Southeast Asia
  { name: 'Gunung Mulu National Park', lat: 4.05, lon: 114.83, country: 'Malaysia' },
  { name: 'Bali Barat National Park', lat: -8.15, lon: 114.5, country: 'Indonesia' },
  { name: 'Con Dao National Park', lat: 8.68, lon: 106.6, country: 'Vietnam' },
  // South Asia
  { name: 'Rann of Kutch', lat: 23.73, lon: 70.2, country: 'India' },
  { name: 'Spiti Valley', lat: 32.25, lon: 78.05, country: 'India' },
  // Middle East
  { name: 'Wadi Rum Protected Area', lat: 29.57, lon: 35.42, country: 'Jordan' },
  { name: 'Hatta Mountain Reserve', lat: 24.82, lon: 56.12, country: 'UAE' },
  // Australia & Pacific
  { name: 'Warrumbungle National Park (IDA)', lat: -31.28, lon: 149.02, country: 'Australia' },
  { name: 'Uluru-Kata Tjuta National Park', lat: -25.34, lon: 131.03, country: 'Australia' },
  { name: 'Aoraki Mackenzie Dark Sky Reserve', lat: -43.75, lon: 170.1, country: 'New Zealand' },
  // Europe
  { name: 'Exmoor National Park (IDA)', lat: 51.14, lon: -3.73, country: 'UK' },
  { name: 'Kerry Dark Sky Reserve (Gold)', lat: 52.01, lon: -9.88, country: 'Ireland' },
  { name: 'Pic du Midi Observatory', lat: 42.94, lon: 0.14, country: 'France' },
  { name: 'NaturEft Dark Sky Park', lat: 50.12, lon: 6.28, country: 'Belgium' },
  { name: 'Teide National Park', lat: 28.27, lon: -16.64, country: 'Spain' },
  { name: 'Jasper National Park (IDA)', lat: 52.87, lon: -117.95, country: 'Canada' },
  // North America
  { name: 'Cherry Springs State Park (IDA Gold)', lat: 41.66, lon: -77.82, country: 'USA' },
  { name: 'Big Bend National Park', lat: 29.13, lon: -103.24, country: 'USA' },
  { name: 'Bryce Canyon National Park', lat: 37.59, lon: -112.19, country: 'USA' },
  { name: 'Natural Bridges National Monument (IDA)', lat: 37.6, lon: -110.0, country: 'USA' },
  { name: 'Death Valley National Park', lat: 36.23, lon: -116.82, country: 'USA' },
  // South America
  { name: 'Atacama Desert', lat: -24.5, lon: -70.0, country: 'Chile' },
  { name: 'Cerro Pachón Observatory', lat: -30.24, lon: -70.74, country: 'Chile' },
  { name: 'Elqui Valley Dark Sky Sanctuary', lat: -30.15, lon: -70.65, country: 'Chile' },
  // Africa
  { name: 'NamibRand Nature Reserve (IDA Gold)', lat: -24.82, lon: 15.96, country: 'Namibia' },
  { name: 'Karoo Highlands Dark Sky Reserve', lat: -32.35, lon: 22.65, country: 'South Africa' },
  { name: 'Sahara Desert (Merzouga)', lat: 31.08, lon: -4.01, country: 'Morocco' },
]

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2
  return R * 2 * Math.asin(Math.sqrt(a))
}
import { SparkChart } from '@/components/SparkChart'
import { DayCard } from '@/components/DayCard'
import { COLORS } from '@/constants/observatories'
import { getMoonPhase, getSunPosition, getSunAltitude, formatDayLabel } from '@/lib/moonPhase'

type WeatherNow = {
  temperature: number; humidity: number; dew_point: number
  wind_speed: number; wind_direction: string; pressure: number
  rain_rate: number; uv_index: number; cloud_cover: number; condition: string
}
type ForecastDay = {
  date: string; temp_max: number; temp_min: number
  rain: number; wind_max: number; humidity: number
  cloud_cover: number; uv_index: number; condition: string
}
type ChartData = {
  times: string[]; temperature: number[]; humidity: number[]
  dew_point: number[]; wind_speed: number[]; pressure: number[]
  rain_rate: number[]; uv_index: number[]
}
type SearchResult = {
  place_id: string; display_name: string; lat: string; lon: string
}

function condIcon(c: string) {
  if (c === 'Clear') return '☀️'
  if (c === 'Partly Cloudy') return '⛅'
  if (c === 'Cloudy') return '☁️'
  return '🌧️'
}
function getCondition(cloud: number) {
  if (cloud < 20) return 'Clear'
  if (cloud < 60) return 'Partly Cloudy'
  if (cloud < 85) return 'Cloudy'
  return 'Overcast'
}
function getWindDir(deg: number) {
  return ["N","NE","E","SE","S","SW","W","NW"][Math.round(deg / 45) % 8]
}

// hover style เหมือนกัน ใช้ร่วมกันได้เลย
const btnHover = (hov: boolean): React.CSSProperties => ({
  background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)',
  border: `1px solid ${hov ? 'rgba(6,214,160,0.2)' : 'rgba(255,255,255,0.06)'}`,
  borderRadius: '12px',
  boxShadow: hov ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(6,214,160,0.12)' : '0 4px 20px rgba(0,0,0,0.4)',
  transform: hov ? 'translateY(-2px)' : 'translateY(0)',
  transition: 'all 0.18s ease',
  cursor: 'pointer',
})

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const h = () => setWidth(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return width
}

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
}

const hoverCard = (hov: boolean): React.CSSProperties => ({
  background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)',
  border: `1px solid ${hov ? 'rgba(6,214,160,0.2)' : 'rgba(255,255,255,0.06)'}`,
  borderRadius: '12px',
  boxShadow: hov ? '0 8px 32px rgba(0,0,0,0.6)' : '0 4px 20px rgba(0,0,0,0.4)',
  transform: hov ? 'translateY(-2px)' : 'translateY(0)',
  transition: 'all 0.18s ease',
  cursor: 'default',
})

function StatBox({ label, value, color = '#8AAAC8' }: { label: string; value: string; color?: string }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...hoverCard(hov), padding: '12px 14px' }}>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 300, color, letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  )
}

export default function FindPage() {
  const width     = useWindowWidth()
  const isMobile  = width < 640
  const isTablet  = width >= 640 && width < 1024
  const isDesktop = width >= 1024

  const mapRef      = useRef<any>(null)
  const markerRef   = useRef<any>(null)
  const mapDivRef   = useRef<HTMLDivElement>(null)
  const LRef        = useRef<any>(null)
  const searchTimer = useRef<any>(null)

  const [query,       setQuery]       = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [searching,   setSearching]   = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)
  const [selectedLoc, setSelectedLoc] = useState<{ lat: number; lon: number; name: string } | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  const [weatherNow,   setWeatherNow]   = useState<WeatherNow | null>(null)
  const [forecastDays, setForecastDays] = useState<ForecastDay[]>([])
  const [chartData,    setChartData]    = useState<ChartData | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const [sunMoon, setSunMoon] = useState<any>(null)
  const [sunPos,  setSunPos]  = useState(50)
  const [sunHov,  setSunHov]  = useState(false)

  // hover states สำหรับ search bar และปุ่มต่างๆ
  const [inputHov,  setInputHov]  = useState(false)
  const [searchHov, setSearchHov] = useState(false)
  const [gpsHov,    setGpsHov]    = useState(false)
  const [sunCardHov, setSunCardHov] = useState(false)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbySpots,   setNearbySpots]   = useState<DarkSpot[]>(DARK_SKY_SPOTS.slice(0, 5))

  // sort dark sky spots ตาม GPS
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords
      const sorted = DARK_SKY_SPOTS
        .map(s => ({ ...s, dist: Math.round(haversineKm(latitude, longitude, s.lat, s.lon)) }))
        .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0))
        .slice(0, 5)
      setNearbySpots(sorted)
    }, () => {}, { timeout: 5000 })
  }, [])

  // โหลด Leaflet
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return
    import('leaflet').then(L => {
      const Lf = L.default || L
      LRef.current = Lf
      delete (Lf.Icon.Default.prototype as any)._getIconUrl
      Lf.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      if (!mapDivRef.current || (mapDivRef.current as any)._leaflet_id) return
      const map = Lf.map(mapDivRef.current, { zoomControl: true }).setView([13, 101], 5)
      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map)
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng
        fetchWeather(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      })
      mapRef.current = map
    })
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [])

  
  useEffect(() => {
    if (!sunMoon?.sunriseISO || !sunMoon?.sunsetISO) return
    const update = () => setSunPos(getSunPosition(sunMoon.sunriseISO, sunMoon.sunsetISO))
    update()
    const t = setInterval(update, 60000)
    return () => clearInterval(t)
  }, [sunMoon])

  // ค้นหา Geoapify autocomplete พร้อม debounce 300ms
  const handleSearch = useCallback((q: string) => {
    setQuery(q)
    setSuggestions([])
    setShowSuggest(false)
    if (q.length < 2) return
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&accept-language=th&addressdetails=1`,
          { headers: { 'User-Agent': 'ObservatoryWeatherApp/1.0' } }
        )
        const data = await res.json()
        const results: SearchResult[] = (data || []).map((d: any) => ({
          place_id:     String(d.place_id),
          display_name: d.display_name,
          lat:          String(d.lat),
          lon:          String(d.lon),
        })).filter((r: SearchResult) => r.display_name)
        setSuggestions(results)
        setShowSuggest(results.length > 0)
      } catch {}
      finally { setSearching(false) }
    }, 300)
  }, [])

  const fetchNearbyOnFocus = useCallback(async () => {
    if (suggestions.length > 0) { setShowSuggest(true); return }
    if (!navigator.geolocation) return
    setNearbyLoading(true)
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords
        const headers = { 'User-Agent': 'ObservatoryWeatherApp/1.0' }

        // reverse geocode เพื่อหาชื่อสถานที่ปัจจุบัน
        const rev = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=th`,
          { headers }
        )
        const revData = await rev.json()
        const nearby: SearchResult[] = []

        const curName = revData?.address?.city || revData?.address?.county || revData?.address?.state || ''
        nearby.push({
          place_id: 'current',
          display_name: `ตำแหน่งปัจจุบัน${curName ? ` — ${curName}` : ''}`,
          lat: String(lat), lon: String(lon),
        })

        // ค้นสถานที่ใกล้เคียงจากชื่อเมืองปัจจุบัน
        if (curName) {
          const near = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(curName)}&format=json&limit=4&accept-language=th`,
            { headers }
          )
          const nearData = await near.json()
          ;(nearData || []).slice(0, 4).forEach((d: any) => {
            if (d.display_name) nearby.push({
              place_id: String(d.place_id),
              display_name: d.display_name,
              lat: String(d.lat), lon: String(d.lon),
            })
          })
        }

        setSuggestions(nearby)
        setShowSuggest(nearby.length > 0)
      } catch {}
      finally { setNearbyLoading(false) }
    }, () => setNearbyLoading(false), { timeout: 5000 })
  }, [suggestions.length])

  // ดึงข้อมูลจาก Open-Meteo ตรงๆ
  const fetchWeather = useCallback(async (lat: number, lon: number, name: string) => {
    setSuggestions([])
    setShowSuggest(false)
    setQuery(name)
    setSelectedLoc({ lat, lon, name })
    setSelectedDate(null)
    setError('')
    setLoading(true)

    if (mapRef.current && LRef.current) {
      if (markerRef.current) markerRef.current.remove()
      markerRef.current = LRef.current.marker([lat, lon]).addTo(mapRef.current)
        .bindPopup(name).openPopup()
      mapRef.current.setView([lat, lon], 10)
    }

    try {
      const today = new Date().toISOString().split('T')[0]
      const past7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

      const [curRes, fcRes, hrRes, sunRes, histRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,relative_humidity_2m,dew_point_2m,wind_speed_10m,wind_direction_10m,` +
          `surface_pressure,precipitation,uv_index,cloud_cover&wind_speed_unit=ms&timezone=auto`),
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,` +
          `relative_humidity_2m_mean,cloud_cover_mean,uv_index_max` +
          `&forecast_days=15&wind_speed_unit=ms&timezone=auto`),
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,wind_speed_10m,surface_pressure,precipitation,uv_index` +
          `&wind_speed_unit=ms&timezone=auto&start_date=${today}&end_date=${today}`),
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&daily=sunrise,sunset&timezone=auto&start_date=${today}&end_date=${today}`),
        // ดึงย้อนหลัง 7 วัน จาก historical API
        fetch(`https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,` +
          `relative_humidity_2m_mean,cloud_cover_mean,uv_index_max` +
          `&wind_speed_unit=ms&timezone=auto&start_date=${past7}&end_date=${today}`),
      ])
      const [curData, fcData, hrData, sunData, histData] = await Promise.all([
        curRes.json(), fcRes.json(), hrRes.json(), sunRes.json(), histRes.json(),
      ])

      const c = curData.current || {}
      const cloud = c.cloud_cover ?? 50
      setWeatherNow({
        temperature:    c.temperature_2m,
        humidity:       c.relative_humidity_2m,
        dew_point:      c.dew_point_2m,
        wind_speed:     c.wind_speed_10m,
        wind_direction: getWindDir(c.wind_direction_10m ?? 0),
        pressure:       c.surface_pressure,
        rain_rate:      c.precipitation ?? 0,
        uv_index:       c.uv_index ?? 0,
        cloud_cover:    cloud,
        condition:      getCondition(cloud),
      })

      const d = fcData.daily || {}
      const forecastList: ForecastDay[] = (d.time || []).map((date: string, i: number) => {
        const cl = d.cloud_cover_mean?.[i] ?? 0
        return {
          date, temp_max: d.temperature_2m_max?.[i], temp_min: d.temperature_2m_min?.[i],
          rain: d.precipitation_sum?.[i] ?? 0, wind_max: d.wind_speed_10m_max?.[i],
          humidity: d.relative_humidity_2m_mean?.[i], cloud_cover: Math.round(cl),
          uv_index: d.uv_index_max?.[i], condition: getCondition(cl),
        }
      })

      // รวม historical (ย้อนหลัง 7 วัน ไม่รวมวันนี้)
      const hd = histData.daily || {}
      const histList: ForecastDay[] = (hd.time || [])
        .filter((date: string) => date < today)
        .map((date: string, i: number) => {
          const cl = hd.cloud_cover_mean?.[i] ?? 0
          return {
            date, temp_max: hd.temperature_2m_max?.[i], temp_min: hd.temperature_2m_min?.[i],
            rain: hd.precipitation_sum?.[i] ?? 0, wind_max: hd.wind_speed_10m_max?.[i],
            humidity: hd.relative_humidity_2m_mean?.[i], cloud_cover: Math.round(cl),
            uv_index: hd.uv_index_max?.[i], condition: getCondition(cl),
          }
        })

      // merge: historical + forecast (dedup by date)
      const allDays = [...histList, ...forecastList]
      const seen = new Set<string>()
      setForecastDays(allDays.filter(d => { if (seen.has(d.date)) return false; seen.add(d.date); return true }))

      const h = hrData.hourly || {}
      setChartData({
        times: h.time || [], temperature: h.temperature_2m || [],
        humidity: h.relative_humidity_2m || [], dew_point: h.dew_point_2m || [],
        wind_speed: h.wind_speed_10m || [], pressure: h.surface_pressure || [],
        rain_rate: h.precipitation || [], uv_index: h.uv_index || [],
      })

      const sr   = sunData.daily?.sunrise?.[0]
      const ss   = sunData.daily?.sunset?.[0]
      const moon = getMoonPhase(new Date())
      setSunMoon({
        sunrise:      new Date(sr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        sunset:       new Date(ss).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        sunriseISO: sr, sunsetISO: ss,
        moonPhase: moon.phase, moonEmoji: moon.emoji,
        illumination: moon.illumination,
        sunAltitude: getSunAltitude(sr, ss, lat, lon),
      })

    } catch {
      setError('ดึงข้อมูลไม่ได้ กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }, [])

  // กดปุ่มค้นหา หรือกด Enter
  const handleSearchSubmit = useCallback(async () => {
    if (suggestions.length > 0) {
      const s = suggestions[0]
      fetchWeather(parseFloat(s.lat), parseFloat(s.lon), s.display_name)
      return
    }
    if (query.length < 2) return
    setSearching(true)
    try {
      const key = process.env.NEXT_PUBLIC_GEOAPIFY_KEY
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&limit=1&lang=th&apiKey=${key}`
      )
      const data = await res.json()
      const f    = data.features?.[0]
      if (f) {
        fetchWeather(f.properties.lat, f.properties.lon, f.properties.formatted)
      } else {
        setError('ไม่พบสถานที่ กรุณาลองคำค้นหาอื่น')
      }
    } catch { setError('ค้นหาไม่สำเร็จ กรุณาลองใหม่') }
    finally { setSearching(false) }
  }, [suggestions, query, fetchWeather])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearchSubmit()
  }

  // กด DayCard
  const handleDayClick = useCallback(async (date: string) => {
    if (!selectedLoc) return
    if (date === selectedDate) {
      setSelectedDate(null)
      fetchWeather(selectedLoc.lat, selectedLoc.lon, selectedLoc.name)
      return
    }
    setSelectedDate(date)
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${selectedLoc.lat}&longitude=${selectedLoc.lon}` +
        `&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,wind_speed_10m,surface_pressure,precipitation,uv_index` +
        `&wind_speed_unit=ms&timezone=auto&start_date=${date}&end_date=${date}`
      )
      const data = await res.json()
      const h    = data.hourly || {}
      setChartData({
        times: h.time || [], temperature: h.temperature_2m || [],
        humidity: h.relative_humidity_2m || [], dew_point: h.dew_point_2m || [],
        wind_speed: h.wind_speed_10m || [], pressure: h.surface_pressure || [],
        rain_rate: h.precipitation || [], uv_index: h.uv_index || [],
      })
      const day = forecastDays.find(d => d.date === date)
      if (day) {
        setWeatherNow(prev => prev ? {
          ...prev,
          temperature: day.temp_max, humidity: day.humidity,
          wind_speed: day.wind_max, rain_rate: day.rain,
          uv_index: day.uv_index, cloud_cover: day.cloud_cover,
          condition: day.condition,
        } : prev)
      }
    } catch {}
  }, [selectedLoc, selectedDate, forecastDays, fetchWeather])

  // GPS
  const handleMyLocation = () => {
    if (!navigator.geolocation) { setError('Browser ไม่รองรับ Geolocation'); return }
    navigator.geolocation.getCurrentPosition(
      pos => fetchWeather(pos.coords.latitude, pos.coords.longitude, 'ตำแหน่งปัจจุบัน'),
      ()  => setError('ไม่สามารถดึงตำแหน่งได้')
    )
  }

  const p  = (isNaN(sunPos) ? 0 : sunPos) / 100
  const cx = p * 320
  const cy = (1 - p) * (1 - p) * 90 + 2 * (1 - p) * p * 0 + p * p * 90
  const isDaytime = sunMoon && sunMoon.sunAltitude > 0

  const today    = new Date().toISOString().split('T')[0]
  // 7 วันย้อนหลัง + วันนี้ + 7 วันข้างหน้า เหมือนหน้า detail
  const past     = forecastDays.filter(d => d.date < today).slice(-7)
  const todayArr = forecastDays.filter(d => d.date === today)
  const upcoming = forecastDays.filter(d => d.date > today).slice(0, 7)
  const dayCards = [...past, ...todayArr, ...upcoming].map(d => ({
    date: d.date, dayLabel: formatDayLabel(d.date, d.date === today),
    isToday: d.date === today, isPast: d.date < today,
    tempMax: d.temp_max, tempMin: d.temp_min,
    humidity: d.humidity, windSpeed: d.wind_max,
    rainSum: d.rain, cloudCover: d.cloud_cover,
    condition: d.condition, conditionIcon: condIcon(d.condition),
  }))

  const px         = isMobile ? '16px' : '24px'
  const chartTitle = selectedDate ? `กราฟ 24hr — ${selectedDate}` : 'กราฟ 24hr วันนี้'

  return (
    <div style={{ background: '#000', color: '#f1f5f9', display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeId="find" />
      <main style={{ flex: 1, minWidth: 0 }}>

        {/* Header + Search */}
        <div style={{ padding: `20px ${px} 0`, position: 'relative', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={COLORS.teal} />
            </svg>
            <h1 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: '#fff', margin: 0 }}>
              หาที่ดูดาว
            </h1>
          </div>

        <div style={{ display: 'flex', gap: '8px', maxWidth: '680px', marginBottom: '12px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                value={query}
                onChange={e => handleSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (query.length < 2) fetchNearbyOnFocus(); else if (suggestions.length > 0) setShowSuggest(true) }}
                onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
                onMouseEnter={() => setInputHov(true)}
                onMouseLeave={() => setInputHov(false)}
                placeholder="ค้นหาสถานที่ เช่น มหาวิทยาลัยขอนแก่น, เชียงใหม่..."
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'linear-gradient(135deg, #1a2540 0%, #0f1a2e 50%, #1a2035 100%)',
                  border: `1px solid ${inputHov ? 'rgba(6,214,160,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '12px', color: '#fff', fontSize: '14px',
                  outline: 'none', boxSizing: 'border-box',
                  boxShadow: inputHov ? '0 8px 32px rgba(0,0,0,0.6)' : '0 4px 20px rgba(0,0,0,0.4)',
                  transform: inputHov ? 'translateY(-2px)' : 'translateY(0)',
                  transition: 'all 0.18s ease',
                }}
              />
              {/* Dropdown */}
              {showSuggest && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                  display: 'flex', flexDirection: 'column', gap: '4px',
                  zIndex: 9999,
                }}>
                  {suggestions.map((s) => (
                    <div key={s.place_id}
                      onMouseDown={() => fetchWeather(parseFloat(s.lat), parseFloat(s.lon), s.display_name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #16223f 0%, #0d1627 100%)',
                        border: '1px solid rgba(6,214,160,0.35)',
                        borderLeft: '4px solid #06D6A0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #1e3050 0%, #112035 100%)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #16223f 0%, #0d1627 100%)')}
                    >
                      {/* pin icon */}
                      <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                        <path d="M12 2 C8.13 2 5 5.13 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5.13 15.87 2 12 2 Z" fill="#06D6A0"/>
                        <circle cx="12" cy="9" r="3" fill="rgba(0,0,0,0.3)"/>
                      </svg>
                      <span style={{ fontSize: '13px', color: '#fff', lineHeight: 1.4 }}>
                        {s.display_name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {/* Loading indicator */}
              {(searching || nearbyLoading) && (
                <div style={{ position: 'absolute', right: '14px', top: '40%', transform: 'translateY(-50%)', pointerEvents: 'none', color: COLORS.teal, fontSize: '12px', letterSpacing: '0.06em', fontFamily: 'var(--font-poppins)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {nearbyLoading ? 'หาตำแหน่งใกล้เคียง...' : 'ค้นหา...'}
                </div>
              )}
            </div>

            {/* ปุ่มค้นหา (ไอคอน SVG) */}
            <button onClick={handleSearchSubmit} disabled={searching || query.length < 2}
              onMouseEnter={() => setSearchHov(true)}
              onMouseLeave={() => setSearchHov(false)}
              style={{
                ...btnHover(searchHov && query.length >= 2),
                padding: '12px 18px',
                cursor: query.length < 2 ? 'default' : 'pointer',
                color: query.length < 2 ? 'rgba(255,255,255,0.3)' : '#fff',
                fontSize: '14px', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '6px',
                fontWeight: 600,
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" fill="currentColor" opacity="0.9"/>
                <circle cx="11" cy="11" r="5" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2"/>
                <line x1="17.5" y1="17.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              {searching ? '...' : 'ค้นหา'}
            </button>

            {/* ปุ่ม GPS (หมุดตำแหน่งสีแดง) */}
            <button onClick={handleMyLocation}
              onMouseEnter={() => setGpsHov(true)}
              onMouseLeave={() => setGpsHov(false)}
              style={{ ...btnHover(gpsHov), padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="28" viewBox="0 0 22 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* ตัวหมุด */}
                <path d="M11 0C6.03 0 2 4.03 2 9C2 15.25 11 28 11 28C11 28 20 15.25 20 9C20 4.03 15.97 0 11 0Z"
                  fill="#ef4444" stroke="#c41e1e" strokeWidth="0.5"/>
                {/* วงกลมขาวตรงกลาง */}
                <circle cx="11" cy="9" r="4" fill="white"/>
                {/* เงาล่าง */}
                <ellipse cx="11" cy="27" rx="3" ry="1" fill="rgba(0,0,0,0.2)"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Map + Stats */}
        <div style={{
          display: isDesktop ? 'grid' : 'block',
          gridTemplateColumns: isDesktop ? '1fr 520px' : undefined,
          height: isDesktop ? '55vh' : undefined,
          minHeight: isDesktop ? '400px' : undefined,
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ position: 'relative', height: isMobile ? '240px' : isTablet ? '320px' : '100%' }}>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
            {!selectedLoc && (
              <div style={{
                position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(6,214,160,0.2)', borderRadius: '20px',
                padding: '6px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.6)',
                pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
              }}>
                คลิกบนแผนที่ หรือค้นหาสถานที่
              </div>
            )}
          </div>

          {/* Stats ขวา */}
          <div style={{
            background: '#000',
            borderLeft: isDesktop ? '1px solid rgba(6,214,160,0.08)' : 'none',
            padding: '16px', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: '10px',
            height: isDesktop ? '100%' : undefined,
            boxSizing: 'border-box',
          }}>
            {loading ? (
              <div style={{ color: COLORS.teal, fontSize: '13px', textAlign: 'center', paddingTop: '60px', letterSpacing: '0.1em', fontFamily: 'var(--font-poppins)' }}>
                กำลังดึงข้อมูล...
              </div>
            ) : error ? (
              <div style={{ color: '#f87171', fontSize: '13px', textAlign: 'center', paddingTop: '40px' }}>{error}</div>
            ) : !weatherNow ? (
              // Empty state
              <div style={{ fontFamily: 'var(--font-poppins)', display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
                {/* icon + คำแนะนำ */}
                <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={COLORS.teal} opacity="0.8"/>
                  </svg>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>เลือกสถานที่ดูดาว</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
                    ค้นหาหรือคลิกบนแผนที่<br/>เพื่อเช็คสภาพอากาศและคืนที่เหมาะสม
                  </div>
                </div>

                {/* วิธีใช้ */}
                <div style={{ background: 'linear-gradient(135deg,#1a2540 0%,#0f1a2e 50%,#1a2035 100%)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                  <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.1em', fontWeight: 700 }}>วิธีใช้</span>
                  </div>
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { icon: '🔍', text: 'พิมพ์ค้นหาสถานที่ด้านบน' },
                      { icon: '📍', text: 'กดปุ่ม GPS เพื่อใช้ตำแหน่งปัจจุบัน' },
                      { icon: '🗺️', text: 'คลิกจุดใดก็ได้บนแผนที่' },
                    ].map((t, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#fff' }}>
                        <span>{t.icon}</span><span>{t.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* จุดท้องฟ้ามืด */}
                <div style={{ background: 'linear-gradient(135deg,#1a2540 0%,#0f1a2e 50%,#1a2035 100%)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                  <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.1em', fontWeight: 700 }}>จุดท้องฟ้ามืดใกล้คุณ</span>
                  </div>
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {nearbySpots.map(loc => (
                      <button key={loc.name}
                        onClick={() => fetchWeather(loc.lat, loc.lon, loc.name)}
                        style={{ background: 'linear-gradient(135deg,#16223f 0%,#0d1627 100%)', border: '1px solid rgba(6,214,160,0.5)', borderLeft: '3px solid #06D6A0', borderRadius: '6px', padding: '7px 12px', color: '#fff', fontSize: '12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-poppins)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#1e3050 0%,#112035 100%)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#16223f 0%,#0d1627 100%)')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                            <path d="M12 2 C8.13 2 5 5.13 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5.13 15.87 2 12 2 Z" fill={COLORS.teal}/>
                          </svg>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.name}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                          {loc.dist != null && <span style={{ fontSize: '10px', color: COLORS.teal, fontWeight: 600 }}>{loc.dist.toLocaleString()} km</span>}
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{loc.country}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ ...cardStyle, padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', color: COLORS.teal, letterSpacing: '0.08em', marginBottom: '4px' }}>
                    {selectedLoc?.lat.toFixed(4)}°N, {selectedLoc?.lon.toFixed(4)}°E
                    {selectedDate && <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: '8px' }}>— {selectedDate}</span>}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '8px', wordBreak: 'break-word' }}>
                    {selectedLoc?.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '42px', fontWeight: 200, color: '#fff', lineHeight: 1 }}>
                      {weatherNow.temperature?.toFixed(1)}
                    </span>
                    <span style={{ fontSize: '26px', color: 'rgba(255,255,255,0.5)' }}>°C</span>
                    <span style={{ fontSize: '15px', color: '#94a3b8', marginLeft: '6px' }}>
                      {condIcon(weatherNow.condition)} {weatherNow.condition}
                    </span>
                  </div>
                  {selectedDate && (
                    <button onClick={() => { setSelectedDate(null); if (selectedLoc) fetchWeather(selectedLoc.lat, selectedLoc.lon, selectedLoc.name) }}
                      style={{ ...cardStyle, marginTop: '10px', padding: '5px 12px', color: COLORS.teal, cursor: 'pointer', fontSize: '11px', border: '1px solid rgba(6,214,160,0.2)' }}>
                      ← Back to Live
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <StatBox label="HUMIDITY"  value={`${weatherNow.humidity?.toFixed(0)}%`}      color={COLORS.teal} />
                  <StatBox label="DEWPOINT"  value={`${weatherNow.dew_point?.toFixed(1)}°C`} />
                  <StatBox label="WIND"      value={`${weatherNow.wind_speed?.toFixed(1)} m/s`} color={COLORS.teal} />
                  <StatBox label="DIRECTION" value={weatherNow.wind_direction} />
                  <StatBox label="PRESSURE"  value={`${weatherNow.pressure?.toFixed(0)} hPa`} />
                  <StatBox label="UV INDEX"  value={`${weatherNow.uv_index?.toFixed(0)}`}       color="#FFD166" />
                </div>

                {sunMoon && (
                  <div
                    onMouseEnter={() => setSunCardHov(true)}
                    onMouseLeave={() => setSunCardHov(false)}
                    style={{
                      ...hoverCard(sunCardHov), padding: '14px 16px',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(6,214,160,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Sun & Moon</span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                        {sunMoon.illumination.toFixed(1)}% {sunMoon.moonPhase} {sunMoon.moonEmoji}
                      </span>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 300, color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
                      {sunMoon.sunAltitude.toFixed(2)}°
                    </div>
                    <div style={{ position: 'relative' }}>
                      <svg width="100%" height="70" viewBox="0 0 320 100">
                        <line x1="0" y1="90" x2="320" y2="90" stroke="rgba(6,214,160,0.15)" strokeWidth="1" />
                        <path d="M0 90 Q160 0 320 90" fill="none" stroke="rgba(6,214,160,0.12)" strokeWidth="1.5" strokeDasharray="4 4" />
                        {isDaytime && (
                          <>
                            <defs><clipPath id="sunClip"><rect x="0" y="0" width={cx} height="100" /></clipPath></defs>
                            <path d="M0 90 Q160 0 320 90" fill="none" stroke="rgba(6,214,160,0.55)" strokeWidth="2" strokeDasharray="4 4" clipPath="url(#sunClip)" />
                            <path d="M0 90 Q160 0 320 90 L320 90 L0 90 Z" fill="rgba(6,214,160,0.06)" clipPath="url(#sunClip)" />
                            <g onMouseEnter={() => setSunHov(true)} onMouseLeave={() => setSunHov(false)} style={{ cursor: 'pointer' }}>
                              <circle cx={cx} cy={cy} r="16" fill="transparent" />
                              <circle cx={cx} cy={cy} r="8" fill="#FFD166" style={{ filter: 'drop-shadow(0 0 6px #FFD166)' }} />
                            </g>
                          </>
                        )}
                      </svg>
                      {isDaytime && sunHov && (
                        <div style={{
                          position: 'absolute', top: '2px',
                          left: `${(cx / 320) * 100}%`,
                          transform: cx > 260 ? 'translateX(-100%)' : 'translateX(-50%)',
                          background: 'rgba(15,26,46,0.95)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff', fontSize: '13px', fontWeight: 600,
                          padding: '4px 10px', borderRadius: '8px',
                          pointerEvents: 'none', whiteSpace: 'nowrap',
                        }}>
                          {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                      <span>{sunMoon.sunrise}</span>
                      <span> {sunMoon.sunset}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Forecast 15 วัน */}
        {dayCards.length > 0 && (
          <div style={{ padding: `16px ${px} 8px` }}>
            <div style={{ fontSize: '11px', color: 'rgba(6,214,160,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '12px' }}>
              15-Day Forecast {selectedDate && <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>— {selectedDate}</span>}
            </div>
            <div style={{
              display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', paddingTop: '14px',
              scrollbarWidth: 'thin', scrollbarColor: 'rgba(6,214,160,0.3) transparent',
            } as React.CSSProperties}>
              {dayCards.map(day => (
                <div key={day.date} onClick={() => handleDayClick(day.date)}
                  style={{
                    flexShrink: 0, cursor: 'pointer',
                    width: isMobile ? '100px' : isDesktop ? `calc((100% - ${(dayCards.length - 1) * 8}px) / ${dayCards.length})` : '120px',
                    minWidth: '90px', maxWidth: '130px',
                    outline: selectedDate === day.date ? `2px solid ${COLORS.teal}` : 'none',
                    borderRadius: '12px', overflow: 'visible',
                  }}>
                  <DayCard day={day} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* กราฟ */}
        {chartData && chartData.times.length > 0 && (
          <div style={{ padding: `16px ${px} ${isMobile ? '80px' : '40px'}` }}>
            <div style={{ fontSize: '11px', color: 'rgba(6,214,160,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '16px' }}>
              {chartTitle}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : isTablet ? 'repeat(2, 1fr)' : '1fr',
              gap: '16px',
            }}>
              <SparkChart label="Temperature" unit="°C"    data={chartData.temperature} times={chartData.times}
                extraData={{ label: 'Dewpoint', data: chartData.dew_point, unit: '°C', color: '#8AAAC8' }} />
              <SparkChart label="Humidity"    unit="%"     data={chartData.humidity}    times={chartData.times} />
              <SparkChart label="Wind Speed"  unit=" m/s"  data={chartData.wind_speed}  times={chartData.times} />
              <SparkChart label="Air Pressure" unit=" hPa" data={chartData.pressure}    times={chartData.times} />
              <SparkChart label="Rain Rate"   unit=" mm"   data={chartData.rain_rate}   times={chartData.times} />
              <SparkChart label="UV Index"    unit=""      data={chartData.uv_index}    times={chartData.times} />
            </div>
          </div>
        )}

      </main>
    </div>
  )
}