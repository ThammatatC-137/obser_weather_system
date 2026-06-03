// เลือกรูปท้องฟ้าสำหรับการ์ด/หน้า detail
// ถ้ามีรูปจาก NARIT ใช้รูปจริง ถ้าไม่มี fallback เป็น SVG ตามสภาพอากาศ (อยู่ใน public/)

export function getSkyPhoto(
  condition: string,
  _timestamp: string,
  naritImageUrl?: string
): string {

  if (naritImageUrl) return naritImageUrl

  if (condition === 'Clear')         return '/sky-clear.svg'
  if (condition === 'Partly Cloudy') return '/sky-partly.svg'
  if (condition === 'Cloudy')        return '/sky-cloudy.svg'
  return '/sky-overcast.svg'
}
