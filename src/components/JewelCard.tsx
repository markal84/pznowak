import Link from 'next/link';
import type {Jewel} from '@/lib/collection';
export default function JewelCard({product:p}:{product:Jewel}){return <li className="product-card"><Link href={`/katalog/${p.slug}/`}><div className="photo"><img src={p.images[0]} alt={`Pierścionek ${p.name}`} width="600" height="600" loading="lazy"/><span aria-hidden="true">↗</span></div><div className="caption"><div><h3>{p.name}</h3><p>{p.stone||'Projekt pracowni'}{p.metal?` · ${p.metal}`:''}</p></div></div></Link></li>}
