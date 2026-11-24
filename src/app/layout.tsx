import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { auth } from '@/auth'
import { AppShell } from '@/components/AppShell'
import { AuthSessionProvider } from '@/components/AuthSessionProvider'
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
  appleWebApp: {
    capable: true,
    title: 'Memori',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#020617',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  return (
    <html lang="en" className={`${geistSans.variable} h-dvh antialiased`}>
      <body className="h-dvh overflow-hidden bg-slate-950 font-sans">
        <AuthSessionProvider session={session}>
          <AppShell>{children}</AppShell>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
