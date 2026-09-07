'use client';
import ArrowIcon from '@/components/ArrowIcon';
import {useState} from 'react';
import Link from 'next/link';
import JewelLoupe from './JewelLoupe';
import type {Jewel} from '@/lib/collection';
export default function RingStudy({product}:{product:Jewel}){const [view,setView]=useState(0);return <section id="z-bliska" className="section detail-section"><div className="wrap detail-grid"><JewelLoupe src={product.images[view]} alt={`${product.name} — ujęcie ${view+1}`}/><div><span className="eyebrow">Z bliska widać więcej</span><h2>Piękno tkwi<br/>w <em>szczegółach.</em></h2><p className="lead">Proporcje oprawy. Linia obrączki. Światło na kamieniu. Przyjrzyj się pierścionkowi {product.name} z kilku stron.</p><div className="view-controls" role="group" aria-label="Ujęcie pierścionka">{product.images.slice(0,3).map((_,i)=><button key={i} aria-pressed={view===i} onClick={()=>setView(i)}>Ujęcie {i+1}</button>)}</div><p className="view-label" aria-live="polite">{product.name} · ujęcie {view+1} z {Math.min(3,product.images.length)}</p><Link className="text-link" style={{marginTop:24}} href={`/katalog/${product.slug}/`}>Poznaj ten projekt <span aria-hidden="true"><ArrowIcon /></span></Link></div></div></section>}
