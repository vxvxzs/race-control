type Props = {
  scene?: 'night' | 'nurburgring'
  priority?: boolean
  className?: string
  sizes?: string
}
export function RacePhoto({
  scene = 'nurburgring',
  priority = false,
  className = '',
  sizes = '100vw',
}: Props) {
  return (
    <img
      className={className}
      src={`/images/${scene}-1600.webp`}
      srcSet={`/images/${scene}-800.webp 800w, /images/${scene}-1600.webp 1600w, /images/${scene}-2400.webp 2400w`}
      sizes={sizes}
      width={2400}
      height={1350}
      alt={
        scene === 'night'
          ? 'Nürburgring GP podczas nocnego wyścigu, fotografia Marca Straucha'
          : 'Mercedes-AMG GT3 na Nürburgringu, fotografia Lukasa Raicha'
      }
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
    />
  )
}
