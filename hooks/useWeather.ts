'use client'

// hook ดึงข้อมูลอากาศ และรีเฟรชอัตโนมัติ

import { useState, useEffect, useCallback } from 'react'
import { Observatory }        from '@/types'
import { OBSERVATORY_ORDER, REFRESH_INTERVAL } from '@/constants/observatories'

export function useWeather() {
  // state เก็บข้อมูลหอ สถานะโหลด และเวลาอัปเดตล่าสุด
  const [observatories, setObservatories] = useState<Observatory[]>([])
  const [loading,       setLoading]       = useState(true)
  const [lastUpdate,    setLastUpdate]    = useState('')

  // ฟังก์ชันดึงข้อมูลจาก API
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
    // ดึงข้อมูลรอบแรกตอนเปิดหน้า
    fetchData()

    // ตั้งเวลาดึงข้อมูลซ้ำตาม REFRESH_INTERVAL
    const interval = setInterval(fetchData, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchData])

  return { observatories, loading, lastUpdate }
}