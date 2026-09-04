import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { AppShell } from '@/components/AppShell'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AWS Cert Flashcards',
  description: 'Review AWS Solutions Architect notes with flip cards.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-dvh antialiased`}>
      <body className="h-dvh overflow-hidden bg-slate-950 font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
