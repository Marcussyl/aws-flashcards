import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { AppShell } from '@/components/AppShell'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'Memori',
    template: '%s · Memori',
  },
  description: 'Personal flip-card review for AWS, Proxmox, and other topics you are learning.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-dvh antialiased`}>
      <body className="h-dvh overflow-hidden bg-slate-950 font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
