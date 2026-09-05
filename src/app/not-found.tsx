import Link from 'next/link'

export default function NotFound() {
  return (
    <div className='flex h-full flex-1 flex-col items-center justify-center text-center'>
      <p className='font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-accent'>404</p>
      <h1 className='mt-3 text-2xl font-semibold text-foreground'>This topic is not here</h1>
      <p className='mt-2 max-w-sm text-sm leading-6 text-muted'>
        That deck does not exist yet. Pick a topic from the library, or add one in JSON.
      </p>
      <Link
        href='/'
        className='btn-primary mt-6 px-5 py-3 text-sm'
      >
        Back to library
      </Link>
    </div>
  )
}
