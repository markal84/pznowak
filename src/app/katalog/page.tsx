import {products} from '@/lib/collection';
import JewelCard from '@/components/JewelCard';
import ContactBand from '@/components/ContactBand';
export const metadata={title:'Pierścionki — projekty pracowni'};
export default function Catalog(){return <><section className="page-intro"><div className="wrap"><span className="eyebrow">Pierścionki pracowni</span><h1>Znajdź swoją <em>inspirację.</em></h1><p className="lead">Każdy projekt to inna opowieść. Obejrzyj detale, wybierz bliski Ci styl i porozmawiajmy o pierścionku dla Ciebie.</p></div></section><section className="wrap" style={{paddingBottom:80}}><div className="catalog-top"><p>{products.length} projekty</p><p>Wycena indywidualna</p></div><ul className="product-grid">{products.map(p=><JewelCard key={p.id} product={p}/>)}</ul></section><ContactBand/></>}
