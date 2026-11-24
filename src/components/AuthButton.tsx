'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { IconGitHub } from '@/components/icons'

export function AuthButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <span
        className="inline-flex h-10 w-10 items-center justify-center"
        aria-hidden="true"
      >
        <span className="size-7 animate-pulse rounded-full bg-white/10" />
      </span>
    )
  }

  if (!session?.user) {
    return (
      <button
        type="button"
        onClick={() => signIn('github')}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-accent"
      >
        <IconGitHub className="h-4 w-4" />
        <span className="hidden sm:inline">Sign in</span>
      </button>
    )
  }

  const name = session.user.name ?? session.user.email ?? 'Signed in'

  return (
    <button
      type="button"
      onClick={() => signOut()}
      title={`Sign out (${name})`}
      className="inline-flex h-10 max-w-[10rem] items-center gap-2 rounded-lg px-2 text-sm text-slate-200 hover:bg-white/10 hover:text-accent sm:max-w-[14rem]"
    >
      {session.user.image ? (
        // GitHub avatar; skip next/image to avoid remotePatterns config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.user.image}
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 rounded-full border border-white/15"
        />
      ) : (
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10">
          <IconGitHub className="h-4 w-4" />
        </span>
      )}
      <span className="hidden truncate sm:inline">Sign out</span>
    </button>
  )
}
