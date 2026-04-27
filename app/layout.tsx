
// กรอบหลักที่ครอบทุกหน้าในเว็บ

import type { Metadata } from 'next'
import './globals.css'

// ข้อมูล SEO ของเว็บครับ
export const metadata: Metadata = {
  title:       'Observatory Weather System',
  description: 'Real-time weather monitoring for NARIT observatories',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body>
        {children}
        {/* children คือหน้าแต่ละหน้าครับ
            เช่น page.tsx, observatory/[id]/page.tsx */}
      </body>
    </html>
  )
}