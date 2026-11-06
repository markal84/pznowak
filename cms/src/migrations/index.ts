import * as migration_20260920_130936_initial_cms from './20260920_130936_initial_cms';
import * as migration_20260921_074300_product_workflow_hardening from './20260921_074300_product_workflow_hardening';
import * as migration_20261020_173112_etap2_zgloszenia from './20261020_173112_etap2_zgloszenia';
import * as migration_20261020_211333_etap2_kwarantanna from './20261020_211333_etap2_kwarantanna';
import * as migration_20261021_182202_zamowienie_grawer_rozmiar from './20261021_182202_zamowienie_grawer_rozmiar';
import * as migration_20261021_182906_zlecenie_b_zalaczniki from './20261021_182906_zlecenie_b_zalaczniki';
import * as migration_20261022_095455_seo_pierscionki from './20261022_095455_seo_pierscionki';
import * as migration_20261026_111856_strona_glowna_wybrane from './20261026_111856_strona_glowna_wybrane';
import * as migration_20261026_125727_fb_import_zrodlo from './20261026_125727_fb_import_zrodlo';
import * as migration_20261101_101210_realizacje from './20261101_101210_realizacje';
import * as migration_20261102_100513_warianty_kamieni from './20261102_100513_warianty_kamieni';
import * as migration_20261104_231900_warianty_cala_galeria from './20261104_231900_warianty_cala_galeria';
import * as migration_20261105_092851_kolka_kolorow from './20261105_092851_kolka_kolorow';
import * as migration_20261105_110548_ab_film_wariantu from './20261105_110548_ab_film_wariantu';
import * as migration_20261106_100112_ceny_pierscionkow from './20261106_100112_ceny_pierscionkow';

export const migrations = [
  {
    up: migration_20260920_130936_initial_cms.up,
    down: migration_20260920_130936_initial_cms.down,
    name: '20260920_130936_initial_cms',
  },
  {
    up: migration_20260921_074300_product_workflow_hardening.up,
    down: migration_20260921_074300_product_workflow_hardening.down,
    name: '20260921_074300_product_workflow_hardening',
  },
  {
    up: migration_20261020_173112_etap2_zgloszenia.up,
    down: migration_20261020_173112_etap2_zgloszenia.down,
    name: '20261020_173112_etap2_zgloszenia',
  },
  {
    up: migration_20261020_211333_etap2_kwarantanna.up,
    down: migration_20261020_211333_etap2_kwarantanna.down,
    name: '20261020_211333_etap2_kwarantanna',
  },
  {
    up: migration_20261021_182202_zamowienie_grawer_rozmiar.up,
    down: migration_20261021_182202_zamowienie_grawer_rozmiar.down,
    name: '20261021_182202_zamowienie_grawer_rozmiar',
  },
  {
    up: migration_20261021_182906_zlecenie_b_zalaczniki.up,
    down: migration_20261021_182906_zlecenie_b_zalaczniki.down,
    name: '20261021_182906_zlecenie_b_zalaczniki',
  },
  {
    up: migration_20261022_095455_seo_pierscionki.up,
    down: migration_20261022_095455_seo_pierscionki.down,
    name: '20261022_095455_seo_pierscionki',
  },
  {
    up: migration_20261026_111856_strona_glowna_wybrane.up,
    down: migration_20261026_111856_strona_glowna_wybrane.down,
    name: '20261026_111856_strona_glowna_wybrane',
  },
  {
    up: migration_20261026_125727_fb_import_zrodlo.up,
    down: migration_20261026_125727_fb_import_zrodlo.down,
    name: '20261026_125727_fb_import_zrodlo',
  },
  {
    up: migration_20261101_101210_realizacje.up,
    down: migration_20261101_101210_realizacje.down,
    name: '20261101_101210_realizacje',
  },
  {
    up: migration_20261102_100513_warianty_kamieni.up,
    down: migration_20261102_100513_warianty_kamieni.down,
    name: '20261102_100513_warianty_kamieni',
  },
  {
    up: migration_20261104_231900_warianty_cala_galeria.up,
    down: migration_20261104_231900_warianty_cala_galeria.down,
    name: '20261104_231900_warianty_cala_galeria',
  },
  {
    up: migration_20261105_092851_kolka_kolorow.up,
    down: migration_20261105_092851_kolka_kolorow.down,
    name: '20261105_092851_kolka_kolorow',
  },
  {
    up: migration_20261105_110548_ab_film_wariantu.up,
    down: migration_20261105_110548_ab_film_wariantu.down,
    name: '20261105_110548_ab_film_wariantu',
  },
  {
    up: migration_20261106_100112_ceny_pierscionkow.up,
    down: migration_20261106_100112_ceny_pierscionkow.down,
    name: '20261106_100112_ceny_pierscionkow'
  },
];
