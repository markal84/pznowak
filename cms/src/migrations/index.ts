import * as migration_20260920_130936_initial_cms from './20260920_130936_initial_cms'
import * as migration_20260921_074300_product_workflow_hardening from './20260921_074300_product_workflow_hardening'
import * as migration_20261020_173112_etap2_zgloszenia from './20261020_173112_etap2_zgloszenia'
import * as migration_20261020_211333_etap2_kwarantanna from './20261020_211333_etap2_kwarantanna'
import * as migration_20261021_182906_zlecenie_b_zalaczniki from './20261021_182906_zlecenie_b_zalaczniki'

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
    up: migration_20261021_182906_zlecenie_b_zalaczniki.up,
    down: migration_20261021_182906_zlecenie_b_zalaczniki.down,
    name: '20261021_182906_zlecenie_b_zalaczniki',
  },
]
