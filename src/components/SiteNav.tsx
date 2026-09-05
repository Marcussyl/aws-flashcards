'use client'

import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { layoutSpring } from '@/lib/motion'
import { topicHref } from '@/lib/paths'
import { useIsClient } from '@/lib/use-is-client'
import type { TopicId } from '@/data/topics'

function navItems(topicId: TopicId | null) {
  if (!topicId) {
    return [{ href: '/', label: 'Library' }]
  }
  return [
    { href: '/', label: 'Library' },
    { href: topicHref(topicId), label: 'Dashboard' },
    { href: topicHref(topicId, 'study'), label: 'Study' },
    { href: topicHref(topicId, 'browse'), label: 'Browse' },
  ]
}

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/'
  }
  const depth = href.split('/').filter(Boolean).length
  if (depth === 1) {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteNav({ topicId }: { topicId: TopicId | null }) {
  const pathname = usePathname()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const isClient = useIsClient()
  const open = openPath === pathname
  const menuId = useId()
  const reduce = useReducedMotion()
  const items = navItems(topicId)

  useEffect(() => {
    if (!open) {
      return
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenPath(null)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="relative">
      <nav className="hidden text-sm text-slate-300 sm:flex sm:gap-1" aria-label="Main">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative rounded-lg px-4 py-2 text-center hover:text-accent ${
                active ? 'text-accent' : ''
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-lg bg-white/10"
                  transition={reduce ? { duration: 0 } : layoutSpring}
                />
              ) : null}
              <span className="relative z-10">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-200 hover:bg-white/10 hover:text-accent sm:hidden"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpenPath((current) => (current === pathname ? null : pathname))}
      >
        <MenuIcon open={open} />
      </button>

      {isClient
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.button
                  key="nav-backdrop"
                  type="button"
                  className="fixed inset-0 z-40 bg-slate-950/50 sm:hidden"
                  aria-label="Close menu"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setOpenPath(null)}
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      <AnimatePresence>
        {open ? (
          <motion.nav
            key="nav-menu"
            id={menuId}
            className="absolute right-0 top-full z-50 mt-2 w-48 origin-top-right rounded-xl border border-white/10 bg-slate-900 p-1 text-sm text-slate-300 shadow-xl sm:hidden"
            aria-label="Main"
            initial={reduce ? false : { opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2.5 hover:bg-white/10 hover:text-accent ${
                  isActivePath(pathname, item.href) ? 'bg-white/10 text-accent' : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
          </motion.nav>
        ) : null}
      </AnimatePresence>
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
