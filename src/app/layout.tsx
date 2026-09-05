import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Geist, JetBrains_Mono } from 'next/font/google'
import { AppShell } from '@/components/AppShell'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
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
    <html lang='en' className={`${geistSans.variable} ${jetbrainsMono.variable} h-dvh antialiased`}>
      <body className='h-dvh overflow-hidden bg-background font-sans text-foreground'>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
