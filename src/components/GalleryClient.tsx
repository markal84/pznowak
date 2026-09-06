'use client';
import {useState} from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import {gallery} from '@/lib/collection';
import ContactBand from './ContactBand';
export default function GalleryClient(){const [index,setIndex]=useState(-1);return <><section className="page-intro"><div className="wrap"><span className="eyebrow">Galeria pracowni</span><h1>Każdy detal ma <em>znaczenie.</em></h1><p className="lead">Biżuteria z naszej pracowni. Otwórz zdjęcie, aby przyjrzeć się jej z bliska.</p></div></section><section className="section wrap"><div className="gallery-grid">{gallery.filter(p=>p.image).map((p,i)=><button key={p.id} onClick={()=>setIndex(i)} aria-label={`Powiększ: ${p.name}`}><img src={p.image} alt={p.name} width="600" height="600" loading="lazy"/><span>{p.name} <span aria-hidden="true" style={{display:'inline'}}>↗</span></span></button>)}</div></section><Lightbox open={index>=0} close={()=>setIndex(-1)} index={Math.max(0,index)} slides={gallery.filter(p=>p.image).map(p=>({src:p.image,alt:p.name}))} plugins={[Zoom]} labels={{Close:'Zamknij',Next:'Następne zdjęcie',Previous:'Poprzednie zdjęcie','Zoom in':'Powiększ','Zoom out':'Pomniejsz'}}/><ContactBand/></>}
