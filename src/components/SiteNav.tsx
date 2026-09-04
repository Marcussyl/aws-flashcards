'use client'

import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/study', label: 'Study' },
  { href: '/browse', label: 'Browse' },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const menuId = useId()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) {
      return
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="relative">
      <nav className="hidden text-sm text-slate-300 sm:flex sm:gap-1" aria-label="Main">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-4 py-2 text-center hover:bg-white/10 hover:text-amber-300 ${
              isActivePath(pathname, item.href) ? 'bg-white/10 text-amber-300' : ''
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-200 hover:bg-white/10 hover:text-amber-300 sm:hidden"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((value) => !value)}
      >
        <MenuIcon open={open} />
      </button>

      {open
        ? createPortal(
            <button
              type="button"
              className="fixed inset-0 z-40 bg-slate-950/50 sm:hidden"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />,
            document.body,
          )
        : null}

      {open ? (
        <nav
          id={menuId}
          className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-white/10 bg-slate-900 p-1 text-sm text-slate-300 shadow-xl sm:hidden"
          aria-label="Main"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2.5 hover:bg-white/10 hover:text-amber-300 ${
                isActivePath(pathname, item.href) ? 'bg-white/10 text-amber-300' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-4 w-5" aria-hidden="true">
      <span
        className={`absolute left-0 block h-0.5 w-5 bg-current transition-transform ${
          open ? 'top-1.5 rotate-45' : 'top-0'
        }`}
      />
      <span
        className={`absolute left-0 top-1.5 block h-0.5 w-5 bg-current transition-opacity ${
          open ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <span
        className={`absolute left-0 block h-0.5 w-5 bg-current transition-transform ${
          open ? 'top-1.5 -rotate-45' : 'top-3'
        }`}
      />
    </span>
  )
}
