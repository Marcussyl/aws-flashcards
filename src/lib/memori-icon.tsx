const CANVAS = '#0b0f17'

export function MemoriIconGlyph({ size }: { size: number }) {
  const radius = Math.round(size * 0.22)
  const lobe = `primaryLobe-${size}`
  const synapse = `innerSynapse-${size}`
  const spark = `amberSpark-${size}`

  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 512 512'
      fill='none'
    >
      <rect width='512' height='512' rx={radius * (512 / size)} fill={CANVAS} />
      <defs>
        <linearGradient id={lobe} x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#fbbf24' />
          <stop offset='100%' stopColor='#f59e0b' />
        </linearGradient>
        <linearGradient id={synapse} x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#fb923c' />
          <stop offset='100%' stopColor='#ea580c' />
        </linearGradient>
        <linearGradient id={spark} x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#fffbeb' />
          <stop offset='40%' stopColor='#fef08a' />
          <stop offset='100%' stopColor='#f59e0b' />
        </linearGradient>
      </defs>
      <g transform='translate(256 256) scale(0.92) translate(-512 -500)'>
        <line
          x1='512'
          y1='465'
          x2='512'
          y2='705'
          stroke='#353942'
          strokeWidth='22'
          strokeLinecap='round'
        />
        <circle cx='512' cy='580' r='11' fill='#f59e0b' fillOpacity='0.9' />
        <path
          d='M480 370 C420 370 360 395 345 445 C325 490 340 535 375 555 C335 580 325 630 345 675 C370 725 430 745 480 745'
          fill='none'
          stroke={`url(#${lobe})`}
          strokeWidth='50'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M480 460 C425 460 405 490 410 520 C415 550 445 565 480 565'
          fill='none'
          stroke={`url(#${synapse})`}
          strokeWidth='42'
          strokeLinecap='round'
        />
        <path
          d='M480 650 C435 650 415 630 425 605'
          fill='none'
          stroke={`url(#${synapse})`}
          strokeWidth='42'
          strokeLinecap='round'
        />
        <path
          d='M544 370 C604 370 664 395 679 445 C699 490 684 535 649 555 C689 580 699 630 679 675 C654 725 594 745 544 745'
          fill='none'
          stroke={`url(#${lobe})`}
          strokeWidth='50'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M544 460 C599 460 619 490 614 520 C609 550 579 565 544 565'
          fill='none'
          stroke={`url(#${synapse})`}
          strokeWidth='42'
          strokeLinecap='round'
        />
        <path
          d='M544 650 C589 650 609 630 599 605'
          fill='none'
          stroke={`url(#${synapse})`}
          strokeWidth='42'
          strokeLinecap='round'
        />
        <path
          d='M512 260 C512 315 528 335 575 335 C528 335 512 355 512 410 C512 355 496 335 449 335 C496 335 512 315 512 260 Z'
          fill={`url(#${spark})`}
        />
        <circle cx='512' cy='335' r='14' fill='#fffbeb' />
      </g>
    </svg>
  )
}
