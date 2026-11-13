import Image from 'next/image'

type PhotoProps = {
  src: string
  alt: string
  sizes: string
  /** 45 = 4:5, 43 = 4:3, 32 = 3:2, 11 = 1:1, 54 = 5:4 albo własna klasa przez className */
  ratio?: '45' | '43' | '32' | '11' | '54' | 'none'
  /** Własne proporcje, np. „1584 / 1008” dla kolażu, którego nie wolno przyciąć; razem z `ratio="none"`. */
  aspect?: string
  position?: string
  priority?: boolean
  /**
   * Zdjęcie w pierwszym widoku, ale nie jedyny kandydat na LCP (np. pierwszy rząd katalogu): ładowane od razu
   * i z wysokim priorytetem, bez `<link rel="preload">` w nagłówku, który przy kilku zdjęciach tylko by przeszkadzał.
   */
  eager?: boolean
  className?: string
}

export default function Photo({ src, alt, sizes, ratio = '45', aspect, position, priority = false, eager = false, className }: PhotoProps) {
  const classes = ['ph', ratio === 'none' ? '' : `ph-${ratio}`, className].filter(Boolean).join(' ')
  return (
    <span className={classes} style={aspect ? { aspectRatio: aspect } : undefined}>
      <Image
        alt={alt}
        fetchPriority={eager ? 'high' : undefined}
        fill
        loading={eager ? 'eager' : undefined}
        priority={priority}
        sizes={sizes}
        src={src}
        style={position ? { objectPosition: position } : undefined}
      />
    </span>
  )
}
