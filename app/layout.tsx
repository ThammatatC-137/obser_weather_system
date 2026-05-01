'use client'
import type { Metadata }  from 'next'
import { useEffect }      from 'react'
import './globals.css'

function StarField() {
  useEffect(() => {
    const container = document.getElementById('star-field')
    if (!container || container.childElementCount > 0) return

    // Stars
    for (let i = 0; i < 120; i++) {
      const star       = document.createElement('div')
      const size       = Math.random() * 2 + 0.5
      star.className   = 'star'
      star.style.cssText = `
        left:    ${Math.random() * 100}%;
        top:     ${Math.random() * 100}%;
        width:   ${size}px;
        height:  ${size}px;
        --op:    ${Math.random() * 0.5 + 0.1};
        --dur:   ${Math.random() * 4 + 2}s;
        --delay: ${Math.random() * 4}s;
      `
      container.appendChild(star)
    }
  }, [])

  return (
    <>
      {/* Star field */}
      <div id="star-field" className="star-field" />

      {/* Nebula blobs */}
      <div className="nebula" style={{
        width: '600px', height: '600px',
        left: '-200px', top: '-200px',
        background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)',
      }} />
      <div className="nebula" style={{
        width: '500px', height: '500px',
        right: '-150px', bottom: '20%',
        background: 'radial-gradient(circle, rgba(6,214,160,0.08) 0%, transparent 70%)',
      }} />
    </>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <StarField />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  )
}
