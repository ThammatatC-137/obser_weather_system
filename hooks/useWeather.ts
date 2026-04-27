'use client'

// Custom Hook ดึงข้อมูลอากาศ + Auto Refresh

import { useState, useEffect, useCallback } from 'react'
import { Observatory }        from '@/types'
import { OBSERVATORY_ORDER, REFRESH_INTERVAL } from '@/constants/observatories'

export function useWeather() {
  // State 3 ตัวครับ
  const [observatories, setObservatories] = useState<Observatory[]>([])
  const [loading,       setLoading]       = useState(true)
  const [lastUpdate,    setLastUpdate]    = useState('')

  // ฟังก์ชันดึงข้อมูลครับ
  const fetchData = useCallback(async () => {
    try {
   
      const res  = await fetch(`/api/weather?t=${Date.now()}`)
      const json = await res.json()

      if (json.success) {
        // เรียงลำดับตาม OBSERVATORY_ORDER
        const sorted = OBSERVATORY_ORDER
          .map(id => json.data.find(
            (d: Observatory) => d.observatory_id === id
          ))
          .filter(Boolean) as Observatory[]

        setObservatories(sorted)
        setLastUpdate(new Date().toLocaleTimeString('th-TH'))
      }
    } catch (err) {
      console.error('useWeather error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // ดึงข้อมูลตอนเปิดหน้าครับ
    fetchData()

    // Auto Refresh ทุก 15 นาทีครับ
    const interval = setInterval(fetchData, REFRESH_INTERVAL)

 
    return () => clearInterval(interval)
  }, [fetchData])

  return { observatories, loading, lastUpdate }
}