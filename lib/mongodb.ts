import dns from 'dns'
import mongoose from 'mongoose'

// บังคับ Node.js ใช้ Google DNS เพื่อให้ resolve SRV record ของ MongoDB Atlas ได้
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

const MONGODB_URI = process.env.MONGODB_URI!

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  await mongoose.connect(MONGODB_URI, {
    dbName: 'observatory_weather',
  })

  return mongoose.connection
}
