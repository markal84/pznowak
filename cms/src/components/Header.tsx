'use client';
import ArrowIcon from '@/components/ArrowIcon';
import Link from 'next/link';
import {useState,useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
const links=[['/katalog','Pierścionki'],['/o-nas','Pracownia'],['/galeria','Galeria'],['/kontakt','Kontakt']];
export default function Header(){const [open,setOpen]=useState(false);const path=usePathname();const toggle=useRef<HTMLButtonElement>(null);
useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);toggle.current?.focus()}};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[]);
return <header className="site-header"><div className="wrap header-inner"><Link href="/" className="brand" aria-label="Michał Nowak — strona główna" onClick={()=>setOpen(false)}><img src="/logo.png" alt="Michał Nowak" width="82" height="62"/><span className="brand-copy">Pracownia<br/>złotnicza</span></Link><nav className="desktop-nav" aria-label="Menu główne">{links.slice(0,3).map(([href,name])=><Link key={href} href={href} aria-current={path.startsWith(href)?'page':undefined}>{name}</Link>)}<Link className="button" href="/kontakt">Porozmawiajmy <span aria-hidden="true"><ArrowIcon /></span></Link></nav><button className="menu-toggle" ref={toggle} aria-expanded={open} aria-controls="mobile-nav" onClick={()=>setOpen(!open)}>{open?'Zamknij':'Menu'} <span className="menu-glyph" aria-hidden="true">{open?'×':'☰'}</span></button></div><nav className="mobile-nav" id="mobile-nav" aria-label="Menu mobilne" hidden={!open}>{links.map(([href,name])=><Link key={href} href={href} onClick={()=>setOpen(false)} aria-current={path.startsWith(href)?'page':undefined}>{name} <span aria-hidden="true"><ArrowIcon /></span></Link>)}</nav></header>}
