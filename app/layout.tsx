import type { Metadata } from 'next'
import { Poppins }        from 'next/font/google'
import StarField          from '@/components/StarField'
import './globals.css'

// โหลดฟอนต์ Poppins แบบ self-host แล้วเก็บไว้ในตัวแปร CSS --font-poppins
const poppins = Poppins({
  subsets: ['latin'],
  weight:  ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'Weather Report',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={poppins.variable}>
      <body>
        <StarField />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  )
}
