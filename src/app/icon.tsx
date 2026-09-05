import { ImageResponse } from 'next/og'
import { MemoriIconGlyph } from '@/lib/memori-icon'

export const size = {
  width: 64,
  height: 64,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<MemoriIconGlyph size={32} />, {
    ...size,
  })
}
