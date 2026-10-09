import Link from 'next/link'
import ArrowIcon from '@/components/ArrowIcon'
import RingImage from '@/components/RingImage'
import type { Jewel } from '@/lib/collection'

const productImageSizes =
  '(max-width: 370px) calc(100vw - 40px), (max-width: 760px) calc((100vw - 64px) / 2), (max-width: 1408px) calc((100vw - 160px) / 3), 411px'

export default function JewelCard({ product: p }: { product: Jewel }) {
  return (
    <li className="product-card">
      <Link href={'/katalog/' + p.slug + '/'}>
        <div className="photo">
          <RingImage
            alt={'Pierścionek ' + p.name}
            fit="contain"
            sizes={productImageSizes}
            src={p.images[0]}
          />
          <span className="product-card-arrow" aria-hidden="true">
            <ArrowIcon />
          </span>
        </div>
        <div className="caption">
          <div>
            <h3>{p.name}</h3>
            <p>{p.stone || 'Projekt pracowni'}{p.metal ? ' · ' + p.metal : ''}</p>
          </div>
        </div>
      </Link>
    </li>
  )
}
