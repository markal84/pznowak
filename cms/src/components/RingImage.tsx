'use client'

import Image from 'next/image'
import { useState } from 'react'

type RingImageProps = {
  alt: string
  fit?: 'contain' | 'cover'
  preload?: boolean
  sizes: string
  src: string
}

export default function RingImage({
  alt,
  fit = 'contain',
  preload = false,
  sizes,
  src,
}: RingImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const placeholderClassName =
    'cms-ring-placeholder' + (status === 'error' ? ' is-error' : '')

  return (
    <div className="cms-ring-image">
      {status !== 'loaded' && (
        <div
          aria-hidden={status !== 'error'}
          aria-live={status === 'error' ? 'polite' : undefined}
          className={placeholderClassName}
          role={status === 'error' ? 'status' : undefined}
        >
          <div className="cms-ring-placeholder__spin">
            <svg viewBox="0 0 160 160" focusable="false" aria-hidden="true">
              <g
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <ellipse
                  cx="80"
                  cy="101"
                  rx="42"
                  ry="18"
                  strokeDasharray="3 4"
                  strokeWidth="1.7"
                />
                <path d="M38 101c3 20 18 32 42 32s39-12 42-32" strokeWidth="2" />
                <path d="M49 91c8 7 18 11 31 11s23-4 31-11" strokeWidth="1.7" />
                <path d="m64 74 8-20h16l8 20-16 14-16-14Z" strokeWidth="2" />
                <path d="m72 54 8 34 8-34M64 74h32M68 48h24" strokeWidth="1.4" />
              </g>
            </svg>
          </div>
          {status === 'error' && (
            <span className="cms-ring-placeholder__message">
              Nie udało się wczytać zdjęcia
            </span>
          )}
        </div>
      )}
      <Image
        alt={alt}
        className={
          'cms-ring-image__source' + (status === 'loaded' ? ' is-ready' : '')
        }
        fill
        onError={() => setStatus('error')}
        onLoad={() => setStatus('loaded')}
        preload={preload}
        sizes={sizes}
        src={src}
        style={{ objectFit: fit }}
      />
    </div>
  )
}
