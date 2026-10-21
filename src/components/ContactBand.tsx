import ArrowIcon from '@/components/ArrowIcon';
import Link from 'next/link';
export default function ContactBand(){return <section className="contact-band"><div className="wrap"><div><span className="eyebrow">Twój pomysł. Nasze rzemiosło.</span><h2>Co możemy dla Ciebie stworzyć?</h2><p>Nie musisz mieć gotowego projektu. Zacznijmy od rozmowy.</p></div><Link className="button" href="/kontakt">Porozmawiajmy o biżuterii <span aria-hidden="true"><ArrowIcon /></span></Link></div></section>}
