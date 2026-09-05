type MemoriMarkProps = {
  className?: string
}

export function MemoriMark({ className = 'size-7' }: MemoriMarkProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect width="28" height="28" rx="7" className="fill-accent/15" />
      <g transform="rotate(12 16.2 12.4)">
        <rect x="10.2" y="5.2" width="12" height="14.4" rx="2.2" className="fill-accent/45" />
      </g>
      <rect x="5.6" y="7.4" width="12" height="14.4" rx="2.2" className="fill-accent" />
    </svg>
  )
}
