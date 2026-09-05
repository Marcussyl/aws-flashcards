export const MEMORI_ICON_BG = '#0f172a'
export const MEMORI_ICON_CARD = '#7dd3fc'
export const MEMORI_ICON_CARD_SOFT = 'rgba(125, 211, 252, 0.45)'

export function MemoriIconGlyph({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: MEMORI_ICON_BG,
      }}
    >
      <svg
        width={Math.round(size * 0.72)}
        height={Math.round(size * 0.72)}
        viewBox="0 0 28 28"
        fill="none"
      >
        <g transform="rotate(12 16.2 12.4)">
          <rect x="10.2" y="5.2" width="12" height="14.4" rx="2.2" fill={MEMORI_ICON_CARD_SOFT} />
        </g>
        <rect x="5.6" y="7.4" width="12" height="14.4" rx="2.2" fill={MEMORI_ICON_CARD} />
      </svg>
    </div>
  )
}
