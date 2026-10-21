import Image from 'next/image'

type PhotoProps = {
  src: string
  alt: string
  sizes: string
  /** 45 = 4:5, 32 = 3:2, 11 = 1:1, 54 = 5:4 albo własna klasa przez className */
  ratio?: '45' | '32' | '11' | '54' | 'none'
  position?: string
  priority?: boolean
  className?: string
}

export default function Photo({ src, alt, sizes, ratio = '45', position, priority = false, className }: PhotoProps) {
  const classes = ['ph', ratio === 'none' ? '' : `ph-${ratio}`, className].filter(Boolean).join(' ')
  return (
    <span className={classes}>
      <Image
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        src={src}
        style={position ? { objectPosition: position } : undefined}
      />
    </span>
  )
}
