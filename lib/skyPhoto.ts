// lib/skyPhoto.ts
// เลือกรูปท้องฟ้าตามสภาพอากาศ + เวลา

const SKY_PHOTOS: Record<string, string[]> = {
  Clear_night: [
    'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=600&q=80',
    'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=600&q=80',
  ],
  Clear_day: [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    'https://images.unsplash.com/photo-1475070929565-c985b496cb9f?w=600&q=80',
  ],
  'Partly Cloudy_night': [
    'https://images.unsplash.com/photo-1532978379173-523e16f371f9?w=600&q=80',
  ],
  'Partly Cloudy_day': [
    'https://images.unsplash.com/photo-1561553873-e8491a564fd0?w=600&q=80',
  ],
  Cloudy_night: [
    'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=600&q=80',
  ],
  Cloudy_day: [
    'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=600&q=80',
  ],
  Overcast_night: [
    'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=600&q=80',
  ],
  Overcast_day: [
    'https://images.unsplash.com/photo-1496450681664-3df85efbd29f?w=600&q=80',
  ],
}

export function getSkyPhoto(condition: string, timestamp: string): string {
  const hour    = new Date(timestamp).getHours()
  const isNight = hour < 6 || hour >= 18
  const key     = `${condition}_${isNight ? 'night' : 'day'}`
  const list    = SKY_PHOTOS[key] || SKY_PHOTOS['Cloudy_night']
  const idx     = Math.floor(new Date(timestamp).getMinutes() / 5) % list.length
  return list[idx]
}