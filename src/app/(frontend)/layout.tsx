import Link from 'next/link'
import React from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Motion } from '@/components/Motion'
import './tokens.css'
import './styles.css'
import './art-direction.css'

export const metadata = {
  icons: { icon: '/favicon.svg' },
  title: 'RACE CONTROL — liga simracingowa',
  description:
    'Kompletny system zarządzania ligą simracingową: rejestracje, wyścigi, panel sędziowski oraz automatyczna klasyfikacja generalna.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className="dark">
      <body className="min-h-screen flex flex-col antialiased">
        <Link className="skip-link" href="#content">
          Przejdź do treści
        </Link>
        <Navbar />
        <main className="flex-grow" id="content">
          {children}
        </main>
        <Footer />
        <Motion />
      </body>
    </html>
  )
}
