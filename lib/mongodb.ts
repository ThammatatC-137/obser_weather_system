import dns from 'dns'
import mongoose from 'mongoose'

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

const MONGODB_URI = process.env.MONGODB_URI!

export async function connectDB() {
  // connected
  if (mongoose.connection.readyState === 1) return mongoose.connection

  // กำลัง connecting อยู่ รอให้เสร็จก่อน
  if (mongoose.connection.readyState === 2) {
    await new Promise<void>((resolve, reject) => {
      mongoose.connection.once('connected', resolve)
      mongoose.connection.once('error', reject)
    })
    return mongoose.connection
  }

  // retry 4 รอบ: 2s → 4s → 6s → 8s
  // จำเป็นเพราะ DNS SRV ของ Atlas resolve ไม่ได้ทันทีหลังรีสตาร์ทเครื่อง
  const MAX_RETRIES = 4
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await mongoose.connect(MONGODB_URI, {
        dbName: 'observatory_weather',
        serverSelectionTimeoutMS: 10_000,
        connectTimeoutMS: 10_000,
      })
      return mongoose.connection
    } catch (err) {
      if (i === MAX_RETRIES - 1) throw err
      const wait = (i + 1) * 2000
      console.warn(`[MongoDB] เชื่อมต่อไม่ได้ ลองใหม่ใน ${wait / 1000}s... (${i + 1}/${MAX_RETRIES})`)
      await new Promise(r => setTimeout(r, wait))
    }
  }

  return mongoose.connection
}
