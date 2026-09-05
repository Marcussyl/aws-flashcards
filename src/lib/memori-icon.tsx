const ACCENT = '#f59e0b'
const CANVAS = '#0b0f17'
const FOLD = '#fb923c'

export function MemoriIconGlyph({ size }: { size: number }) {
  const pad = Math.round(size * 0.08)
  const inner = size - pad * 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill='none'
    >
      <rect width={size} height={size} rx={Math.round(size * 0.22)} fill={CANVAS} />
      <g transform={`translate(${pad} ${pad}) scale(${inner / 64})`}>
        <g transform='translate(32 32) scale(0.056) translate(-512 -500)'>
          <line
            x1='512'
            y1='465'
            x2='512'
            y2='705'
            stroke='#353942'
            strokeWidth='22'
            strokeLinecap='round'
          />
          <circle cx='512' cy='580' r='11' fill={ACCENT} fillOpacity='0.9' />
          <path
            d='M480 370 C420 370 360 395 345 445 C325 490 340 535 375 555 C335 580 325 630 345 675 C370 725 430 745 480 745'
            fill='none'
            stroke={ACCENT}
            strokeWidth='50'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
          <path
            d='M480 460 C425 460 405 490 410 520 C415 550 445 565 480 565'
            fill='none'
            stroke={FOLD}
            strokeWidth='42'
            strokeLinecap='round'
          />
          <path
            d='M480 650 C435 650 415 630 425 605'
            fill='none'
            stroke={FOLD}
            strokeWidth='42'
            strokeLinecap='round'
          />
          <path
            d='M544 370 C604 370 664 395 679 445 C699 490 684 535 649 555 C689 580 699 630 679 675 C654 725 594 745 544 745'
            fill='none'
            stroke={ACCENT}
            strokeWidth='50'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
          <path
            d='M544 460 C599 460 619 490 614 520 C609 550 579 565 544 565'
            fill='none'
            stroke={FOLD}
            strokeWidth='42'
            strokeLinecap='round'
          />
          <path
            d='M544 650 C589 650 609 630 599 605'
            fill='none'
            stroke={FOLD}
            strokeWidth='42'
            strokeLinecap='round'
          />
          <path
            d='M512 260 C512 315 528 335 575 335 C528 335 512 355 512 410 C512 355 496 335 449 335 C496 335 512 315 512 260 Z'
            fill={ACCENT}
          />
          <circle cx='512' cy='335' r='14' fill='#fffbeb' />
        </g>
      </g>
    </svg>
  )
}
