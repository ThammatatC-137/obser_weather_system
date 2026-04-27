
// เชื่อมต่อ MongoDB Atlas


import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

export async function connectDB() {
  // ถ้าเชื่อมอยู่แล้ว → ใช้อันเดิมเลย
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  // ถ้ายังไม่เชื่อม → เชื่อมใหม่
  await mongoose.connect(MONGODB_URI, {
    dbName: 'observatory_weather',
  })

  return mongoose.connection
}