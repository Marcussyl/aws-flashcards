import { MEMORI_MARK_VIEWBOX, MemoriMarkPaths } from '@/lib/memori-mark-paths';

type MemoriMarkProps = {
  className?: string;
  title?: string;
};

export function MemoriMark({ className = 'h-8 w-8', title }: MemoriMarkProps) {
  return (
    <svg
      viewBox={MEMORI_MARK_VIEWBOX}
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <MemoriMarkPaths />
    </svg>
  );
}
