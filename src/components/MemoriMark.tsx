type MemoriMarkProps = {
  className?: string
  title?: string
}

export function MemoriMark({ className = 'size-8', title }: MemoriMarkProps) {
  return (
    <img
      src='/memori-mark.svg'
      alt={title ?? ''}
      title={title}
      className={className}
      draggable={false}
    />
  )
}
