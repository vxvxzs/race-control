import type { CSSProperties } from 'react'
import type { TrackPhoto } from '@/lib/tracks'
type Props = {
  photo?: TrackPhoto
  scene?: 'night' | 'nurburgring'
  priority?: boolean
  className?: string
  sizes?: string
}
export function RacePhoto({
  photo,
  scene = 'nurburgring',
  priority = false,
  className = '',
  sizes = '100vw',
}: Props) {
  const asset = photo?.scene || scene
  const original = asset === 'night' || asset === 'nurburgring'
  return (
    <img
      className={className}
      src={`/images/${asset}-1600.webp`}
      style={
        photo
          ? ({
              '--photo-crop': photo.crop,
              '--photo-mobile-crop': photo.mobileCrop,
            } as CSSProperties)
          : undefined
      }
      srcSet={`/images/${asset}-800.webp 800w, /images/${asset}-1600.webp 1600w${original ? `, /images/${asset}-2400.webp 2400w` : ''}`}
      sizes={sizes}
      width={photo?.width || 2400}
      height={photo?.height || 1350}
      alt={
        photo?.alt ||
        (scene === 'night'
          ? 'Nürburgring GP podczas nocnego wyścigu, fotografia Marca Straucha'
          : 'Mercedes-AMG GT3 na Nürburgringu, fotografia Lukasa Raicha')
      }
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
    />
  )
}
